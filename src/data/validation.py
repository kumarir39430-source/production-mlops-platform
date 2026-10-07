"""Data validation engine for customer churn data.

Performs schema checking, boundary checks, category domain verification,
null value audits and produces structured validation reports.
"""

from __future__ import annotations

from typing import Any
import pandas as pd


EXPECTED_NUMERIC_RANGES = {
    "tenure": (0, 120),
    "monthly_charges": (10.0, 200.0),
    "total_charges": (0.0, 15000.0),
    "senior_citizen": (0, 1),
}

EXPECTED_CATEGORIES = {
    "gender": {"Male", "Female"},
    "partner": {"Yes", "No"},
    "dependents": {"Yes", "No"},
    "phone_service": {"Yes", "No"},
    "multiple_lines": {"No", "Yes", "No phone service"},
    "internet_service": {"DSL", "Fiber optic", "No"},
    "online_security": {"Yes", "No", "No internet service"},
    "online_backup": {"Yes", "No", "No internet service"},
    "device_protection": {"Yes", "No", "No internet service"},
    "tech_support": {"Yes", "No", "No internet service"},
    "streaming_tv": {"Yes", "No", "No internet service"},
    "streaming_movies": {"Yes", "No", "No internet service"},
    "contract": {"Month-to-month", "One year", "Two year"},
    "paperless_billing": {"Yes", "No"},
    "payment_method": {
        "Electronic check",
        "Mailed check",
        "Bank transfer (automatic)",
        "Credit card (automatic)",
    },
}


def validate_dataframe(df: pd.DataFrame, is_training: bool = False) -> dict[str, Any]:
    """Validate a DataFrame against the production schema and business rules."""
    checks: list[dict[str, Any]] = []
    anomalies: list[str] = []

    # 1. Null values check
    null_counts = df.isnull().sum().to_dict()
    total_nulls = sum(null_counts.values())
    null_rate = total_nulls / (len(df) * len(df.columns)) if len(df) > 0 else 0.0
    null_check_passed = total_nulls == 0
    checks.append({
        "rule": "null_value_audit",
        "description": "Ensure no unexpected missing values in feature set",
        "passed": null_check_passed,
        "detail": f"{total_nulls} total missing values (rate: {null_rate:.2%})",
    })
    if not null_check_passed:
        for col, cnt in null_counts.items():
            if cnt > 0:
                anomalies.append(f"Column '{col}' has {cnt} missing values")

    # 2. Required columns check
    required_cols = list(EXPECTED_NUMERIC_RANGES.keys()) + list(EXPECTED_CATEGORIES.keys())
    if is_training:
        required_cols.append("churn")

    missing_cols = [c for c in required_cols if c not in df.columns]
    schema_passed = len(missing_cols) == 0
    checks.append({
        "rule": "schema_completeness",
        "description": "All expected features must be present in the dataset",
        "passed": schema_passed,
        "detail": "All required columns present" if schema_passed else f"Missing: {missing_cols}",
    })
    if not schema_passed:
        anomalies.append(f"Missing required columns: {missing_cols}")

    # 3. Numeric range checks
    for col, (min_val, max_val) in EXPECTED_NUMERIC_RANGES.items():
        if col in df.columns:
            s = pd.to_numeric(df[col], errors="coerce")
            invalid_count = int(((s < min_val) | (s > max_val) | s.isnull()).sum())
            rule_passed = invalid_count == 0
            checks.append({
                "rule": f"range_{col}",
                "description": f"Verify {col} is within bounds [{min_val}, {max_val}]",
                "passed": rule_passed,
                "detail": f"{invalid_count} out-of-range values",
            })
            if not rule_passed:
                anomalies.append(f"Column '{col}' contains {invalid_count} values outside [{min_val}, {max_val}]")

    # 4. Categorical domain checks
    for col, allowed_vals in EXPECTED_CATEGORIES.items():
        if col in df.columns:
            observed_vals = set(df[col].dropna().unique())
            unallowed = observed_vals - allowed_vals
            rule_passed = len(unallowed) == 0
            checks.append({
                "rule": f"categories_{col}",
                "description": f"Verify {col} conforms to defined category domain",
                "passed": rule_passed,
                "detail": "Valid domain" if rule_passed else f"Disallowed values: {list(unallowed)}",
            })
            if not rule_passed:
                anomalies.append(f"Column '{col}' has invalid categories: {list(unallowed)}")

    overall_passed = all(c["passed"] for c in checks)

    return {
        "status": "passed" if overall_passed else "failed",
        "total_checks": len(checks),
        "passed_checks": sum(1 for c in checks if c["passed"]),
        "failed_checks": sum(1 for c in checks if not c["passed"]),
        "row_count": len(df),
        "checks": checks,
        "anomalies": anomalies,
    }
