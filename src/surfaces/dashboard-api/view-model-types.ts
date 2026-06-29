import type {
  AnalysisCaveat,
  AnalyzerAvailability,
  ProviderRequestUsage,
  RequestCacheAttributionSummary,
  RequestUsageAvailability,
  SessionIdentityMapping,
  PreviewState,
  TurnConfidence,
  TurnGroupingSource,
  TurnRequestTitleSource,
  TurnTitleSource,
  ToolCallLink
} from "../../analysis/types.ts";

export type DashboardViewCaveat = AnalysisCaveat;

export type DashboardViewSession = {
  run_id: string;
  run_dir: string;
  label?: string;
  identity: SessionIdentityMapping;
  updated_at?: string | undefined;
  request_count?: number | undefined;
  artifact_count?: number | undefined;
  input_tokens?: number | undefined;
  cached_input_tokens?: number | undefined;
  uncached_input_tokens?: number | undefined;
  output_tokens?: number | undefined;
  availability: AnalyzerAvailability;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewRequestAccounting = {
  availability: AnalyzerAvailability;
  summary: {
    request_count: number;
    usage_reported_count: number;
    usage_incomplete_count: number;
    artifact_inclusion_count: number;
    highest_total_request_id?: string | undefined;
    highest_uncached_request_id?: string | undefined;
  };
  rows: DashboardViewRequestAccountingRow[];
  caveats: DashboardViewCaveat[];
};

export type DashboardViewRequestAccountingRow = {
  request_id: string;
  timestamp?: string | undefined;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage | undefined;
  artifact_count: number;
  total_local_artifact_tokens: number;
  cache_attribution?: RequestCacheAttributionSummary | undefined;
  artifact_inclusions: DashboardViewRequestArtifactInclusion[];
  caveats: DashboardViewCaveat[];
};

export type DashboardViewRequestArtifactInclusion = {
  artifact_id: string;
  stable_short_id: string;
  artifact_type: string;
  display_name: string;
  display_category: string;
  request_order: number;
  local_token_count: number;
  token_start?: number | undefined;
  token_end?: number | undefined;
  estimated_cached_input_tokens?: number | undefined;
  estimated_uncached_input_tokens?: number | undefined;
  attribution_state: "complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated";
  privacy: DashboardViewPrivacyState;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewPrivacyState = {
  storage_mode: string;
  raw_content_available: boolean;
  raw_content_revealed: boolean;
  preview_fields: string[];
  hidden_fields: string[];
  unavailable_fields: string[];
  caveats: DashboardViewCaveat[];
};

export type DashboardViewRunOverview = {
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
  caveats: DashboardViewCaveat[];
};

export type DashboardViewArtifactRow = {
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
  caveats: DashboardViewCaveat[];
};

export type DashboardViewMetadataSection = {
  title: string;
  rows: Array<{
    label: string;
    value: string;
    visibility: "visible" | "hidden" | "unavailable";
  }>;
};

export type DashboardViewArtifactDetail = {
  artifact_id: string;
  title: string;
  identity: {
    artifact_name?: string | undefined;
    stable_short_id: string;
    display_category: string;
    request_ids: string[];
  };
  metrics: Record<string, number | string | boolean | undefined>;
  metadata_sections: DashboardViewMetadataSection[];
  tool_links: ToolCallLink[];
  task_group_ids: string[];
  privacy: DashboardViewPrivacyState;
  content?: {
    preview?: string | undefined;
    raw?: string | undefined;
    raw_reveal_required: boolean;
  };
  caveats: DashboardViewCaveat[];
};

export type DashboardViewTaskGroup = {
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
  privacy: DashboardViewPrivacyState;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewTurnRequest = {
  request_id: string;
  display_title: string;
  title_source: TurnRequestTitleSource;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage | undefined;
  artifact_inclusions: DashboardViewRequestArtifactInclusion[];
  caveats: DashboardViewCaveat[];
};

export type DashboardViewTurnGroup = {
  turn_id: string;
  display_title: string;
  title_source: TurnTitleSource;
  grouping_source: TurnGroupingSource;
  confidence: TurnConfidence;
  request_ids: string[];
  artifact_ids: string[];
  requests: DashboardViewTurnRequest[];
  metrics: {
    input_tokens?: number | undefined;
    cached_input_tokens?: number | undefined;
    uncached_input_tokens?: number | undefined;
    output_tokens?: number | undefined;
    total_tokens?: number | undefined;
    total_local_artifact_tokens: number;
    artifact_count: number;
  };
  privacy: DashboardViewPrivacyState;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewFilterOptions = {
  categories: string[];
  task_groups: Array<{ task_group_id: string; display_name: string }>;
  default_sort: "estimated_uncached" | "total_exposure" | "repeated_exposure" | "inclusion_count";
  searchable_fields: string[];
};

export type DashboardViewModel = {
  schema_version: 1;
  run_id?: string | undefined;
  generated_at: string;
  session?: DashboardViewSession;
  overview: DashboardViewRunOverview;
  requests: DashboardViewRequestAccounting;
  artifacts: DashboardViewArtifactRow[];
  artifact_details: Record<string, DashboardViewArtifactDetail>;
  task_groups: DashboardViewTaskGroup[];
  turns: DashboardViewTurnGroup[];
  filters: DashboardViewFilterOptions;
  privacy: DashboardViewPrivacyState;
  caveats: DashboardViewCaveat[];
};

export type DashboardViewSessionIndex = {
  schema_version: 1;
  generated_at: string;
  sessions: DashboardViewSession[];
  caveats: DashboardViewCaveat[];
};
