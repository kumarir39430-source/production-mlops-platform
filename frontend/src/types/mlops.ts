export interface CustomerFeatures {
  gender: "Male" | "Female";
  senior_citizen: number;
  partner: "Yes" | "No";
  dependents: "Yes" | "No";
  tenure: number;
  phone_service: "Yes" | "No";
  multiple_lines: "No" | "Yes" | "No phone service";
  internet_service: "DSL" | "Fiber optic" | "No";
  online_security: "Yes" | "No" | "No internet service";
  online_backup: "Yes" | "No" | "No internet service";
  device_protection: "Yes" | "No" | "No internet service";
  tech_support: "Yes" | "No" | "No internet service";
  streaming_tv: "Yes" | "No" | "No internet service";
  streaming_movies: "Yes" | "No" | "No internet service";
  contract: "Month-to-month" | "One year" | "Two year";
  paperless_billing: "Yes" | "No";
  payment_method:
    | "Electronic check"
    | "Mailed check"
    | "Bank transfer (automatic)"
    | "Credit card (automatic)";
  monthly_charges: number;
  total_charges: number;
}

export interface PredictionExplanation {
  feature: string;
  feature_value: string | number;
  impact: "increases_churn" | "reduces_churn" | "neutral";
  description: string;
}

export interface PredictionResponse {
  prediction: number;
  churn_label: string;
  churn_probability: number;
  risk_level: "Low" | "Medium" | "High";
  model_version: string;
  algorithm: string;
  latency_ms: number;
  top_risk_factors: PredictionExplanation[];
  request_id: string;
}

export interface BatchPredictionResponse {
  predictions: PredictionResponse[];
  total_processed: number;
  predicted_churn_count: number;
  overall_churn_rate: number;
  model_version: string;
}

export interface PredictionLogItem {
  id: number;
  request_id: string;
  model_version: string;
  prediction: number;
  probability: number;
  risk_level: string;
  latency_ms: number;
  input_features: Record<string, unknown>;
  actual_churn?: number | null;
  created_at: string;
}

export interface QualityGateCheck {
  criterion: string;
  passed: boolean;
  actual: number;
  threshold: number;
}

export interface ModelRecord {
  version: string;
  algorithm: string;
  stage: "Candidate" | "Validated" | "Approved" | "Production" | "Archived" | "Rejected";
  artifact_path: string;
  metrics: {
    accuracy: number;
    roc_auc: number;
    f1: number;
    precision: number;
    recall: number;
  };
  parameters: Record<string, unknown>;
  feature_names: string[];
  confusion_matrix: number[][];
  created_at: string;
  promoted_at?: string | null;
  notes: string;
  quality_gate_passed: boolean;
}

export interface RegistryResponse {
  active_production_version: string | null;
  models: ModelRecord[];
}

export interface FeatureDriftDetail {
  feature: string;
  type: "numeric" | "categorical";
  psi: number;
  ks_statistic?: number | null;
  p_value?: number | null;
  drift_detected: boolean;
  severity: "low" | "moderate" | "high";
  ref_mean?: number | null;
  current_mean?: number | null;
  ref_distribution?: Record<string, number> | null;
  current_distribution?: Record<string, number> | null;
}

export interface DriftReportResponse {
  status: "healthy" | "warning" | "critical";
  drift_detected: boolean;
  retraining_recommended: boolean;
  total_features: number;
  drifted_features_count: number;
  reference_sample_size: number;
  current_sample_size: number;
  features: FeatureDriftDetail[];
}

export interface RetrainResponse {
  status: string;
  retrained_version: string;
  previous_active_version: string;
  algorithm: string;
  metrics: {
    accuracy: number;
    roc_auc: number;
    f1: number;
    precision: number;
    recall: number;
  };
  promoted_to_production: boolean;
  gate_evaluation?: {
    passed: boolean;
    checks: QualityGateCheck[];
  } | null;
  reason: string;
}

export interface MonitoringOverview {
  total_predictions: number;
  avg_latency_ms: number;
  recent_churn_rate: number;
  high_risk_percentage: number;
  active_model_version: string | null;
  drift_status: string;
  last_drift_check?: string | null;
}

export interface DataCheckItem {
  rule: string;
  description: string;
  passed: boolean;
  detail: string;
}

export interface DataValidationResponse {
  status: "passed" | "failed";
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  row_count: number;
  checks: DataCheckItem[];
  anomalies: string[];
}

export interface DatasetSummaryResponse {
  total_rows: number;
  total_columns: number;
  churn_rate: number;
  class_balance: {
    retained: number;
    churned: number;
  };
  numerical_stats: {
    tenure: { mean: number; min: number; max: number };
    monthly_charges: { mean: number; min: number; max: number };
    total_charges: { mean: number; min: number; max: number };
  };
  contract_breakdown: Record<string, number>;
  internet_breakdown: Record<string, number>;
  sample_records: Record<string, unknown>[];
}
