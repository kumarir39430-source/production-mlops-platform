import React, { useState } from "react";
import {
  BarChart3,
  Play,
  Sparkles,
} from "lucide-react";
import { trainModel } from "../services/api";
import type { RegistryResponse } from "../types/mlops";

interface ExperimentsTabProps {
  registry: RegistryResponse | null;
  onRefresh: () => void;
}

export const ExperimentsTab: React.FC<ExperimentsTabProps> = ({ registry, onRefresh }) => {
  const [algorithm, setAlgorithm] = useState("GradientBoosting");
  const [notes, setNotes] = useState("Hyperparameter exploration run");
  const [loading, setLoading] = useState(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  const models = registry?.models || [];

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTrainMessage(null);
    try {
      const rec = await trainModel(algorithm, {}, notes);
      setTrainMessage(`Trained new candidate version ${rec.version} with ROC-AUC ${rec.metrics.roc_auc}!`);
      onRefresh();
    } catch (err) {
      setTrainMessage(err instanceof Error ? err.message : "Training failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header Form to Trigger New Run */}
      <div className="card-glass" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              Train Candidate Model
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Train new candidate estimator, fit preprocessing pipeline, compute test metrics, and register artifact.
            </p>
          </div>
        </div>

        {trainMessage && (
          <div style={{ background: "var(--status-ok-bg)", color: "var(--status-ok)", padding: "0.75rem 1rem", borderRadius: "10px", marginBottom: "1rem", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            {trainMessage}
          </div>
        )}

        <form onSubmit={handleTrain} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "1rem", alignItems: "flex-end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Algorithm Architecture</label>
            <select
              className="form-select"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
            >
              <option value="GradientBoosting">HistGradientBoosting (Default)</option>
              <option value="RandomForest">Random Forest Ensemble</option>
              <option value="LogisticRegression">Logistic Regression (Linear Baseline)</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Run Notes / Tag</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Iteration with tuned learning rate"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ height: "42px" }}
          >
            <Play size={16} />
            <span>{loading ? "Training Pipeline..." : "Launch Training Run"}</span>
          </button>
        </form>
      </div>

      {/* Comparison Table */}
      <div className="card-glass">
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BarChart3 size={18} color="var(--accent-cyan)" />
          Candidate Model Leaderboard & Comparison
        </h3>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Algorithm</th>
                <th>Stage</th>
                <th>ROC-AUC</th>
                <th>F1 Score</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>Quality Gate</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const isProd = m.stage === "Production";
                return (
                  <tr key={m.version} style={{ background: isProd ? "rgba(99, 102, 241, 0.05)" : "transparent" }}>
                    <td>
                      <strong style={{ color: isProd ? "var(--accent-cyan)" : "inherit" }}>{m.version}</strong>
                    </td>
                    <td>{m.algorithm}</td>
                    <td>
                      <span className={`badge-pill ${isProd ? "ok" : "warning"}`} style={{ padding: "0.15rem 0.5rem", fontSize: "0.72rem" }}>
                        {m.stage}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "var(--accent-cyan)" }}>{m.metrics.roc_auc}</strong>
                    </td>
                    <td>{m.metrics.f1}</td>
                    <td>{m.metrics.accuracy}</td>
                    <td>{m.metrics.precision}</td>
                    <td>{m.metrics.recall}</td>
                    <td>
                      <span style={{ color: m.quality_gate_passed ? "var(--status-ok)" : "var(--status-danger)", fontWeight: 600 }}>
                        {m.quality_gate_passed ? "Passed ✓" : "Failed ✗"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
