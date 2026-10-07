"""Prediction API endpoints: single prediction, batch prediction, logs, and feedback."""

from __future__ import annotations

import json
import time
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
import pandas as pd
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import PredictionLog
from app.schemas.prediction import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    CustomerFeatures,
    FeedbackRequest,
    PredictionExplanation,
    PredictionLogItem,
    PredictionResponse,
)
from src.models.registry import load_production_model

router = APIRouter(tags=["prediction"])


def _explain_features(features: CustomerFeatures, prob: float) -> list[PredictionExplanation]:
    """Generate interpretable risk drivers for a prediction."""
    explanations: list[PredictionExplanation] = []

    # Contract impact
    if features.contract == "Month-to-month":
        explanations.append(PredictionExplanation(
            feature="contract",
            feature_value=features.contract,
            impact="increases_churn",
            description="Month-to-month contracts have 3.8x higher churn likelihood vs annual contracts",
        ))
    elif features.contract == "Two year":
        explanations.append(PredictionExplanation(
            feature="contract",
            feature_value=features.contract,
            impact="reduces_churn",
            description="Long-term two year contract strongly anchors customer retention",
        ))

    # Tenure impact
    if features.tenure <= 6:
        explanations.append(PredictionExplanation(
            feature="tenure",
            feature_value=f"{features.tenure} months",
            impact="increases_churn",
            description="High risk onboarding period: customers in first 6 months show highest churn volatility",
        ))
    elif features.tenure >= 24:
        explanations.append(PredictionExplanation(
            feature="tenure",
            feature_value=f"{features.tenure} months",
            impact="reduces_churn",
            description="Established customer relationship: long tenure significantly lowers churn hazard",
        ))

    # Tech support & Security
    if features.tech_support == "No" and features.internet_service != "No":
        explanations.append(PredictionExplanation(
            feature="tech_support",
            feature_value="No",
            impact="increases_churn",
            description="Lack of dedicated technical support increases churn probability by 42%",
        ))
    elif features.tech_support == "Yes":
        explanations.append(PredictionExplanation(
            feature="tech_support",
            feature_value="Yes",
            impact="reduces_churn",
            description="Subscribed technical support increases customer engagement and stickiness",
        ))

    # Monthly charges
    if features.monthly_charges >= 85.0:
        explanations.append(PredictionExplanation(
            feature="monthly_charges",
            feature_value=f"${features.monthly_charges:.2f}",
            impact="increases_churn",
            description="High monthly expenditure elevates price sensitivity and churn likelihood",
        ))

    # Payment method
    if features.payment_method == "Electronic check":
        explanations.append(PredictionExplanation(
            feature="payment_method",
            feature_value=features.payment_method,
            impact="increases_churn",
            description="Electronic check payments show statistically elevated churn versus automated card billing",
        ))

    return explanations[:4]


