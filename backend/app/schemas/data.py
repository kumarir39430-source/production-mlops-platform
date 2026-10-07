"""Schemas for dataset inspection and validation reports."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class DataCheckItem(BaseModel):
    rule: str
    description: str
    passed: bool
    detail: str


class DataValidationResponse(BaseModel):
    status: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    row_count: int
    checks: list[DataCheckItem]
    anomalies: list[str]


class DatasetSummaryResponse(BaseModel):
    total_rows: int
    total_columns: int
    churn_rate: float
    class_balance: dict[str, int]
    numerical_stats: dict[str, dict[str, float]]
    contract_breakdown: dict[str, int]
    internet_breakdown: dict[str, int]
    sample_records: list[dict[str, Any]]
