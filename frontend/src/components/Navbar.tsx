import React from "react";
import { Activity, Cpu, Database, RefreshCw } from "lucide-react";
import type { HealthResponse, ReadinessResponse } from "../types/health";

interface NavbarProps {
  health: HealthResponse | null;
  readiness: ReadinessResponse | null;
  activeModelVersion: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  readiness,
  activeModelVersion,
  isRefreshing,
  onRefresh,
}) => {
  const isHealthy = health?.status === "ok";
  const isReady = readiness?.status === "ready";

  return (
    <header className="header-glass">
      <div className="brand-wrapper">
        <div className="brand-icon-box">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="brand-title">ModelOps AI</h1>
          <p className="brand-subtitle">Automated Machine Learning Lifecycle & Production Governance</p>
        </div>
      </div>

      <div className="header-status-group">
        {activeModelVersion && (
          <div className="badge-pill ok">
            <Cpu size={14} />
            <span>Active Model: <strong>{activeModelVersion}</strong></span>
          </div>
        )}

        <div className={`badge-pill ${isReady ? "ok" : "warning"}`}>
          <Database size={14} />
          <span>DB: {readiness?.checks.database ?? "connecting"}</span>
        </div>

        <div className={`badge-pill ${isHealthy ? "ok" : "danger"}`}>
          <span className="pulse-dot" />
          <span>API: {health?.status ?? "offline"}</span>
        </div>

        <button
          className="btn-secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
          title="Refresh platform telemetry"
        >
          <RefreshCw size={14} className={isRefreshing ? "spin-icon" : ""} />
          <span>{isRefreshing ? "Syncing..." : "Sync"}</span>
        </button>
      </div>
    </header>
  );
};
