export type SupportedSchemaVersion = 1;

export type ApiEnvelope<T> = {
  schema_version: SupportedSchemaVersion;
  generated_at: string;
  data: T;
  caveats: DashboardCaveat[];
};

export type DashboardCaveat = {
  code: string;
  message: string;
  severity: "info" | "warning";
  applies_to?: {
    analyzer_id?: string;
    request_id?: string;
    artifact_id?: string;
  };
};

export type PrivacyState =
  | "hidden"
  | "unavailable"
  | "preview"
  | "raw_available";

export type AvailabilityStatus = "complete" | "partial" | "unavailable" | "not_applicable";

export type AvailabilityState = {
  status: AvailabilityStatus;
  reason?: string;
  missing_facts?: string[];
  limitations?: string[];
};

export type DashboardPrivacyState = {
  storage_mode: string;
  raw_content_available: boolean;
  raw_content_revealed: boolean;
  preview_fields: string[];
  hidden_fields: string[];
  unavailable_fields: string[];
  caveats: DashboardCaveat[];
};

export type DashboardStatus = {
  service: "token-profiler-dashboard-api";
  ready: boolean;
  read_only: true;
  local_only: true;
  data_root_label: string;
  current_proxy?: DashboardCurrentProxy;
  schema_version: SupportedSchemaVersion;
  capabilities: {
    sessions: true;
    run_view: true;
    artifact_detail: true;
    request_accounting: true;
    refresh: "request";
  };
};

export type DashboardCurrentProxy =
  | {
    status: "running";
    host: string;
    port: number;
    capture_mode: string;
  }
  | {
    status: "not_running" | "unknown";
    capture_mode?: string;
  };

export type DashboardMetricSet = {
  total_exposure?: number;
  repeated_exposure?: number;
  inclusion_count?: number;
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
};

export type DashboardSession = {
  run_id: string;
  canonical_run_id?: string;
  label?: string;
  identity: DashboardSessionIdentityMapping;
  updated_at?: string;
  request_count?: number;
  artifact_count?: number;
  input_tokens?: number;
  cached_input_tokens?: number;
  uncached_input_tokens?: number;
  output_tokens?: number;
  availability: AvailabilityState;
  caveats: DashboardCaveat[];
};

export type DashboardSessionIdentityMapping = {
  route_run_id: string;
  canonical_run_id?: string;
  codex_session_id?: string;
  codex_conversation_id?: string;
  codex_label?: string;
  mapping_confidence: "one_to_one" | "probable" | "best_effort" | "unknown";
  mapping_source: "direct_session_id" | "cache_key" | "wrapper_header" | "rollout_time_index" | "fallback_fingerprint" | "unavailable";
  limitations: string[];
};

export type RequestUsageAvailability = {
  status: "complete" | "partial" | "unavailable";
  usage_status: "reported" | "missing" | "incomplete";
  attribution_status: "complete" | "partial" | "unavailable" | "not_applicable";
  missing_facts: string[];
  limitations: string[];
  reason?: string;
};

export type ProviderRequestUsage = {
  input_tokens: number;
  cached_input_tokens: number;
  uncached_input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number;
  total_tokens: number;
  response_id?: string;
  source: "provider_reported";
};

export type RequestCacheAttributionSummary = {
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
  normalized_estimated_input_tokens?: number;
  estimated_cache_hit_ratio?: number;
  attribution_coverage?: number | "partial" | "unavailable";
  attribution_state: "complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated";
};

export type DashboardRequestArtifactInclusion = {
  artifact_id: string;
  stable_short_id: string;
  artifact_type: string;
  display_name: string;
  display_category: string;
  request_order: number;
  local_token_count: number;
  token_start?: number;
  token_end?: number;
  normalized_estimated_input_tokens?: number;
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
  attribution_state: "complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated";
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};

export type DashboardRequestAccountingRow = {
  request_id: string;
  timestamp?: string;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage;
  artifact_count: number;
  total_local_artifact_tokens: number;
  cache_attribution?: RequestCacheAttributionSummary;
  artifact_inclusions: DashboardRequestArtifactInclusion[];
  caveats: DashboardCaveat[];
};

export type DashboardRequestAccounting = {
  availability: AvailabilityState;
  summary: {
    request_count: number;
    usage_reported_count: number;
    usage_incomplete_count: number;
    artifact_inclusion_count: number;
    highest_total_request_id?: string;
    highest_uncached_request_id?: string;
  };
  rows: DashboardRequestAccountingRow[];
  caveats: DashboardCaveat[];
};

