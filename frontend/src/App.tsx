import { useEffect, useState } from "react";
import {
  BarChart3,
  Cpu,
  Database,
  Layers,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { DataTab } from "./components/DataTab";
import { ExperimentsTab } from "./components/ExperimentsTab";
import { LogsTab } from "./components/LogsTab";
import { MonitoringTab } from "./components/MonitoringTab";
import { Navbar } from "./components/Navbar";
import { OverviewTab } from "./components/OverviewTab";
import { PredictorTab } from "./components/PredictorTab";
import { RegistryTab } from "./components/RegistryTab";
import {
  getHealth,
  getModelRegistry,
  getMonitoringOverview,
  getReadiness,
} from "./services/api";
import type { HealthResponse, ReadinessResponse } from "./types/health";
import type { ModelRecord, MonitoringOverview, RegistryResponse } from "./types/mlops";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringOverview | null>(null);
  const [registry, setRegistry] = useState<RegistryResponse | null>(null);
  const [activeModel, setActiveModel] = useState<ModelRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTelemetry = async () => {
    setIsRefreshing(true);
    try {
      const [h, r, m, reg] = await Promise.allSettled([
        getHealth(),
        getReadiness(),
        getMonitoringOverview(),
        getModelRegistry(),
      ]);

      if (h.status === "fulfilled") setHealth(h.value);
      if (r.status === "fulfilled") setReadiness(r.value);
      if (m.status === "fulfilled") setMonitoring(m.value);
      if (reg.status === "fulfilled") {
        setRegistry(reg.value);
        const active = reg.value.models.find(
          (model) => model.version === reg.value.active_production_version
        );
        if (active) setActiveModel(active);
      }
    } catch {
      // handled via allSettled
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        health={health}
        readiness={readiness}
        activeModelVersion={registry?.active_production_version ?? null}
        isRefreshing={isRefreshing}
        onRefresh={fetchTelemetry}
      />

      {/* Tabs Navigation */}
      <nav className="tabs-nav" aria-label="Platform navigation">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Layers size={16} />
          <span>Overview & Architecture</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "predict" ? "active" : ""}`}
          onClick={() => setActiveTab("predict")}
        >
          <Zap size={16} />
          <span>Live Churn Predictor</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "registry" ? "active" : ""}`}
          onClick={() => setActiveTab("registry")}
        >
          <Cpu size={16} />
          <span>Model Registry & Governance</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "experiments" ? "active" : ""}`}
          onClick={() => setActiveTab("experiments")}
        >
          <BarChart3 size={16} />
          <span>Experiments & Training</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "monitoring" ? "active" : ""}`}
          onClick={() => setActiveTab("monitoring")}
        >
          <TrendingUp size={16} />
          <span>Drift Sentinel & Retraining</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <Database size={16} />
          <span>Inference Logs & Feedback</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "data" ? "active" : ""}`}
          onClick={() => setActiveTab("data")}
        >
          <ShieldCheck size={16} />
          <span>Data Quality & Schema</span>
        </button>
      </nav>

      {/* Tab Panels */}
      <main>
        {activeTab === "overview" && (
          <OverviewTab
            health={health}
            readiness={readiness}
            monitoring={monitoring}
            activeModel={activeModel}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "predict" && <PredictorTab />}

        {activeTab === "registry" && (
          <RegistryTab
            registry={registry}
            onRefresh={fetchTelemetry}
          />
        )}

        {activeTab === "experiments" && (
          <ExperimentsTab
            registry={registry}
            onRefresh={fetchTelemetry}
          />
        )}

        {activeTab === "monitoring" && (
          <MonitoringTab
            onRefresh={fetchTelemetry}
          />
        )}

        {activeTab === "logs" && <LogsTab />}

        {activeTab === "data" && <DataTab />}
      </main>
    </div>
  );
}
