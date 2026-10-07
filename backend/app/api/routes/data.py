"""Dataset and validation API routes."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException

from app.schemas.data import DataCheckItem, DataValidationResponse, DatasetSummaryResponse
from src.data.dataset import ensure_dataset, get_dataset_summary
from src.data.validation import validate_dataframe

router = APIRouter(prefix="/dataset", tags=["dataset"])


@router.get("/summary", response_model=DatasetSummaryResponse, summary="Get dataset profile and statistics")
def get_summary() -> DatasetSummaryResponse:
    """Retrieve statistical profile, schema breakdown, and sample records of the customer dataset."""
    try:
        summary = get_dataset_summary()
        return DatasetSummaryResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")


@router.get("/validate", response_model=DataValidationResponse, summary="Run schema and data quality validation")
def run_validation() -> DataValidationResponse:
    """Run data quality validation rules: null audits, ranges, and categorical domains."""
    try:
        df = ensure_dataset()
        report = validate_dataframe(df, is_training=True)
        checks = [DataCheckItem(**c) for c in report["checks"]]
        return DataValidationResponse(
            status=report["status"],
            total_checks=report["total_checks"],
            passed_checks=report["passed_checks"],
            failed_checks=report["failed_checks"],
            row_count=report["row_count"],
            checks=checks,
            anomalies=report["anomalies"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {e}")


@router.post("/generate", summary="Regenerate dataset")
def regenerate() -> dict[str, Any]:
    """Regenerate dataset with synthetic samples."""
    try:
        df = ensure_dataset(force_regenerate=True)
        return {"status": "regenerated", "rows": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate dataset: {e}")
