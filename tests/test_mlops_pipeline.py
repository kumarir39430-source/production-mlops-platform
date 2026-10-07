"""Comprehensive tests for MLOps lifecycle: data validation, training, registry, inference, drift, and retraining."""

import pytest
from fastapi.testclient import TestClient
import pandas as pd

from src.data.dataset import ensure_dataset, generate_churn_dataset
from src.data.validation import validate_dataframe
from src.features.pipeline import ALL_FEATURE_COLUMNS, build_pipeline
from src.models.registry import (
    evaluate_quality_gate,
    get_registry,
    load_production_model,
    promote_model,
    rollback_model,
)
from src.monitoring.drift import calculate_psi, detect_feature_drift
from src.training.train import train_all_candidates, train_single_model
from sklearn.linear_model import LogisticRegression


def test_data_generation_and_validation() -> None:
    df = generate_churn_dataset(n_samples=200, random_state=42)
    assert len(df) == 200
    assert "churn" in df.columns
    assert set(df["churn"].unique()).issubset({0, 1})

    report = validate_dataframe(df, is_training=True)
    assert report["status"] == "passed"
    assert report["failed_checks"] == 0
    assert len(report["anomalies"]) == 0


def test_feature_pipeline_fit_predict() -> None:
    df = generate_churn_dataset(n_samples=200, random_state=42)
    X = df[ALL_FEATURE_COLUMNS]
    y = df["churn"]

    pipe = build_pipeline(LogisticRegression(max_iter=200))
    pipe.fit(X, y)
    probs = pipe.predict_proba(X)
    assert probs.shape == (200, 2)
    assert (probs >= 0.0).all() and (probs <= 1.0).all()


def test_model_training_and_registry() -> None:
    # Train candidate
    rec = train_single_model("LogisticRegression", {"max_iter": 500}, version_tag="test_v1")
    assert rec["version"] == "test_v1"
    assert "roc_auc" in rec["metrics"]
    assert rec["metrics"]["roc_auc"] > 0.50

    reg = get_registry()
    assert any(m["version"] == "test_v1" for m in reg["models"])

    # Test quality gate
    gate = evaluate_quality_gate(rec["metrics"])
    assert "passed" in gate
    assert len(gate["checks"]) == 3


def test_model_promotion_and_rollback() -> None:
    train_single_model("LogisticRegression", {"max_iter": 500}, version_tag="model_a", stage="Candidate")
    train_single_model("RandomForest", {"n_estimators": 10, "max_depth": 3}, version_tag="model_b", stage="Candidate")

    # Promote model_b
    res_promo = promote_model("model_b", force=True)
    assert res_promo["status"] == "promoted"
    assert res_promo["version"] == "model_b"

    # Roll back
    res_rollback = rollback_model()
    assert res_rollback["status"] == "rolled_back"


def test_drift_calculation() -> None:
    import numpy as np
    ref = np.random.normal(loc=50.0, scale=10.0, size=500)
    cur_no_drift = np.random.normal(loc=50.0, scale=10.0, size=500)
    cur_drifted = np.random.normal(loc=75.0, scale=10.0, size=500)

    psi_clean = calculate_psi(ref, cur_no_drift)
    psi_drifted = calculate_psi(ref, cur_drifted)
    assert psi_clean < 0.15
    assert psi_drifted > 0.25


def test_predict_api_endpoint(client: TestClient) -> None:
    payload = {
        "gender": "Female",
        "senior_citizen": 0,
        "partner": "No",
        "dependents": "No",
        "tenure": 3,
        "phone_service": "Yes",
        "multiple_lines": "No",
        "internet_service": "Fiber optic",
        "online_security": "No",
        "online_backup": "No",
        "device_protection": "No",
        "tech_support": "No",
        "streaming_tv": "Yes",
        "streaming_movies": "Yes",
        "contract": "Month-to-month",
        "paperless_billing": "Yes",
        "payment_method": "Electronic check",
        "monthly_charges": 95.5,
        "total_charges": 286.5,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in (0, 1)
    assert 0.0 <= data["churn_probability"] <= 1.0
    assert data["risk_level"] in ("Low", "Medium", "High")
    assert "top_risk_factors" in data
    assert len(data["top_risk_factors"]) > 0


def test_models_and_monitoring_endpoints(client: TestClient) -> None:
    res_models = client.get("/models")
    assert res_models.status_code == 200
    assert "models" in res_models.json()

    res_monitor = client.get("/monitoring/overview")
    assert res_models.status_code == 200
    assert "active_model_version" in res_monitor.json()

    res_dataset = client.get("/dataset/summary")
    assert res_dataset.status_code == 200
    assert res_dataset.json()["total_rows"] > 0
