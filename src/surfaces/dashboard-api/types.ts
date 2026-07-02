import type {
  AnalysisCaveat,
  AnalyzerAvailability,
  ProviderRequestUsage,
  RequestCacheAttributionSummary,
  RequestUsageAvailability,
  PreviewState,
  TurnConfidence,
  TurnGroupingSource,
  TurnRequestTitleSource,
  TurnTitleSource,
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
  current_proxy: DashboardApiCurrentProxy;
  schema_version: typeof DASHBOARD_API_SCHEMA_VERSION;
  capabilities: {
    sessions: true;
    run_view: true;
    artifact_detail: true;
    request_accounting: true;
    refresh: "request";
  };
};

export type DashboardApiCurrentProxy =
  | {
    status: "running";
    host: string;
    port: number;
    capture_mode: string;
  }
  | {
    status: "not_running" | "unknown";
    capture_mode?: string | undefined;
  };

export type DashboardApiSessionIdentityMapping = {
  route_run_id: string;
  canonical_run_id?: string | undefined;
  codex_session_id?: string | undefined;
  codex_conversation_id?: string | undefined;
  codex_label?: string | undefined;
  mapping_confidence: "one_to_one" | "probable" | "best_effort" | "unknown";
  mapping_source: "direct_session_id" | "cache_key" | "wrapper_header" | "rollout_time_index" | "fallback_fingerprint" | "unavailable";
  limitations: string[];
};

export type DashboardApiSession = {
  run_id: string;
  canonical_run_id?: string | undefined;
  label?: string | undefined;
  identity: DashboardApiSessionIdentityMapping;
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
  requests: DashboardApiRequestAccounting;
  artifacts: DashboardApiArtifactRow[];
  artifact_details: Record<string, DashboardApiArtifactDetail>;
  task_groups: DashboardApiTaskGroup[];
  turns: DashboardApiTurnGroup[];
  filters: DashboardApiFilterOptions;
  privacy: DashboardApiPrivacyState;
  caveats: DashboardApiCaveat[];
};

export type DashboardApiRequestAccounting = {
  availability: AnalyzerAvailability;
  summary: {
    request_count: number;
    usage_reported_count: number;
    usage_incomplete_count: number;
    artifact_inclusion_count: number;
    highest_total_request_id?: string | undefined;
    highest_uncached_request_id?: string | undefined;
  };
  rows: DashboardApiRequestAccountingRow[];
  caveats: DashboardApiCaveat[];
};

export type DashboardApiRequestAccountingRow = {
  request_id: string;
  timestamp?: string | undefined;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage | undefined;
  artifact_count: number;
  total_local_artifact_tokens: number;
  cache_attribution?: RequestCacheAttributionSummary | undefined;
  artifact_inclusions: DashboardApiRequestArtifactInclusion[];
  caveats: DashboardApiCaveat[];
};

export type DashboardApiRequestArtifactInclusion = {
  artifact_id: string;
  stable_short_id: string;
  artifact_type: string;
  display_name: string;
  display_category: string;
  request_order: number;
  local_token_count: number;
  token_start?: number | undefined;
  token_end?: number | undefined;
  normalized_estimated_input_tokens?: number | undefined;
  estimated_cached_input_tokens?: number | undefined;
  estimated_uncached_input_tokens?: number | undefined;
  attribution_state: "complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated";
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
  unique_exposure: number;
  repeated_exposure: number;
  inclusion_count: number;
  normalized_estimated_input_tokens?: number | undefined;
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

export type DashboardApiTurnRequest = {
  request_id: string;
  timestamp?: string | undefined;
  display_title: string;
  title_source: TurnRequestTitleSource;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage | undefined;
  artifact_inclusions: DashboardApiRequestArtifactInclusion[];
  caveats: DashboardApiCaveat[];
};

export type DashboardApiTurnGroup = {
  turn_id: string;
  display_title: string;
  title_source: TurnTitleSource;
  grouping_source: TurnGroupingSource;
  confidence: TurnConfidence;
  request_ids: string[];
  artifact_ids: string[];
  requests: DashboardApiTurnRequest[];
  metrics: {
    input_tokens?: number | undefined;
    cached_input_tokens?: number | undefined;
    uncached_input_tokens?: number | undefined;
    output_tokens?: number | undefined;
    total_tokens?: number | undefined;
    total_local_artifact_tokens: number;
    artifact_count: number;
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
  | {
    status: number;
    body: DashboardApiEnvelope<unknown> | DashboardApiError | string | Buffer;
    headers?: Record<string, string>;
    raw?: boolean;
  };
