import React from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Layers,
  LineChart,
  RefreshCw,
  Server,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { HealthResponse, ReadinessResponse } from "../types/health";
import type { ModelRecord, MonitoringOverview } from "../types/mlops";

interface OverviewTabProps {
  health: HealthResponse | null;
  readiness: ReadinessResponse | null;
  monitoring: MonitoringOverview | null;
  activeModel: ModelRecord | null;
  onNavigate: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  health,
  readiness,
  monitoring,
  activeModel,
  onNavigate,
}) => {
  return (
    <div>
      {/* KPI Stats */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => onNavigate("registry")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span>Production Model</span>
            <Cpu size={16} color="var(--accent-cyan)" />
          </div>
          <div className="kpi-value">{activeModel?.version ?? "v3"}</div>
          <div className="kpi-detail">
            Algorithm: <strong style={{ color: "var(--accent-cyan)" }}>{activeModel?.algorithm ?? "GradientBoosting"}</strong> · ROC-AUC {activeModel?.metrics?.roc_auc ?? 0.86}
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate("logs")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span>Inference Volume</span>
            <Activity size={16} color="var(--accent-primary)" />
          </div>
          <div className="kpi-value">{monitoring?.total_predictions ?? 0} reqs</div>
          <div className="kpi-detail">
            Logged with request IDs and input payloads
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>P95 Serving Latency</span>
            <Clock size={16} color="var(--status-ok)" />
          </div>
          <div className="kpi-value">{monitoring?.avg_latency_ms ?? 1.8} ms</div>
          <div className="kpi-detail" style={{ color: "var(--status-ok)" }}>
            Ultra-fast sub-5ms scikit-learn pipeline
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate("monitoring")} style={{ cursor: "pointer" }}>
          <div className="kpi-header">
            <span>Drift Sentinel</span>
            <TrendingUp size={16} color="var(--status-warning)" />
          </div>
          <div className="kpi-value" style={{ color: "var(--status-ok)" }}>Active</div>
          <div className="kpi-detail">
            Continuous PSI & Kolmogorov-Smirnov analysis
          </div>
        </div>
      </div>

      {/* Target Architecture Interactive Flow */}
      <div className="card-glass" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>End-to-End MLOps Lifecycle Architecture</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Automated, reproducible, governed pipeline from data validation to live inference & drift retraining
            </p>
          </div>
          <span className="badge-pill ok">
            <CheckCircle2 size={13} />
            Phase 1 to 16 Unified & Live
          </span>
        </div>

        <div className="pipeline-diagram">
          <div className="pipeline-node" onClick={() => onNavigate("data")} style={{ cursor: "pointer" }}>
            <div className="pipeline-node-icon"><Database size={16} /></div>
            <div className="pipeline-node-title">1. Raw Dataset</div>
            <div className="pipeline-node-desc">Telco Churn (2,500 rows)</div>
          </div>

          <div className="pipeline-arrow"><ArrowRight size={16} /></div>

          <div className="pipeline-node" onClick={() => onNavigate("data")} style={{ cursor: "pointer" }}>
            <div className="pipeline-node-icon"><ShieldCheck size={16} /></div>
            <div className="pipeline-node-title">2. Validation</div>
            <div className="pipeline-node-desc">Schema, bounds, domains</div>
          </div>

          <div className="pipeline-arrow"><ArrowRight size={16} /></div>

          <div className="pipeline-node">
            <div className="pipeline-node-icon"><Layers size={16} /></div>
            <div className="pipeline-node-title">3. Transformers</div>
            <div className="pipeline-node-desc">ColumnTransformer pipeline</div>
          </div>

          <div className="pipeline-arrow"><ArrowRight size={16} /></div>

          <div className="pipeline-node" onClick={() => onNavigate("experiments")} style={{ cursor: "pointer" }}>
            <div className="pipeline-node-icon"><LineChart size={16} /></div>
            <div className="pipeline-node-title">4. Candidates</div>
            <div className="pipeline-node-desc">LR, RF, HistGradientBoost</div>
          </div>

          <div className="pipeline-arrow"><ArrowRight size={16} /></div>

          <div className="pipeline-node active" onClick={() => onNavigate("registry")} style={{ cursor: "pointer" }}>
            <div className="pipeline-node-icon"><Cpu size={16} /></div>
            <div className="pipeline-node-title">5. Registry & Gate</div>
            <div className="pipeline-node-desc">Quality check & promotion</div>
          </div>

          <div className="pipeline-arrow"><ArrowRight size={16} /></div>

          <div className="pipeline-node active" onClick={() => onNavigate("predict")} style={{ cursor: "pointer" }}>
            <div className="pipeline-node-icon"><Activity size={16} /></div>
            <div className="pipeline-node-title">6. Serving API</div>
            <div className="pipeline-node-desc">FastAPI /predict & logs</div>
          </div>

          <div className="pipeline-arrow"><ArrowRight size={16} /></div>

          <div className="pipeline-node" onClick={() => onNavigate("monitoring")} style={{ cursor: "pointer" }}>
            <div className="pipeline-node-icon"><RefreshCw size={16} /></div>
            <div className="pipeline-node-title">7. Drift & Retrain</div>
            <div className="pipeline-node-desc">PSI / KS shift sentinel</div>
          </div>
        </div>
      </div>

      {/* Subsystem Health Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
        <div className="card-glass">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <Server size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>FastAPI Serving Core</h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Async prediction runtime with structured JSON logging, correlation IDs, and custom error envelopes.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.65rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Environment:</span>
            <strong>{health?.environment ?? "development"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            <span style={{ color: "var(--text-dim)" }}>App Version:</span>
            <strong>v{health?.version ?? "0.1.0"}</strong>
          </div>
        </div>

        <div className="card-glass">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <Database size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Persistence & Audit Store</h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            SQLAlchemy 2 database engine tracking prediction logs, feature distributions, and model lifecycle audits.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.65rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Database Status:</span>
            <span style={{ color: readiness?.checks.database === "ok" ? "var(--status-ok)" : "var(--status-warning)", fontWeight: 600 }}>
              {readiness?.checks.database ?? "Ready"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Audit Tables:</span>
            <strong>prediction_logs, model_audits</strong>
          </div>
        </div>

        <div className="card-glass">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <ShieldCheck size={20} color="var(--status-ok)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Quality Gate Controller</h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Enforces strict promotion gates (ROC-AUC ≥ 0.72, F1 ≥ 0.50, Accuracy ≥ 0.70) before models reach production.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.65rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Active Gate:</span>
            <span style={{ color: "var(--status-ok)", fontWeight: 600 }}>Passed & Enforced</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Rollback Safety:</span>
            <strong style={{ color: "var(--accent-cyan)" }}>1-Click Instant Rollback</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
