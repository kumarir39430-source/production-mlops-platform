"""Drift detection module using PSI (Population Stability Index) and Kolmogorov-Smirnov test.

Detects statistical distribution shifts between baseline training data and live production inferences.
"""

from __future__ import annotations

from typing import Any
import numpy as np
import pandas as pd
from scipy import stats

from src.features.pipeline import CATEGORICAL_FEATURES, NUMERIC_FEATURES


def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_buckets: int = 10) -> float:
    """Calculate Population Stability Index (PSI) between expected and actual distributions."""
    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    # Quantile bins based on expected
    percentiles = np.linspace(0, 100, num_buckets + 1)
    bins = np.percentile(expected, percentiles)
    bins[0] = -np.inf
    bins[-1] = np.inf
    # Ensure strictly increasing bins
    bins = np.unique(bins)
    if len(bins) < 2:
        return 0.0

    expected_counts, _ = np.histogram(expected, bins=bins)
    actual_counts, _ = np.histogram(actual, bins=bins)

    expected_pct = (expected_counts + 1e-4) / (len(expected) + 1e-4 * len(expected_counts))
    actual_pct = (actual_counts + 1e-4) / (len(actual) + 1e-4 * len(actual_counts))

    psi_val = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(np.round(psi_val, 4))


def detect_feature_drift(
    reference_df: pd.DataFrame,
    current_df: pd.DataFrame,
    psi_threshold: float = 0.20,
) -> dict[str, Any]:
    """Compare reference and current datasets for numerical and categorical drift."""
    feature_metrics: list[dict[str, Any]] = []
    drifted_count = 0

    # Numerical features: PSI + Kolmogorov-Smirnov test
    for col in NUMERIC_FEATURES:
        if col in reference_df.columns and col in current_df.columns:
            ref_vals = reference_df[col].dropna().to_numpy(dtype=float)
            cur_vals = current_df[col].dropna().to_numpy(dtype=float)

            if len(ref_vals) > 5 and len(cur_vals) > 5:
                psi = calculate_psi(ref_vals, cur_vals)
                ks_stat, p_val = stats.ks_2samp(ref_vals, cur_vals)
                has_drift = bool(psi >= psi_threshold or (p_val < 0.01 and psi >= 0.10))

                if has_drift:
                    drifted_count += 1

                feature_metrics.append({
                    "feature": col,
                    "type": "numeric",
                    "psi": round(psi, 4),
                    "ks_statistic": round(float(ks_stat), 4),
                    "p_value": round(float(p_val), 4),
                    "drift_detected": has_drift,
                    "severity": "high" if psi >= 0.25 else ("moderate" if psi >= 0.10 else "low"),
                    "ref_mean": round(float(np.mean(ref_vals)), 2),
                    "current_mean": round(float(np.mean(cur_vals)), 2),
                })

    # Categorical features: Total variation distance (L1 shift)
    for col in CATEGORICAL_FEATURES:
        if col in reference_df.columns and col in current_df.columns:
            ref_counts = reference_df[col].value_counts(normalize=True).to_dict()
            cur_counts = current_df[col].value_counts(normalize=True).to_dict()

            all_cats = set(ref_counts.keys()).union(set(cur_counts.keys()))
            shift = 0.5 * sum(abs(cur_counts.get(c, 0.0) - ref_counts.get(c, 0.0)) for c in all_cats)
            cat_drift = bool(shift >= 0.20)

            if cat_drift:
                drifted_count += 1

            feature_metrics.append({
                "feature": col,
                "type": "categorical",
                "psi": round(shift, 4),  # TVD as categorical proxy
                "ks_statistic": None,
                "p_value": None,
                "drift_detected": cat_drift,
                "severity": "high" if shift >= 0.25 else ("moderate" if shift >= 0.10 else "low"),
                "ref_distribution": {k: round(v, 3) for k, v in ref_counts.items()},
                "current_distribution": {k: round(v, 3) for k, v in cur_counts.items()},
            })

    total_checked = len(feature_metrics)
    drift_rate = drifted_count / total_checked if total_checked > 0 else 0.0
    overall_drift = drifted_count >= 2 or drift_rate >= 0.15

    status = "critical" if drift_rate >= 0.25 else ("warning" if overall_drift else "healthy")

    return {
        "status": status,
        "drift_detected": overall_drift,
        "retraining_recommended": overall_drift,
        "total_features": total_checked,
        "drifted_features_count": drifted_count,
        "reference_sample_size": len(reference_df),
        "current_sample_size": len(current_df),
        "features": feature_metrics,
    }
