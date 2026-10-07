"""Model training and evaluation pipeline.

Trains candidate models (Logistic Regression, Random Forest, Gradient Boosting),
computes comprehensive evaluation metrics, and registers candidate versions.
"""

from __future__ import annotations

from typing import Any
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from src.data.dataset import ensure_dataset
from src.features.pipeline import ALL_FEATURE_COLUMNS, build_pipeline
from src.models.registry import get_registry, register_model_run


def train_single_model(
    algorithm: str,
    params: dict[str, Any] | None = None,
    version_tag: str | None = None,
    stage: str = "Candidate",
    notes: str = "",
) -> dict[str, Any]:
    """Train a single model family candidate and register it."""
    params = params or {}
    df = ensure_dataset()

    # Train / test split
    train_df = df.sample(frac=0.8, random_state=42)
    test_df = df.drop(train_df.index)

    X_train = train_df[ALL_FEATURE_COLUMNS]
    y_train = train_df["churn"].astype(int)

    X_test = test_df[ALL_FEATURE_COLUMNS]
    y_test = test_df["churn"].astype(int)

    # Initialize estimator
    if algorithm == "LogisticRegression":
        estimator = LogisticRegression(
            C=params.get("C", 1.0),
            max_iter=params.get("max_iter", 1000),
            random_state=42,
        )
    elif algorithm == "RandomForest":
        estimator = RandomForestClassifier(
            n_estimators=params.get("n_estimators", 100),
            max_depth=params.get("max_depth", 8),
            random_state=42,
        )
    elif algorithm == "GradientBoosting":
        estimator = HistGradientBoostingClassifier(
            learning_rate=params.get("learning_rate", 0.08),
            max_iter=params.get("max_iter", 100),
            random_state=42,
        )
    else:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    pipeline = build_pipeline(estimator)
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_probs = pipeline.predict_proba(X_test)[:, 1]
    y_preds = (y_probs >= 0.5).astype(int)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_preds)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_probs)), 4),
        "f1": round(float(f1_score(y_test, y_preds)), 4),
        "precision": round(float(precision_score(y_test, y_preds)), 4),
        "recall": round(float(recall_score(y_test, y_preds)), 4),
    }

    cm = confusion_matrix(y_test, y_preds).tolist()

    # Determine version ID
    registry = get_registry()
    existing_count = len(registry.get("models", []))
    version = version_tag or f"v{existing_count + 1}"

    record = register_model_run(
        version=version,
        algorithm=algorithm,
        pipeline=pipeline,
        metrics=metrics,
        parameters=params,
        feature_names=ALL_FEATURE_COLUMNS,
        confusion_matrix=cm,
        stage=stage,
        notes=notes or f"Trained {algorithm} on {len(X_train)} samples",
    )
    return record


def train_all_candidates() -> list[dict[str, Any]]:
    """Train standard candidate suite (Baseline, RF, and Gradient Boosting)."""
    candidates = [
        ("LogisticRegression", {"C": 1.0, "max_iter": 1000}, "Baseline linear model"),
        ("RandomForest", {"n_estimators": 120, "max_depth": 7}, "Ensemble Random Forest"),
        ("GradientBoosting", {"learning_rate": 0.05, "max_iter": 120}, "High-performance Gradient Boosting"),
    ]

    results = []
    for idx, (algo, p, notes) in enumerate(candidates, 1):
        version = f"v{idx}"
        # Make the best performing (GradientBoosting) Production by default
        stage = "Production" if algo == "GradientBoosting" else "Candidate"
        rec = train_single_model(
            algorithm=algo,
            params=p,
            version_tag=version,
            stage=stage,
            notes=notes,
        )
        results.append(rec)
    return results
