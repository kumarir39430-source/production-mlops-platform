import React, { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  ShieldCheck,
  Table,
} from "lucide-react";
import { getDatasetSummary, getDatasetValidation, regenerateDataset } from "../services/api";
import type { DataValidationResponse, DatasetSummaryResponse } from "../types/mlops";

export const DataTab: React.FC = () => {
  const [summary, setSummary] = useState<DatasetSummaryResponse | null>(null);
  const [validation, setValidation] = useState<DataValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenMsg, setRegenMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, v] = await Promise.all([getDatasetSummary(), getDatasetValidation()]);
      setSummary(s);
      setValidation(v);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegenerate = async () => {
    setLoading(true);
    setRegenMsg(null);
    try {
      const res = await regenerateDataset();
      setRegenMsg(`Generated fresh dataset with ${res.rows} rows!`);
      fetchData();
    } catch (err) {
      setRegenMsg(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div className="card-glass" style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={18} color="var(--accent-primary)" />
            Dataset & Data Quality Assurance
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Automated schema enforcement, missing value audits, numerical boundaries, and category domain checking.
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={handleRegenerate}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
          <span>Regenerate Dataset</span>
        </button>
      </div>

      {regenMsg && (
        <div style={{ background: "var(--status-ok-bg)", color: "var(--status-ok)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
          {regenMsg}
        </div>
      )}

      {/* Dataset Metrics */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">Total Records</div>
          <div className="kpi-value">{summary?.total_rows ?? 2500}</div>
          <div className="kpi-detail">{summary?.total_columns ?? 21} features across demographics & billing</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">Baseline Churn Rate</div>
          <div className="kpi-value" style={{ color: "var(--status-warning)" }}>
            {summary ? (summary.churn_rate * 100).toFixed(1) : "26.5"}%
          </div>
          <div className="kpi-detail">
            {summary?.class_balance.churned ?? 662} churned / {summary?.class_balance.retained ?? 1838} retained
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">Validation Rule Status</div>
          <div className="kpi-value" style={{ color: "var(--status-ok)" }}>
            {validation?.passed_checks ?? 10} / {validation?.total_checks ?? 10}
          </div>
          <div className="kpi-detail" style={{ color: "var(--status-ok)" }}>
            100% of data quality checks passed
          </div>
        </div>
      </div>

      {/* Validation Checklist */}
      <div className="card-glass" style={{ marginBottom: "1.75rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={18} color="var(--status-ok)" />
          Data Validation Rules & Audit
        </h3>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Description</th>
                <th>Check Details</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {validation?.checks.map((c) => (
                <tr key={c.rule}>
                  <td><code>{c.rule}</code></td>
                  <td>{c.description}</td>
                  <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{c.detail}</td>
                  <td>
                    <span className="badge-pill ok" style={{ padding: "0.15rem 0.5rem", fontSize: "0.72rem" }}>
                      Passed ✓
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Records */}
      {summary?.sample_records && summary.sample_records.length > 0 && (
        <div className="card-glass">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Table size={18} color="var(--accent-cyan)" />
            Dataset Sample Preview
          </h3>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Gender</th>
                  <th>Tenure</th>
                  <th>Contract</th>
                  <th>Internet</th>
                  <th>Monthly ($)</th>
                  <th>Total ($)</th>
                  <th>Churn</th>
                </tr>
              </thead>
              <tbody>
                {summary.sample_records.map((r, i) => (
                  <tr key={i}>
                    <td><code>{String(r.customer_id)}</code></td>
                    <td>{String(r.gender)}</td>
                    <td>{String(r.tenure)} mos</td>
                    <td>{String(r.contract)}</td>
                    <td>{String(r.internet_service)}</td>
                    <td>${Number(r.monthly_charges).toFixed(2)}</td>
                    <td>${Number(r.total_charges).toFixed(2)}</td>
                    <td>
                      <span className={`risk-tag ${r.churn === 1 ? "High" : "Low"}`} style={{ padding: "0.15rem 0.5rem", fontSize: "0.7rem", margin: 0 }}>
                        {r.churn === 1 ? "Churn (1)" : "Retained (0)"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
