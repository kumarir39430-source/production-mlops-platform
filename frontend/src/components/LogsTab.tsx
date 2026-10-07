import React, { useEffect, useState } from "react";
import { Check, Clock, Database, RefreshCw, X } from "lucide-react";
import { getPredictionLogs, recordFeedback } from "../services/api";
import type { PredictionLogItem } from "../types/mlops";

export const LogsTab: React.FC = () => {
  const [logs, setLogs] = useState<PredictionLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getPredictionLogs(50);
      setLogs(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFeedback = async (logId: number, actual: number) => {
    try {
      await recordFeedback(logId, actual);
      setFeedbackStatus(`Logged ground-truth outcome for Log #${logId}`);
      fetchLogs();
      setTimeout(() => setFeedbackStatus(null), 3000);
    } catch (err) {
      setFeedbackStatus(err instanceof Error ? err.message : "Failed to record feedback");
    }
  };

  return (
    <div>
      <div className="card-glass" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={18} color="var(--accent-cyan)" />
            Inference Logs & Feedback Loop
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Persisted prediction audits with latency, risk levels, and ground-truth evaluation hooks.
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={fetchLogs}
          disabled={loading}
          style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
        >
          <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {feedbackStatus && (
        <div style={{ background: "var(--status-ok-bg)", color: "var(--status-ok)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
          {feedbackStatus}
        </div>
      )}

      <div className="card-glass">
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-dim)" }}>
            <Clock size={36} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
            <p>No predictions logged yet. Run a prediction in the "Live Predictor" tab!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Model</th>
                  <th>Probability</th>
                  <th>Risk Level</th>
                  <th>Latency</th>
                  <th>Actual Outcome (Feedback Loop)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "Just now"}
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--accent-cyan)" }}>
                        {log.model_version}
                      </span>
                    </td>
                    <td>
                      <strong>{(log.probability * 100).toFixed(1)}%</strong>
                    </td>
                    <td>
                      <span className={`risk-tag ${log.risk_level}`} style={{ padding: "0.15rem 0.5rem", fontSize: "0.72rem", margin: 0 }}>
                        {log.risk_level}
                      </span>
                    </td>
                    <td>{log.latency_ms} ms</td>
                    <td>
                      {log.actual_churn !== null && log.actual_churn !== undefined ? (
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: log.actual_churn === log.prediction ? "var(--status-ok)" : "var(--status-danger)" }}>
                          {log.actual_churn === 1 ? "Actual: Churned" : "Actual: Retained"} {log.actual_churn === log.prediction ? "✓" : "✗"}
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            className="btn-secondary"
                            onClick={() => handleFeedback(log.id, 0)}
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}
                            title="Record customer was retained"
                          >
                            <Check size={12} color="var(--status-ok)" /> Retained
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => handleFeedback(log.id, 1)}
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}
                            title="Record customer churned"
                          >
                            <X size={12} color="var(--status-danger)" /> Churned
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
