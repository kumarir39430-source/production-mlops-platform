"""End-to-end training and retraining pipeline."""

from __future__ import annotations

from typing import Any
from src.data.dataset import ensure_dataset
from src.data.validation import validate_dataframe
from src.training.train import train_all_candidates


def run_full_training_pipeline() -> dict[str, Any]:
    """Execute complete end-to-end training pipeline: validation -> train -> evaluate -> register."""
    # Step 1: Ensure dataset
    df = ensure_dataset()

    # Step 2: Validate dataset
    val_report = validate_dataframe(df, is_training=True)
    if val_report["status"] != "passed":
        raise ValueError(f"Dataset validation failed: {val_report['anomalies']}")

    # Step 3: Train candidate models
    candidate_records = train_all_candidates()

    return {
        "status": "completed",
        "data_validation": {
            "status": val_report["status"],
            "total_rows": len(df),
            "passed_checks": val_report["passed_checks"],
        },
        "trained_models": candidate_records,
    }
