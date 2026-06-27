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
  schema_version: SupportedSchemaVersion;
  capabilities: {
    sessions: true;
    run_view: true;
    artifact_detail: true;
    refresh: "request";
  };
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
  artifacts: DashboardArtifactRow[];
  artifact_details: Record<string, DashboardArtifactDetail>;
  task_groups: DashboardTaskGroup[];
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