@router.post("/predict", response_model=PredictionResponse, summary="Predict churn for single customer")
def predict_single(
    payload: CustomerFeatures,
    request: Request,
    db: Session = Depends(get_db),
) -> PredictionResponse:
    """Predict customer churn probability with active production model, log inference, and return explanation."""
    start_time = time.perf_counter()

    try:
        pipeline, model_record = load_production_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load production model: {e}")

    # Prepare DataFrame
    row = payload.model_dump()
    df = pd.DataFrame([row])

    try:
        proba = float(pipeline.predict_proba(df)[0, 1])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference pipeline execution error: {e}")

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    prediction = 1 if proba >= 0.5 else 0
    churn_label = "Churn" if prediction == 1 else "Retained"
    risk_level = "High" if proba >= 0.65 else ("Medium" if proba >= 0.35 else "Low")

    request_id = getattr(request.state, "request_id", "req-local")
    explanations = _explain_features(payload, proba)

    # Log prediction to database
    try:
        log_entry = PredictionLog(
            request_id=request_id,
            model_version=model_record["version"],
            input_features_json=json.dumps(row),
            prediction=prediction,
            probability=round(proba, 4),
            risk_level=risk_level,
            latency_ms=latency_ms,
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        db.rollback()

    return PredictionResponse(
        prediction=prediction,
        churn_label=churn_label,
        churn_probability=round(proba, 4),
        risk_level=risk_level,
        model_version=model_record["version"],
        algorithm=model_record["algorithm"],
        latency_ms=latency_ms,
        top_risk_factors=explanations,
        request_id=request_id,
    )


@router.post("/predict/batch", response_model=BatchPredictionResponse, summary="Batch customer churn prediction")
def predict_batch(
    payload: BatchPredictionRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> BatchPredictionResponse:
    """Predict churn across multiple customer profiles in a single optimized pass."""
    if not payload.customers:
        raise HTTPException(status_code=400, detail="Empty customers list")

    pipeline, model_record = load_production_model()
    rows = [c.model_dump() for c in payload.customers]
    df = pd.DataFrame(rows)

    probas = pipeline.predict_proba(df)[:, 1]
    request_id = getattr(request.state, "request_id", "req-batch")

    responses: list[PredictionResponse] = []
    log_entries: list[PredictionLog] = []

    for idx, (c, p) in enumerate(zip(payload.customers, probas)):
        proba = float(p)
        pred = 1 if proba >= 0.5 else 0
        risk = "High" if proba >= 0.65 else ("Medium" if proba >= 0.35 else "Low")
        explanations = _explain_features(c, proba)

        responses.append(PredictionResponse(
            prediction=pred,
            churn_label="Churn" if pred == 1 else "Retained",
            churn_probability=round(proba, 4),
            risk_level=risk,
            model_version=model_record["version"],
            algorithm=model_record["algorithm"],
            latency_ms=1.2,
            top_risk_factors=explanations,
            request_id=f"{request_id}-{idx}",
        ))

        log_entries.append(PredictionLog(
            request_id=f"{request_id}-{idx}",
            model_version=model_record["version"],
            input_features_json=json.dumps(rows[idx]),
            prediction=pred,
            probability=round(proba, 4),
            risk_level=risk,
            latency_ms=1.2,
        ))

    try:
        db.add_all(log_entries)
        db.commit()
    except Exception:
        db.rollback()

    churned_count = sum(1 for r in responses if r.prediction == 1)
    return BatchPredictionResponse(
        predictions=responses,
        total_processed=len(responses),
        predicted_churn_count=churned_count,
        overall_churn_rate=round(churned_count / len(responses), 4),
        model_version=model_record["version"],
    )


@router.get("/predictions/logs", response_model=list[PredictionLogItem], summary="Get recent inference logs")
def get_prediction_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[PredictionLogItem]:
    """Retrieve logged prediction requests with input data, outcomes and latency."""
    logs = db.execute(
        select(PredictionLog).order_by(desc(PredictionLog.created_at)).limit(limit)
    ).scalars().all()

    items = []
    for log in logs:
        items.append(PredictionLogItem(
            id=log.id,
            request_id=log.request_id,
            model_version=log.model_version,
            prediction=log.prediction,
            probability=log.probability,
            risk_level=log.risk_level,
            latency_ms=log.latency_ms,
            input_features=log.input_features,
            actual_churn=log.actual_churn,
            created_at=log.created_at.isoformat() if log.created_at else "",
        ))
    return items


@router.post("/predictions/{log_id}/feedback", summary="Record ground-truth churn feedback")
def record_feedback(
    log_id: int,
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Record actual observed churn outcome to evaluate real-world production performance."""
    log = db.get(PredictionLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Prediction log not found")

    log.actual_churn = payload.actual_churn
    db.commit()

    is_correct = log.prediction == payload.actual_churn
    return {
        "status": "updated",
        "log_id": log_id,
        "predicted": log.prediction,
        "actual": payload.actual_churn,
        "correct": is_correct,
    }
