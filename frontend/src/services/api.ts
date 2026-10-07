import type { HealthResponse, ReadinessResponse } from "../types/health";
import type {
  BatchPredictionResponse,
  CustomerFeatures,
  DataValidationResponse,
  DatasetSummaryResponse,
  DriftReportResponse,
  ModelRecord,
  MonitoringOverview,
  PredictionLogItem,
  PredictionResponse,
  RegistryResponse,
  RetrainResponse,
} from "../types/mlops";

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Cannot reach the ModelOps backend service. Is the backend running on port 8000?");
  }

  if (path === "/ready" && (response.ok || response.status === 503)) {
    return (await response.json()) as T;
  }

  if (!response.ok) {
    let errorDetail = `Request failed (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // fallback to status code
    }
    throw new ApiError(errorDetail, response.status);
  }

  return (await response.json()) as T;
}

// System probes
export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function getReadiness(): Promise<ReadinessResponse> {
  return request<ReadinessResponse>("/ready");
}

// Prediction
export async function predictSingle(payload: CustomerFeatures): Promise<PredictionResponse> {
  return request<PredictionResponse>("/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function predictBatch(customers: CustomerFeatures[]): Promise<BatchPredictionResponse> {
  return request<BatchPredictionResponse>("/predict/batch", {
    method: "POST",
    body: JSON.stringify({ customers }),
  });
}

export async function getPredictionLogs(limit = 50): Promise<PredictionLogItem[]> {
  return request<PredictionLogItem[]>(`/predictions/logs?limit=${limit}`);
}

export async function recordFeedback(logId: number, actualChurn: number): Promise<{ status: string; correct: boolean }> {
  return request<{ status: string; correct: boolean }>(`/predictions/${logId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ actual_churn: actualChurn }),
  });
}

// Models & Registry
export async function getModelRegistry(): Promise<RegistryResponse> {
  return request<RegistryResponse>("/models");
}

export async function getActiveModel(): Promise<ModelRecord> {
  return request<ModelRecord>("/models/active");
}

export async function trainModel(
  algorithm: string,
  parameters: Record<string, unknown> = {},
  notes = "",
): Promise<ModelRecord> {
  return request<ModelRecord>("/models/train", {
    method: "POST",
    body: JSON.stringify({ algorithm, parameters, notes }),
  });
}

export async function promoteModel(
  version: string,
  force = false,
): Promise<{ status: string; version: string; previous_version?: string }> {
  return request<{ status: string; version: string; previous_version?: string }>(`/models/${version}/promote`, {
    method: "POST",
    body: JSON.stringify({ force }),
  });
}

export async function rollbackModel(
  targetVersion?: string,
): Promise<{ status: string; active_version: string; reverted_from?: string }> {
  return request<{ status: string; active_version: string; reverted_from?: string }>("/models/rollback", {
    method: "POST",
    body: JSON.stringify({ target_version: targetVersion }),
  });
}

// Monitoring & Drift
export async function getMonitoringOverview(): Promise<MonitoringOverview> {
  return request<MonitoringOverview>("/monitoring/overview");
}

export async function getDriftReport(psiThreshold = 0.20): Promise<DriftReportResponse> {
  return request<DriftReportResponse>(`/monitoring/drift?psi_threshold=${psiThreshold}`);
}

export async function triggerRetraining(
  algorithm = "GradientBoosting",
  reason = "Drift alert threshold exceeded",
  autoPromote = true,
): Promise<RetrainResponse> {
  return request<RetrainResponse>("/monitoring/retrain", {
    method: "POST",
    body: JSON.stringify({ algorithm, reason, auto_promote: autoPromote }),
  });
}

// Dataset & Validation
export async function getDatasetSummary(): Promise<DatasetSummaryResponse> {
  return request<DatasetSummaryResponse>("/dataset/summary");
}

export async function getDatasetValidation(): Promise<DataValidationResponse> {
  return request<DataValidationResponse>("/dataset/validate");
}

export async function regenerateDataset(): Promise<{ status: string; rows: number }> {
  return request<{ status: string; rows: number }>("/dataset/generate", {
    method: "POST",
  });
}
