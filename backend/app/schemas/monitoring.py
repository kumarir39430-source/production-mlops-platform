"""Schemas for monitoring, drift detection, and automated retraining."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class FeatureDriftDetail(BaseModel):
    feature: str
    type: str
    psi: float
    ks_statistic: float | None = None
    p_value: float | None = None
    drift_detected: bool
    severity: str
    ref_mean: float | None = None
    current_mean: float | None = None
    ref_distribution: dict[str, float] | None = None
    current_distribution: dict[str, float] | None = None


class DriftReportResponse(BaseModel):
    status: str
    drift_detected: bool
    retraining_recommended: bool
    total_features: int
    drifted_features_count: int
    reference_sample_size: int
    current_sample_size: int
    features: list[FeatureDriftDetail]


class RetrainRequest(BaseModel):
    algorithm: str = Field("GradientBoosting", description="Model algorithm for retrained model")
    reason: str = Field("Manual trigger via UI", description="Reason for triggering retraining")
    auto_promote: bool = Field(True, description="Automatically promote if quality gate passes")


class RetrainResponse(BaseModel):
    status: str
    retrained_version: str
    previous_active_version: str
    algorithm: str
    metrics: dict[str, float]
    promoted_to_production: bool
    gate_evaluation: dict[str, Any] | None = None
    reason: str


class MonitoringOverview(BaseModel):
    total_predictions: int
    avg_latency_ms: float
    recent_churn_rate: float
    high_risk_percentage: float
    active_model_version: str | None
    drift_status: str
    last_drift_check: str | None = None
