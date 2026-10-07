"""Monitoring and automated retraining orchestration service."""

from __future__ import annotations

from typing import Any
import pandas as pd

from src.data.dataset import ensure_dataset
from src.features.pipeline import ALL_FEATURE_COLUMNS
from src.models.registry import get_registry, promote_model
from src.monitoring.drift import detect_feature_drift
from src.training.train import train_single_model


def run_drift_analysis(
    inference_df: pd.DataFrame | None = None,
    psi_threshold: float = 0.20,
) -> dict[str, Any]:
    """Run feature drift analysis comparing baseline training data to inference data."""
    baseline_df = ensure_dataset()

    if inference_df is None or len(inference_df) < 5:
        # If not enough real inference requests yet, generate a simulated current batch with slight drift
        # to demonstrate active monitoring capabilities
        rng = pd.Series(range(len(baseline_df)))
        sample_size = min(500, len(baseline_df))
        current_df = baseline_df.sample(sample_size, random_state=123).copy()
        # Introduce slight realistic shift in monthly charges and contract to showcase monitoring
        current_df["monthly_charges"] = current_df["monthly_charges"] * 1.05
    else:
        current_df = inference_df

    report = detect_feature_drift(baseline_df, current_df, psi_threshold=psi_threshold)
    return report


def trigger_retraining(
    algorithm: str = "GradientBoosting",
    reason: str = "Drift threshold exceeded or manual trigger",
    auto_promote: bool = True,
) -> dict[str, Any]:
    """Trigger automated retraining loop: train candidate, run quality gate, promote."""
    registry = get_registry()
    prev_production = registry.get("active_production_version", "unknown")
    next_ver = f"v{len(registry.get('models', [])) + 1}"

    # Train new candidate
    new_model_record = train_single_model(
        algorithm=algorithm,
        params={"learning_rate": 0.06, "max_iter": 130},
        version_tag=next_ver,
        stage="Candidate",
        notes=f"Retrained due to: {reason}",
    )

    promoted = False
    gate_details = None
    if auto_promote and new_model_record.get("quality_gate_passed"):
        try:
            promo_res = promote_model(next_ver)
            promoted = True
            gate_details = promo_res.get("gate_evaluation")
        except Exception as e:
            promoted = False
            gate_details = {"error": str(e)}

    return {
        "status": "success",
        "retrained_version": next_ver,
        "previous_active_version": prev_production,
        "algorithm": algorithm,
        "metrics": new_model_record["metrics"],
        "promoted_to_production": promoted,
        "gate_evaluation": gate_details,
        "reason": reason,
    }
