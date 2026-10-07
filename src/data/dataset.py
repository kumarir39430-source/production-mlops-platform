"""Customer churn dataset generator and loader.

Generates realistic tabular customer churn data with realistic domain correlations,
feature relationships and realistic distributions.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_RAW_DIR = REPO_ROOT / "data" / "raw"
DATA_PROCESSED_DIR = REPO_ROOT / "data" / "processed"


def generate_churn_dataset(n_samples: int = 2500, random_state: int = 42) -> pd.DataFrame:
    """Generate a realistic synthetic Telco customer churn dataset."""
    rng = np.random.default_rng(random_state)

    customer_ids = [f"CUST-{1000 + i}" for i in range(n_samples)]
    gender = rng.choice(["Male", "Female"], size=n_samples)
    senior_citizen = rng.choice([0, 1], size=n_samples, p=[0.84, 0.16])
    partner = rng.choice(["Yes", "No"], size=n_samples, p=[0.48, 0.52])
    dependents = rng.choice(["Yes", "No"], size=n_samples, p=[0.30, 0.70])

    # Tenure between 1 and 72 months, skewed towards 1-12 and 60-72
    tenure_raw = rng.exponential(scale=24.0, size=n_samples)
    tenure = np.clip(np.round(tenure_raw), 1, 72).astype(int)

    phone_service = rng.choice(["Yes", "No"], size=n_samples, p=[0.90, 0.10])
    multiple_lines = []
    for ps in phone_service:
        if ps == "No":
            multiple_lines.append("No phone service")
        else:
            multiple_lines.append(rng.choice(["Yes", "No"], p=[0.45, 0.55]))

    internet_service = rng.choice(["Fiber optic", "DSL", "No"], size=n_samples, p=[0.44, 0.34, 0.22])

    services = ["online_security", "online_backup", "device_protection", "tech_support", "streaming_tv", "streaming_movies"]
    service_cols: dict[str, list[str]] = {s: [] for s in services}
    for net in internet_service:
        for s in services:
            if net == "No":
                service_cols[s].append("No internet service")
            else:
                prob_yes = 0.40 if "security" in s or "support" in s or "backup" in s else 0.50
                service_cols[s].append(rng.choice(["Yes", "No"], p=[prob_yes, 1.0 - prob_yes]))

    # Contract correlated with tenure
    contract = []
    for t in tenure:
        if t < 12:
            contract.append(rng.choice(["Month-to-month", "One year", "Two year"], p=[0.85, 0.12, 0.03]))
        elif t < 36:
            contract.append(rng.choice(["Month-to-month", "One year", "Two year"], p=[0.45, 0.35, 0.20]))
        else:
            contract.append(rng.choice(["Month-to-month", "One year", "Two year"], p=[0.20, 0.35, 0.45]))

    paperless_billing = rng.choice(["Yes", "No"], size=n_samples, p=[0.60, 0.40])
    payment_method = rng.choice(
        ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"],
        size=n_samples,
        p=[0.34, 0.22, 0.22, 0.22],
    )

    # Monthly charges base depends on internet type and services
    monthly_charges = []
    for i in range(n_samples):
        net = internet_service[i]
        base = 20.0 if net == "No" else (45.0 if net == "DSL" else 75.0)
        # Add fee for added services
        add_ons = sum(1 for s in services if service_cols[s][i] == "Yes")
        charge = base + add_ons * 5.0 + rng.uniform(-2.5, 4.0)
        monthly_charges.append(round(charge, 2))

    monthly_charges = np.array(monthly_charges)
    total_charges = np.round(monthly_charges * tenure + rng.normal(0, 10.0, size=n_samples), 2)
    total_charges = np.maximum(total_charges, monthly_charges)

    # Churn probability score based on real business drivers
    churn_logits = (
        -1.5
        + 1.4 * (np.array(contract) == "Month-to-month")
        - 0.8 * (np.array(contract) == "Two year")
        + 0.8 * (np.array(payment_method) == "Electronic check")
        + 0.6 * (internet_service == "Fiber optic")
        - 0.7 * (np.array(service_cols["tech_support"]) == "Yes")
        - 0.6 * (np.array(service_cols["online_security"]) == "Yes")
        - 0.035 * tenure
        + 0.012 * (monthly_charges - 60.0)
        + 0.3 * (senior_citizen == 1)
        - 0.3 * (np.array(partner) == "Yes")
    )
    churn_prob = 1.0 / (1.0 + np.exp(-churn_logits))
    churn = (rng.uniform(0, 1, size=n_samples) < churn_prob).astype(int)

    df = pd.DataFrame({
        "customer_id": customer_ids,
        "gender": gender,
        "senior_citizen": senior_citizen,
        "partner": partner,
        "dependents": dependents,
        "tenure": tenure,
        "phone_service": phone_service,
        "multiple_lines": multiple_lines,
        "internet_service": internet_service,
        "online_security": service_cols["online_security"],
        "online_backup": service_cols["online_backup"],
        "device_protection": service_cols["device_protection"],
        "tech_support": service_cols["tech_support"],
        "streaming_tv": service_cols["streaming_tv"],
        "streaming_movies": service_cols["streaming_movies"],
        "contract": contract,
        "paperless_billing": paperless_billing,
        "payment_method": payment_method,
        "monthly_charges": monthly_charges,
        "total_charges": total_charges,
        "churn": churn,
    })
    return df


def ensure_dataset(force_regenerate: bool = False) -> pd.DataFrame:
    """Ensure raw dataset exists on disk; generate if missing."""
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)
    DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    raw_csv = DATA_RAW_DIR / "churn.csv"

    if raw_csv.exists() and not force_regenerate:
        return pd.read_csv(raw_csv)

    df = generate_churn_dataset(n_samples=2500, random_state=42)
    df.to_csv(raw_csv, index=False)

    # Train / test split (80 / 20)
    train_df = df.sample(frac=0.8, random_state=42)
    test_df = df.drop(train_df.index)

    train_df.to_csv(DATA_PROCESSED_DIR / "train.csv", index=False)
    test_df.to_csv(DATA_PROCESSED_DIR / "test.csv", index=False)
    return df


def get_dataset_summary() -> dict[str, Any]:
    """Return statistical summary and schema of the dataset."""
    df = ensure_dataset()
    churn_counts = df["churn"].value_counts().to_dict()
    churn_rate = float(df["churn"].mean())

    return {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "churn_rate": round(churn_rate, 4),
        "class_balance": {
            "retained": int(churn_counts.get(0, 0)),
            "churned": int(churn_counts.get(1, 0)),
        },
        "numerical_stats": {
            "tenure": {
                "mean": round(float(df["tenure"].mean()), 2),
                "min": int(df["tenure"].min()),
                "max": int(df["tenure"].max()),
            },
            "monthly_charges": {
                "mean": round(float(df["monthly_charges"].mean()), 2),
                "min": round(float(df["monthly_charges"].min()), 2),
                "max": round(float(df["monthly_charges"].max()), 2),
            },
            "total_charges": {
                "mean": round(float(df["total_charges"].mean()), 2),
                "min": round(float(df["total_charges"].min()), 2),
                "max": round(float(df["total_charges"].max()), 2),
            },
        },
        "contract_breakdown": df["contract"].value_counts().to_dict(),
        "internet_breakdown": df["internet_service"].value_counts().to_dict(),
        "sample_records": df.head(5).to_dict(orient="records"),
    }
