import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { getDriftReport, triggerRetraining } from "../services/api";
import type { DriftReportResponse, RetrainResponse } from "../types/mlops";

interface MonitoringTabProps {
  onRefresh: () => void;
}

export const MonitoringTab: React.FC<MonitoringTabProps> = ({ onRefresh }) => {
  const [driftReport, setDriftReport] = useState<DriftReportResponse | null>(null);
  const [psiThreshold, setPsiThreshold] = useState(0.20);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<RetrainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDrift = async (thresh: number) => {
    setError(null);
    try {
      const res = await getDriftReport(thresh);
      setDriftReport(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch drift report");
    }
  };

  useEffect(() => {
    fetchDrift(psiThreshold);
  }, [psiThreshold]);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const res = await triggerRetraining(
        "GradientBoosting",
        "Automated drift sentinel trigger",
        true
      );
      setRetrainResult(res);
      onRefresh();
      fetchDrift(psiThreshold);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retraining failed");
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div>
      {/* Top Banner & Automated Retrain Trigger */}
      <div className="card-glass" style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Data & Concept Drift Sentinel</h2>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Computes Population Stability Index (PSI) & Kolmogorov-Smirnov (KS) tests between training baseline and production inferences.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleRetrain}
          disabled={retraining}
        >
          <RefreshCw size={15} className={retraining ? "spin-icon" : ""} />
          <span>{retraining ? "Executing Retraining Loop..." : "Trigger Automated Retraining Loop"}</span>
        </button>
      </div>

      {retrainResult && (
        <div
          style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--status-ok)",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--status-ok)", fontWeight: 700, fontSize: "0.95rem" }}>
            <CheckCircle2 size={18} />
            <span>Retraining Loop Completed Successfully!</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
            Trained new candidate <strong>{retrainResult.retrained_version}</strong> ({retrainResult.algorithm}).
            {retrainResult.promoted_to_production ? (
              <span style={{ color: "var(--status-ok)", marginLeft: "0.4rem" }}>
                Passed quality promotion gate and promoted to active Production! (ROC-AUC {retrainResult.metrics.roc_auc})
              </span>
            ) : (
              <span> Archived as candidate.</span>
            )}
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: "var(--status-danger-bg)", color: "var(--status-danger)", padding: "0.85rem", borderRadius: "10px", marginBottom: "1.25rem" }}>
          {error}
        </div>
      )}

      {/* Summary KPI & Sensitivity Controller */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card-glass">
          <div className="kpi-header">Overall Sentinel State</div>
          <div className="kpi-value" style={{ color: driftReport?.status === "healthy" ? "var(--status-ok)" : "var(--status-warning)" }}>
            {driftReport?.status.toUpperCase() ?? "HEALTHY"}
          </div>
          <div className="kpi-detail">
            {driftReport?.drifted_features_count ?? 0} of {driftReport?.total_features ?? 19} features flagged
          </div>
        </div>

        <div className="card-glass">
          <div className="kpi-header">Sample Comparison</div>
          <div className="kpi-value">{driftReport?.reference_sample_size ?? 2500} / {driftReport?.current_sample_size ?? 500}</div>
          <div className="kpi-detail">
            Baseline records vs. Live Inference sample
          </div>
        </div>

        <div className="card-glass">
          <div className="kpi-header" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>PSI Threshold</span>
            <strong>{psiThreshold.toFixed(2)}</strong>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.40"
            step="0.01"
            value={psiThreshold}
            onChange={(e) => setPsiThreshold(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-primary)", marginTop: "0.75rem" }}
          />
          <div className="kpi-detail">
            Standard: &lt;0.10 None, 0.10-0.25 Moderate, &gt;0.25 Significant
          </div>
        </div>
      </div>

      {/* Feature Drift Matrix */}
      <div className="card-glass">
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
          Feature-Level Drift Diagnostics (PSI & Kolmogorov-Smirnov)
        </h3>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Type</th>
                <th>PSI Metric</th>
                <th>KS p-value</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Distribution Shift</th>
              </tr>
            </thead>
            <tbody>
              {driftReport?.features.map((f) => (
                <tr key={f.feature}>
                  <td><strong>{f.feature}</strong></td>
                  <td>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                      {f.type}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: f.psi >= psiThreshold ? "var(--status-danger)" : "inherit" }}>
                      {f.psi.toFixed(4)}
                    </strong>
                  </td>
                  <td>{f.p_value !== null && f.p_value !== undefined ? f.p_value.toFixed(4) : "—"}</td>
                  <td>
                    <span className={`badge-pill ${f.severity === "high" ? "danger" : (f.severity === "moderate" ? "warning" : "ok")}`} style={{ padding: "0.15rem 0.5rem", fontSize: "0.7rem" }}>
                      {f.severity}
                    </span>
                  </td>
                  <td>
                    {f.drift_detected ? (
                      <span style={{ color: "var(--status-danger)", fontWeight: 700 }}>Drift Detected ⚠️</span>
                    ) : (
                      <span style={{ color: "var(--status-ok)", fontWeight: 600 }}>Stable ✓</span>
                    )}
                  </td>
                  <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {f.type === "numeric" && f.ref_mean !== null && f.current_mean !== null ? (
                      `Baseline: ${f.ref_mean} → Current: ${f.current_mean}`
                    ) : (
                      "Categorical frequency distribution verified"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
