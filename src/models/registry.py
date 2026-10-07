"""Model Registry and Governance.

Manages model artifacts, versioning, quality gates, promotions, rollbacks,
and model metadata tracking.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import joblib

REPO_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = REPO_ROOT / "models_store"
REGISTRY_INDEX = MODELS_DIR / "registry_index.json"


def _ensure_registry_dir() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    if not REGISTRY_INDEX.exists():
        initial_data = {
            "active_production_version": None,
            "models": [],
        }
        with open(REGISTRY_INDEX, "w", encoding="utf-8") as f:
            json.dump(initial_data, f, indent=2)


def get_registry() -> dict[str, Any]:
    """Retrieve full registry index."""
    _ensure_registry_dir()
    with open(REGISTRY_INDEX, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_registry(data: dict[str, Any]) -> None:
    _ensure_registry_dir()
    with open(REGISTRY_INDEX, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def register_model_run(
    version: str,
    algorithm: str,
    pipeline: Any,
    metrics: dict[str, float],
    parameters: dict[str, Any],
    feature_names: list[str],
    confusion_matrix: list[list[int]],
    stage: str = "Candidate",
    notes: str = "",
) -> dict[str, Any]:
    """Save model artifact, register in index, and return record."""
    _ensure_registry_dir()
    model_path = MODELS_DIR / f"{version}.joblib"
    joblib.dump(pipeline, model_path)

    record = {
        "version": version,
        "algorithm": algorithm,
        "stage": stage,
        "artifact_path": str(model_path.relative_to(REPO_ROOT)),
        "metrics": metrics,
        "parameters": parameters,
        "feature_names": feature_names,
        "confusion_matrix": confusion_matrix,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "promoted_at": None,
        "notes": notes,
        "quality_gate_passed": evaluate_quality_gate(metrics)["passed"],
    }

    registry = get_registry()
    # Update or append
    existing_idx = next((i for i, m in enumerate(registry["models"]) if m["version"] == version), None)
    if existing_idx is not None:
        registry["models"][existing_idx] = record
    else:
        registry["models"].append(record)

    # If first model or marked production, set active
    if stage == "Production" or registry["active_production_version"] is None:
        registry["active_production_version"] = version
        record["stage"] = "Production"
        record["promoted_at"] = datetime.now(timezone.utc).isoformat()

    _save_registry(registry)
    return record


def evaluate_quality_gate(metrics: dict[str, float]) -> dict[str, Any]:
    """Evaluate whether candidate model meets production thresholds."""
    roc_auc = metrics.get("roc_auc", 0.0)
    f1 = metrics.get("f1", 0.0)
    accuracy = metrics.get("accuracy", 0.0)

    checks = [
        {
            "criterion": "ROC-AUC >= 0.72",
            "passed": roc_auc >= 0.72,
            "actual": round(roc_auc, 4),
            "threshold": 0.72,
        },
        {
            "criterion": "F1 Score >= 0.50",
            "passed": f1 >= 0.50,
            "actual": round(f1, 4),
            "threshold": 0.50,
        },
        {
            "criterion": "Accuracy >= 0.70",
            "passed": accuracy >= 0.70,
            "actual": round(accuracy, 4),
            "threshold": 0.70,
        },
    ]

    all_passed = all(c["passed"] for c in checks)
    return {
        "passed": all_passed,
        "checks": checks,
    }


def promote_model(version: str, force: bool = False) -> dict[str, Any]:
    """Promote a registered model to Production, archiving the previous active model."""
    registry = get_registry()
    target_model = next((m for m in registry["models"] if m["version"] == version), None)
    if not target_model:
        raise ValueError(f"Model version {version} not found in registry")

    # Gate check
    gate_result = evaluate_quality_gate(target_model["metrics"])
    if not gate_result["passed"] and not force:
        raise ValueError(f"Model {version} failed quality gate criteria: {gate_result['checks']}")

    prev_active = registry["active_production_version"]
    for m in registry["models"]:
        if m["version"] == prev_active and prev_active != version:
            m["stage"] = "Archived"
        if m["version"] == version:
            m["stage"] = "Production"
            m["promoted_at"] = datetime.now(timezone.utc).isoformat()

    registry["active_production_version"] = version
    _save_registry(registry)

    return {
        "status": "promoted",
        "version": version,
        "previous_version": prev_active,
        "gate_evaluation": gate_result,
    }


def rollback_model(target_version: str | None = None) -> dict[str, Any]:
    """Roll back to a previous model or specific version."""
    registry = get_registry()
    current = registry["active_production_version"]

    if target_version:
        target = next((m for m in registry["models"] if m["version"] == target_version), None)
        if not target:
            raise ValueError(f"Version {target_version} not found")
    else:
        # Find the most recently promoted archived model
        candidates = [m for m in registry["models"] if m["version"] != current]
        if not candidates:
            raise ValueError("No alternative model versions available for rollback")
        target = candidates[-1]

    target_version = target["version"]
    for m in registry["models"]:
        if m["version"] == current:
            m["stage"] = "Archived"
        if m["version"] == target_version:
            m["stage"] = "Production"
            m["promoted_at"] = datetime.now(timezone.utc).isoformat()

    registry["active_production_version"] = target_version
    _save_registry(registry)

    return {
        "status": "rolled_back",
        "active_version": target_version,
        "reverted_from": current,
    }


def load_production_model() -> tuple[Any, dict[str, Any]]:
    """Load the currently active Production model pipeline and metadata."""
    registry = get_registry()
    active_version = registry.get("active_production_version")

    if not active_version or not registry.get("models"):
        # Train default models if none exist yet!
        from src.training.train import train_all_candidates
        train_all_candidates()
        registry = get_registry()
        active_version = registry.get("active_production_version")

    model_record = next(m for m in registry["models"] if m["version"] == active_version)
    artifact_path = REPO_ROOT / model_record["artifact_path"]

    pipeline = joblib.load(artifact_path)
    return pipeline, model_record
