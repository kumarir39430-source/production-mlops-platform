import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Play,
  Sparkles,
  Zap,
} from "lucide-react";
import { predictBatch, predictSingle } from "../services/api";
import type { BatchPredictionResponse, CustomerFeatures, PredictionResponse } from "../types/mlops";

const PRESETS: Record<string, { label: string; data: CustomerFeatures }> = {
  highRisk: {
    label: "🚨 High Risk Persona",
    data: {
      gender: "Female",
      senior_citizen: 0,
      partner: "No",
      dependents: "No",
      tenure: 3,
      phone_service: "Yes",
      multiple_lines: "No",
      internet_service: "Fiber optic",
      online_security: "No",
      online_backup: "No",
      device_protection: "No",
      tech_support: "No",
      streaming_tv: "Yes",
      streaming_movies: "Yes",
      contract: "Month-to-month",
      paperless_billing: "Yes",
      payment_method: "Electronic check",
      monthly_charges: 96.5,
      total_charges: 289.5,
    },
  },
  loyal: {
    label: "🛡️ Loyal Retained Persona",
    data: {
      gender: "Male",
      senior_citizen: 0,
      partner: "Yes",
      dependents: "Yes",
      tenure: 60,
      phone_service: "Yes",
      multiple_lines: "Yes",
      internet_service: "DSL",
      online_security: "Yes",
      online_backup: "Yes",
      device_protection: "Yes",
      tech_support: "Yes",
      streaming_tv: "No",
      streaming_movies: "No",
      contract: "Two year",
      paperless_billing: "No",
      payment_method: "Bank transfer (automatic)",
      monthly_charges: 52.0,
      total_charges: 3120.0,
    },
  },
  senior: {
    label: "👵 Senior Citizen Budget",
    data: {
      gender: "Female",
      senior_citizen: 1,
      partner: "No",
      dependents: "No",
      tenure: 18,
      phone_service: "Yes",
      multiple_lines: "No",
      internet_service: "DSL",
      online_security: "No",
      online_backup: "No",
      device_protection: "No",
      tech_support: "Yes",
      streaming_tv: "No",
      streaming_movies: "No",
      contract: "One year",
      paperless_billing: "Yes",
      payment_method: "Mailed check",
      monthly_charges: 39.5,
      total_charges: 711.0,
    },
  },
  streamer: {
    label: "🎬 High-Charge Streamer",
    data: {
      gender: "Male",
      senior_citizen: 0,
      partner: "Yes",
      dependents: "No",
      tenure: 14,
      phone_service: "Yes",
      multiple_lines: "Yes",
      internet_service: "Fiber optic",
      online_security: "Yes",
      online_backup: "Yes",
      device_protection: "Yes",
      tech_support: "No",
      streaming_tv: "Yes",
      streaming_movies: "Yes",
      contract: "Month-to-month",
      paperless_billing: "Yes",
      payment_method: "Credit card (automatic)",
      monthly_charges: 104.5,
      total_charges: 1463.0,
    },
  },
};

