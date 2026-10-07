"""Model registry and governance API routes."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException

from app.schemas.models import (
    ModelRecordSchema,
    PromoteRequest,
    RegistryResponse,
    RollbackRequest,
    TrainModelRequest,
)
from src.models.registry import (
    get_registry,
    load_production_model,
    promote_model,
    rollback_model,
)
from src.training.train import train_single_model

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=RegistryResponse, summary="Get model registry index")
def list_models() -> RegistryResponse:
    """Retrieve full catalog of registered models, candidate runs, and active production alias."""
    # Ensure at least baseline models are loaded
    load_production_model()
    reg = get_registry()
    return RegistryResponse(
        active_production_version=reg.get("active_production_version"),
        models=[ModelRecordSchema(**m) for m in reg.get("models", [])],
    )


@router.get("/active", response_model=ModelRecordSchema, summary="Get active production model")
def get_active_model() -> ModelRecordSchema:
    """Retrieve metadata and evaluation metrics of the active production model."""
    _, record = load_production_model()
    return ModelRecordSchema(**record)


@router.post("/train", response_model=ModelRecordSchema, summary="Train new candidate model")
def trigger_training(payload: TrainModelRequest) -> ModelRecordSchema:
    """Train a candidate model and register its evaluation metrics."""
    try:
        rec = train_single_model(
            algorithm=payload.algorithm,
            params=payload.parameters,
            stage="Candidate",
            notes=payload.notes,
        )
        return ModelRecordSchema(**rec)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Training error: {e}")


@router.post("/{version}/promote", summary="Promote model to Production")
def promote_version(version: str, payload: PromoteRequest) -> dict[str, Any]:
    """Promote a candidate or validated model version to active Production."""
    try:
        res = promote_model(version=version, force=payload.force)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rollback", summary="Rollback production model")
def rollback_version(payload: RollbackRequest) -> dict[str, Any]:
    """Roll back to a previous production model version."""
    try:
        res = rollback_model(target_version=payload.target_version)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
