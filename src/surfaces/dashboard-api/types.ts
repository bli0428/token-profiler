import type {
  AnalysisCaveat,
  AnalyzerAvailability,
  PreviewState,
  ToolCallLink
} from "../../analysis/types.ts";

export const DASHBOARD_API_SCHEMA_VERSION = 1 as const;

export type DashboardApiCaveat = AnalysisCaveat;

export type DashboardApiEnvelope<T> = {
  schema_version: typeof DASHBOARD_API_SCHEMA_VERSION;
  generated_at: string;
  data: T;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiErrorCode =
  | "not_found"
  | "run_unreadable"
  | "artifact_not_found"
  | "invalid_request"
  | "internal_error";

export type DashboardApiError = {
  schema_version: typeof DASHBOARD_API_SCHEMA_VERSION;
  generated_at: string;
  error: DashboardApiErrorCode;
  message: string;
  status: number;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiStatus = {
  service: "token-profiler-dashboard-api";
  ready: boolean;
  read_only: true;
  local_only: true;
  data_root_label: string;
  schema_version: typeof DASHBOARD_API_SCHEMA_VERSION;
  capabilities: {
    sessions: true;
    run_view: true;
    artifact_detail: true;
    refresh: "request";
  };
};

export type DashboardApiSession = {
  run_id: string;
  canonical_run_id?: string | undefined;
  label?: string | undefined;
  updated_at?: string | undefined;
  request_count?: number | undefined;
  artifact_count?: number | undefined;
  input_tokens?: number | undefined;
  cached_input_tokens?: number | undefined;
  uncached_input_tokens?: number | undefined;
  output_tokens?: number | undefined;
  availability: AnalyzerAvailability;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiRun = {
  run_id: string;
  canonical_run_id?: string | undefined;
  overview: DashboardApiRunOverview;
  artifacts: DashboardApiArtifactRow[];
  artifact_details: Record<string, DashboardApiArtifactDetail>;
  task_groups: DashboardApiTaskGroup[];
  filters: DashboardApiFilterOptions;
  privacy: DashboardApiPrivacyState;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiPrivacyState = {
  storage_mode: string;
  raw_content_available: boolean;
  raw_content_revealed: boolean;
  preview_fields: string[];
  hidden_fields: string[];
  unavailable_fields: string[];
  caveats: DashboardApiCaveat[];
};

export type DashboardApiRunOverview = {
  scope: "run" | "task_group";
  scope_id?: string | undefined;
  scope_label: string;
  request_count: number;
  artifact_count: number;
  input_tokens?: number | undefined;
  cached_input_tokens?: number | undefined;
  uncached_input_tokens?: number | undefined;
  output_tokens?: number | undefined;
  total_exposure: number;
  repeated_exposure: number;
  replay_ratio?: number | undefined;
  context_efficiency?: number | undefined;
  attribution_coverage?: number | "partial" | "unavailable" | undefined;
  availability: AnalyzerAvailability;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiArtifactRow = {
  artifact_id: string;
  stable_short_id: string;
  display_name: string;
  display_category: string;
  summary?: string | undefined;
  task_group_ids: string[];
  total_exposure: number;
  repeated_exposure: number;
  inclusion_count: number;
  estimated_cached_input_tokens?: number | undefined;
  estimated_uncached_input_tokens?: number | undefined;
  attribution_state?: string | undefined;
  preview_state: PreviewState;
  detail_available: boolean;
  search_text: string;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiMetadataSection = {
  title: string;
  rows: Array<{
    label: string;
    value: string;
    visibility: "visible" | "hidden" | "unavailable";
  }>;
};

export type DashboardApiArtifactDetail = {
  artifact_id: string;
  title: string;
  identity: {
    artifact_name?: string | undefined;
    stable_short_id: string;
    display_category: string;
    request_ids: string[];
  };
  metrics: Record<string, number | string | boolean | undefined>;
  metadata_sections: DashboardApiMetadataSection[];
  tool_links: ToolCallLink[];
  task_group_ids: string[];
  privacy: DashboardApiPrivacyState;
  content?: {
    preview?: string | undefined;
    raw?: string | undefined;
    raw_reveal_required: boolean;
  };
  caveats: DashboardApiCaveat[];
};

export type DashboardApiTaskGroup = {
  task_group_id: string;
  display_name: string;
  label_source: string;
  confidence: "complete" | "partial" | "heuristic";
  request_count: number;
  artifact_count: number;
  request_ids: string[];
  artifact_ids: string[];
  top_artifact_ids: string[];
  metrics: {
    input_tokens?: number | undefined;
    cached_input_tokens?: number | undefined;
    uncached_input_tokens?: number | undefined;
    output_tokens?: number | undefined;
    total_exposure: number;
    repeated_exposure: number;
  };
  privacy: DashboardApiPrivacyState;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiFilterOptions = {
  categories: string[];
  task_groups: Array<{ task_group_id: string; display_name: string }>;
  default_sort: "estimated_uncached" | "total_exposure" | "repeated_exposure" | "inclusion_count";
  searchable_fields: string[];
};

export type DashboardApiResponse =
  | { status: number; body: DashboardApiEnvelope<unknown> | DashboardApiError; headers?: Record<string, string> };
