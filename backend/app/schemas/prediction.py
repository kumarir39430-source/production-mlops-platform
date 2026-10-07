"""Schemas for prediction requests, responses, batch inference and logging."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class CustomerFeatures(BaseModel):
    gender: Literal["Male", "Female"] = Field("Female", description="Customer biological gender")
    senior_citizen: int = Field(0, ge=0, le=1, description="Whether customer is a senior citizen (1) or not (0)")
    partner: Literal["Yes", "No"] = Field("No", description="Whether customer has a partner")
    dependents: Literal["Yes", "No"] = Field("No", description="Whether customer has dependents")
    tenure: int = Field(6, ge=1, le=120, description="Number of months customer has been with company")
    phone_service: Literal["Yes", "No"] = Field("Yes", description="Whether customer has phone service")
    multiple_lines: Literal["No", "Yes", "No phone service"] = Field("No", description="Whether customer has multiple lines")
    internet_service: Literal["DSL", "Fiber optic", "No"] = Field("Fiber optic", description="Customer internet service type")
    online_security: Literal["Yes", "No", "No internet service"] = Field("No", description="Whether customer has online security")
    online_backup: Literal["Yes", "No", "No internet service"] = Field("No", description="Whether customer has online backup")
    device_protection: Literal["Yes", "No", "No internet service"] = Field("No", description="Whether customer has device protection")
    tech_support: Literal["Yes", "No", "No internet service"] = Field("No", description="Whether customer has tech support")
    streaming_tv: Literal["Yes", "No", "No internet service"] = Field("Yes", description="Whether customer has streaming TV")
    streaming_movies: Literal["Yes", "No", "No internet service"] = Field("Yes", description="Whether customer has streaming movies")
    contract: Literal["Month-to-month", "One year", "Two year"] = Field("Month-to-month", description="Contract term")
    paperless_billing: Literal["Yes", "No"] = Field("Yes", description="Whether customer has paperless billing")
    payment_method: Literal[
        "Electronic check",
        "Mailed check",
        "Bank transfer (automatic)",
        "Credit card (automatic)",
    ] = Field("Electronic check", description="Payment method used")
    monthly_charges: float = Field(89.5, ge=10.0, le=250.0, description="Customer monthly charge amount in USD")
    total_charges: float = Field(537.0, ge=0.0, le=25000.0, description="Customer total charges to date in USD")


class PredictionExplanation(BaseModel):
    feature: str
    feature_value: Any
    impact: Literal["increases_churn", "reduces_churn", "neutral"]
    description: str


class PredictionResponse(BaseModel):
    prediction: int = Field(..., description="Binary prediction: 1 for Churn, 0 for Retained")
    churn_label: str = Field(..., description="'Churn' or 'Retained'")
    churn_probability: float = Field(..., ge=0.0, le=1.0, description="Confidence probability of churn")
    risk_level: Literal["Low", "Medium", "High"] = Field(..., description="Categorical risk rating")
    model_version: str = Field(..., description="Active production model version")
    algorithm: str = Field(..., description="Active model algorithm")
    latency_ms: float = Field(..., description="Inference execution latency in milliseconds")
    top_risk_factors: list[PredictionExplanation] = Field(default_factory=list)
    request_id: str = Field(..., description="Unique request tracing ID")


class BatchPredictionRequest(BaseModel):
    customers: list[CustomerFeatures]


class BatchPredictionResponse(BaseModel):
    predictions: list[PredictionResponse]
    total_processed: int
    predicted_churn_count: int
    overall_churn_rate: float
    model_version: str


class PredictionLogItem(BaseModel):
    id: int
    request_id: str
    model_version: str
    prediction: int
    probability: float
    risk_level: str
    latency_ms: float
    input_features: dict[str, Any]
    actual_churn: int | None = None
    created_at: str


class FeedbackRequest(BaseModel):
    actual_churn: int = Field(..., ge=0, le=1, description="Actual observed outcome (1=Churn, 0=Retained)")
