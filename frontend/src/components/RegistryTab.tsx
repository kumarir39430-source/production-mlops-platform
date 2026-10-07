import React, { useState } from "react";
import {
  ChevronRight,
  Cpu,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { promoteModel, rollbackModel } from "../services/api";
import type { RegistryResponse } from "../types/mlops";

interface RegistryTabProps {
  registry: RegistryResponse | null;
  onRefresh: () => void;
}

export const RegistryTab: React.FC<RegistryTabProps> = ({ registry, onRefresh }) => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(
    registry?.active_production_version ?? (registry?.models[0]?.version || null)
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const activeModel = registry?.models.find((m) => m.version === registry.active_production_version);
  const currentModel = registry?.models.find((m) => m.version === selectedVersion) || activeModel;

  const handlePromote = async (version: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await promoteModel(version);
      setActionMessage({ type: "ok", text: `Successfully promoted ${res.version} to Production!` });
      onRefresh();
    } catch (err) {
      setActionMessage({ type: "err", text: err instanceof Error ? err.message : "Promotion failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await rollbackModel();
      setActionMessage({ type: "ok", text: `Successfully rolled back to ${res.active_version} (reverted from ${res.reverted_from})!` });
      onRefresh();
    } catch (err) {
      setActionMessage({ type: "err", text: err instanceof Error ? err.message : "Rollback failed" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Top Banner Actions */}
      <div className="card-glass" style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Cpu size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Production Model Registry</h2>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Currently Serving: <strong style={{ color: "var(--accent-cyan)" }}>{registry?.active_production_version ?? "None"}</strong> ({activeModel?.algorithm ?? "GradientBoosting"})
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={handleRollback}
          disabled={actionLoading}
          style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)" }}
        >
          <RotateCcw size={15} />
          <span>Rollback to Previous Active Version</span>
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            background: actionMessage.type === "ok" ? "var(--status-ok-bg)" : "var(--status-danger-bg)",
            color: actionMessage.type === "ok" ? "var(--status-ok)" : "var(--status-danger)",
            padding: "0.85rem 1.25rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            border: `1px solid ${actionMessage.type === "ok" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          }}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Models Grid & Detail Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.5rem" }}>
        {/* Versions List */}
        <div className="card-glass" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Cataloged Model Versions
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {registry?.models.map((m) => {
              const isSelected = (selectedVersion ?? registry.active_production_version) === m.version;
              const isProd = m.stage === "Production";

              return (
                <div
                  key={m.version}
                  onClick={() => setSelectedVersion(m.version)}
                  style={{
                    background: isSelected ? "var(--bg-surface-elevated)" : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isSelected ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    borderRadius: "12px",
                    padding: "0.85rem 1rem",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{m.version}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>({m.algorithm})</span>
                      {isProd && (
                        <span className="badge-pill ok" style={{ padding: "0.15rem 0.5rem", fontSize: "0.7rem" }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                      ROC-AUC: <strong>{m.metrics.roc_auc}</strong> · F1: <strong>{m.metrics.f1}</strong>
                    </div>
                  </div>

                  <ChevronRight size={16} color={isSelected ? "var(--accent-primary)" : "var(--text-dim)"} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Model Details & Governance Gates */}
        {currentModel && (
          <div className="card-glass">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Model Version {currentModel.version}</h3>
                  <span className={`badge-pill ${currentModel.stage === "Production" ? "ok" : "warning"}`}>
                    {currentModel.stage}
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                  Algorithm: {currentModel.algorithm} · Created: {new Date(currentModel.created_at).toLocaleString()}
                </p>
              </div>

              {currentModel.stage !== "Production" && (
                <button
                  className="btn-primary"
                  onClick={() => handlePromote(currentModel.version)}
                  disabled={actionLoading}
                >
                  <TrendingUp size={15} />
                  <span>Promote to Production</span>
                </button>
              )}
            </div>

            {/* Quality Gate Checklist */}
            <div style={{ background: "var(--bg-surface-elevated)", padding: "1.15rem", borderRadius: "12px", border: "1px solid var(--border-medium)", marginBottom: "1.25rem" }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldCheck size={16} color="var(--status-ok)" />
                Automated Quality Promotion Gate
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>ROC-AUC (≥ 0.72)</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: currentModel.metrics.roc_auc >= 0.72 ? "var(--status-ok)" : "var(--status-danger)" }}>
                    {currentModel.metrics.roc_auc} ✓
                  </div>
                </div>

                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>F1-Score (≥ 0.50)</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: currentModel.metrics.f1 >= 0.50 ? "var(--status-ok)" : "var(--status-danger)" }}>
                    {currentModel.metrics.f1} ✓
                  </div>
                </div>

                <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Accuracy (≥ 0.70)</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: currentModel.metrics.accuracy >= 0.70 ? "var(--status-ok)" : "var(--status-danger)" }}>
                    {currentModel.metrics.accuracy} ✓
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown & Confusion Matrix */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.6rem", color: "var(--text-muted)" }}>
                  Evaluation Metrics
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-dim)" }}>Precision:</span>
                    <strong>{currentModel.metrics.precision}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-dim)" }}>Recall:</span>
                    <strong>{currentModel.metrics.recall}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-dim)" }}>Artifact Path:</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-cyan)" }}>
                      {currentModel.artifact_path}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confusion Matrix */}
              {currentModel.confusion_matrix && currentModel.confusion_matrix.length === 2 && (
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.6rem", color: "var(--text-muted)" }}>
                    Test Confusion Matrix
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", textAlign: "center" }}>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "0.5rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>TN (True Retained)</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--status-ok)" }}>
                        {currentModel.confusion_matrix[0][0]}
                      </div>
                    </div>
                    <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "0.5rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>FP (False Churn)</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--status-danger)" }}>
                        {currentModel.confusion_matrix[0][1]}
                      </div>
                    </div>
                    <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "0.5rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>FN (Missed Churn)</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--status-danger)" }}>
                        {currentModel.confusion_matrix[1][0]}
                      </div>
                    </div>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "0.5rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>TP (Correct Churn)</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--status-ok)" }}>
                        {currentModel.confusion_matrix[1][1]}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
