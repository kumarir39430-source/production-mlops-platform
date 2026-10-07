"""Schemas for model registry and governance."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class QualityGateCheck(BaseModel):
    criterion: str
    passed: bool
    actual: float
    threshold: float


class QualityGateResult(BaseModel):
    passed: bool
    checks: list[QualityGateCheck]


class ModelRecordSchema(BaseModel):
    version: str
    algorithm: str
    stage: str
    artifact_path: str
    metrics: dict[str, float]
    parameters: dict[str, Any]
    feature_names: list[str]
    confusion_matrix: list[list[int]]
    created_at: str
    promoted_at: str | None = None
    notes: str = ""
    quality_gate_passed: bool


class RegistryResponse(BaseModel):
    active_production_version: str | None
    models: list[ModelRecordSchema]


class PromoteRequest(BaseModel):
    force: bool = Field(False, description="Force promotion even if quality gate fails")


class RollbackRequest(BaseModel):
    target_version: str | None = Field(None, description="Specific version to revert to (defaults to previous production)")


class TrainModelRequest(BaseModel):
    algorithm: str = Field("GradientBoosting", description="Model family: LogisticRegression, RandomForest, GradientBoosting")
    parameters: dict[str, Any] = Field(default_factory=dict)
    notes: str = Field("", description="Experiment notes / run description")