export const PredictorTab: React.FC = () => {
  const [features, setFeatures] = useState<CustomerFeatures>(PRESETS.highRisk.data);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [batchResult, setBatchResult] = useState<BatchPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictSingle(features);
      setResult(res);
      setBatchResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inference error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = Object.values(PRESETS).map((p) => p.data);
      // repeat to make 8
      const fullList = [...list, ...list];
      const res = await predictBatch(fullList);
      setBatchResult(res);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch test error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof CustomerFeatures>(field: K, value: CustomerFeatures[K]) => {
    setFeatures((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "tenure" || field === "monthly_charges") {
        updated.total_charges = Math.round(updated.tenure * updated.monthly_charges * 100) / 100;
      }
      return updated;
    });
  };

  return (
    <div>
      {/* Preset Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className="btn-secondary"
              onClick={() => {
                setFeatures(preset.data);
                setResult(null);
              }}
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          className="btn-secondary"
          onClick={handleBatchTest}
          disabled={loading}
          style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem", borderColor: "var(--accent-cyan)" }}
        >
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span>Run 8-Customer Batch Test</span>
        </button>
      </div>

      {error && (
        <div style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)", padding: "0.85rem 1rem", borderRadius: "10px", marginBottom: "1.25rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        {/* Input Parameters Panel */}
        <div className="card-glass">
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={18} color="var(--accent-primary)" />
            Customer Attributes
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Contract Type</label>
              <select
                className="form-select"
                value={features.contract}
                onChange={(e) => updateField("contract", e.target.value as CustomerFeatures["contract"])}
              >
                <option value="Month-to-month">Month-to-month</option>
                <option value="One year">One year</option>
                <option value="Two year">Two year</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Internet Service</label>
              <select
                className="form-select"
                value={features.internet_service}
                onChange={(e) => updateField("internet_service", e.target.value as CustomerFeatures["internet_service"])}
              >
                <option value="Fiber optic">Fiber optic</option>
                <option value="DSL">DSL</option>
                <option value="No">No Internet</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <label className="form-label" style={{ margin: 0 }}>Tenure (Months)</label>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                {features.tenure} months
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="72"
              value={features.tenure}
              onChange={(e) => updateField("tenure", Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-cyan)" }}
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <label className="form-label" style={{ margin: 0 }}>Monthly Charges ($)</label>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-primary)" }}>
                ${features.monthly_charges.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="18"
              max="130"
              step="0.5"
              value={features.monthly_charges}
              onChange={(e) => updateField("monthly_charges", Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={features.payment_method}
                onChange={(e) => updateField("payment_method", e.target.value as CustomerFeatures["payment_method"])}
              >
                <option value="Electronic check">Electronic check</option>
                <option value="Mailed check">Mailed check</option>
                <option value="Bank transfer (automatic)">Bank transfer (auto)</option>
                <option value="Credit card (automatic)">Credit card (auto)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tech Support</label>
              <select
                className="form-select"
                value={features.tech_support}
                onChange={(e) => updateField("tech_support", e.target.value as CustomerFeatures["tech_support"])}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Online Security</label>
              <select
                className="form-select"
                value={features.online_security}
                onChange={(e) => updateField("online_security", e.target.value as CustomerFeatures["online_security"])}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="No internet service">No internet service</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Senior Citizen</label>
              <select
                className="form-select"
                value={features.senior_citizen}
                onChange={(e) => updateField("senior_citizen", Number(e.target.value))}
              >
                <option value={0}>No (0)</option>
                <option value={1}>Yes (1)</option>
              </select>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handlePredict}
            disabled={loading}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            <Play size={16} />
            <span>{loading ? "Running Inference Pipeline..." : "Execute Real-Time Prediction"}</span>
          </button>
        </div>

        {/* Live Inference Output Panel */}
        <div className="card-glass" style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
            Inference Telemetry & Attribution
          </h2>

          {result ? (
            <div>
              {/* Risk Gauge Header */}
              <div
                style={{
                  background: "var(--bg-surface-elevated)",
                  borderRadius: "14px",
                  padding: "1.5rem",
                  textAlign: "center",
                  border: "1px solid var(--border-medium)",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                  Churn Probability Score
                </div>
                <div
                  style={{
                    fontSize: "3.2rem",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    color: result.risk_level === "High" ? "var(--status-danger)" : (result.risk_level === "Medium" ? "var(--status-warning)" : "var(--status-ok)"),
                    lineHeight: 1.1,
                    margin: "0.4rem 0",
                  }}
                >
                  {(result.churn_probability * 100).toFixed(1)}%
                </div>
                <div className={`risk-tag ${result.risk_level}`}>
                  {result.risk_level} Risk · Outcome: {result.churn_label}
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  <span>Model: <strong>{result.model_version}</strong></span>
                  <span>Latency: <strong style={{ color: "var(--status-ok)" }}>{result.latency_ms} ms</strong></span>
                  <span>Tracing: <strong>{result.request_id}</strong></span>
                </div>
              </div>

              {/* Attribution / Explainability */}
              <h3 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-muted)" }}>
                Key Contributing Risk Drivers:
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {result.top_risk_factors.map((factor, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    {factor.impact === "increases_churn" ? (
                      <AlertTriangle size={18} color="var(--status-danger)" style={{ flexShrink: 0, marginTop: "2px" }} />
                    ) : (
                      <CheckCircle size={18} color="var(--status-ok)" style={{ flexShrink: 0, marginTop: "2px" }} />
                    )}
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: factor.impact === "increases_churn" ? "var(--status-danger)" : "var(--status-ok)" }}>
                        {factor.feature.toUpperCase()} = {factor.feature_value}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {factor.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : batchResult ? (
            <div>
              <div style={{ background: "var(--bg-surface-elevated)", padding: "1rem", borderRadius: "12px", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span>Batch Processed: <strong>{batchResult.total_processed} customers</strong></span>
                  <span>Overall Churn Rate: <strong style={{ color: "var(--status-danger)" }}>{(batchResult.overall_churn_rate * 100).toFixed(1)}%</strong></span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                  Served by Production Model: {batchResult.model_version}
                </div>
              </div>

              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Risk</th>
                      <th>Prob</th>
                      <th>Prediction</th>
                      <th>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.predictions.map((p, idx) => (
                      <tr key={idx}>
                        <td>CUST-{idx + 1}</td>
                        <td>
                          <span className={`risk-tag ${p.risk_level}`} style={{ padding: "0.15rem 0.5rem", fontSize: "0.72rem", margin: 0 }}>
                            {p.risk_level}
                          </span>
                        </td>
                        <td>{(p.churn_probability * 100).toFixed(1)}%</td>
                        <td><strong>{p.churn_label}</strong></td>
                        <td>{p.latency_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", padding: "2rem" }}>
              <HelpCircle size={44} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
              <p style={{ fontSize: "0.9rem" }}>Select a customer persona or adjust parameters and click "Execute Real-Time Prediction".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