export type TurnTitleSource = "user_preview" | "safe_summary" | "fallback" | "turn_id";
export type TurnGroupingSource = "direct_turn_id" | "missing_turn_id" | "fallback";
export type TurnConfidence = "complete" | "partial" | "fallback";
export type TurnRequestTitleSource = "assistant_preview" | "action_label" | "turn_title" | "request_id";

export type DashboardTurnRequest = {
  request_id: string;
  timestamp?: string;
  display_title: string;
  title_source: TurnRequestTitleSource;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage;
  artifact_inclusions: DashboardRequestArtifactInclusion[];
  caveats: DashboardCaveat[];
};

export type DashboardTurnGroup = {
  turn_id: string;
  display_title: string;
  title_source: TurnTitleSource;
  grouping_source: TurnGroupingSource;
  confidence: TurnConfidence;
  request_ids: string[];
  artifact_ids: string[];
  requests: DashboardTurnRequest[];
  metrics: {
    input_tokens?: number;
    cached_input_tokens?: number;
    uncached_input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    total_local_artifact_tokens: number;
    artifact_count: number;
  };
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};

export type DashboardSessionsData = {
  sessions: DashboardSession[];
};

export type DashboardRunOverview = {
  scope: "run" | "task_group";
  scope_id?: string;
  scope_label: string;
  request_count: number;
  artifact_count: number;
  input_tokens?: number;
  cached_input_tokens?: number;
  uncached_input_tokens?: number;
  output_tokens?: number;
  total_exposure: number;
  repeated_exposure: number;
  replay_ratio?: number;
  context_efficiency?: number;
  attribution_coverage?: number | "partial" | "unavailable";
  availability: AvailabilityState;
  caveats: DashboardCaveat[];
};

export type DashboardTaskGroup = {
  task_group_id: string;
  display_name: string;
  label_source: string;
  confidence: "complete" | "partial" | "heuristic";
  request_count: number;
  artifact_count: number;
  request_ids: string[];
  artifact_ids: string[];
  top_artifact_ids: string[];
  metrics: DashboardMetricSet & { input_tokens?: number; output_tokens?: number };
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};

export type DashboardArtifactRow = {
  artifact_id: string;
  stable_short_id: string;
  display_name: string;
  display_category: string;
  summary?: string;
  task_group_ids: string[];
  total_exposure: number;
  repeated_exposure: number;
  inclusion_count: number;
  normalized_estimated_input_tokens?: number;
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
  attribution_state?: string;
  preview_state: PrivacyState;
  detail_available: boolean;
  search_text: string;
  caveats: DashboardCaveat[];
};

export type DashboardFilterOptions = {
  categories: string[];
  task_groups: Array<{ task_group_id: string; display_name: string }>;
  default_sort: "estimated_uncached" | "total_exposure" | "repeated_exposure" | "inclusion_count";
  searchable_fields: string[];
};

export type DashboardRun = {
  run_id: string;
  canonical_run_id?: string;
  overview: DashboardRunOverview;
  requests: DashboardRequestAccounting;
  artifacts: DashboardArtifactRow[];
  artifact_details: Record<string, DashboardArtifactDetail>;
  task_groups: DashboardTaskGroup[];
  turns: DashboardTurnGroup[];
  filters: DashboardFilterOptions;
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};

export type MetadataSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export type DashboardArtifactDetail = {
  artifact_id: string;
  title: string;
  identity: {
    artifact_name?: string;
    stable_short_id: string;
    display_category: string;
    request_ids: string[];
  };
  metrics: Record<string, number | string | boolean | undefined>;
  metadata_sections: MetadataSection[];
  tool_links: Array<{
    link_id: string;
    tool_name?: string;
    call_id?: string;
    output_artifact_ids: string[];
    match_state: string;
    confidence: string;
    evidence: string[];
    caveats: DashboardCaveat[];
  }>;
  task_group_ids: string[];
  privacy: DashboardPrivacyState;
  content?: {
    preview?: string;
    raw?: string;
    raw_reveal_required: boolean;
  };
  caveats: DashboardCaveat[];
};

export type StatusResponse = ApiEnvelope<DashboardStatus>;
export type SessionsResponse = ApiEnvelope<DashboardSessionsData>;
export type RunResponse = ApiEnvelope<DashboardRun>;
export type ArtifactDetailResponse = ApiEnvelope<DashboardArtifactDetail>;

export type DashboardApiErrorBody = {
  schema_version?: SupportedSchemaVersion;
  generated_at?: string;
  error: string;
  message: string;
  status?: number;
  caveats?: DashboardCaveat[];
};
