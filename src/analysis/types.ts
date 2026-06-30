import type {
  AggregateSummary,
  ArtifactAggregate,
  CanonicalEvent,
  JsonObject,
  RequestSummary
} from "../core/events/types.ts";

/**
 * Completeness of one analyzer's output for a run.
 *
 * Use `partial` when some metrics are valid but affected by missing canonical
 * facts. Use `unavailable` when the metric should not be interpreted at all.
 */
export type AnalyzerAvailabilityStatus = "complete" | "partial" | "unavailable" | "not_applicable";

/**
 * Explains whether an analyzer result can be trusted as complete and, when it
 * cannot, which canonical facts or source limitations caused the gap.
 */
export type AnalyzerAvailability = {
  status: AnalyzerAvailabilityStatus;
  reason?: string;
  missing_facts?: string[];
  limitations?: string[];
};

/**
 * User-facing explanation attached to analyzer output.
 *
 * Caveats keep estimated values, provider-reported values, and partial-data
 * situations distinguishable across CLI, HTML, and future export surfaces.
 */
export type AnalysisCaveat = {
  code: string;
  severity: "info" | "warning";
  message: string;
  applies_to?: {
    analyzer_id?: string;
    request_id?: string;
    artifact_id?: string;
  };
};

export type AnalyzerRow = Record<string, unknown>;

export type PreviewState = "hidden" | "unavailable" | "preview" | "raw_available";

export type RequestUsageAvailability = {
  status: "complete" | "partial" | "unavailable";
  usage_status: "reported" | "missing" | "incomplete";
  attribution_status: "complete" | "partial" | "unavailable" | "not_applicable";
  missing_facts: string[];
  limitations: string[];
  reason?: string | undefined;
};

export type ProviderRequestUsage = {
  input_tokens: number;
  cached_input_tokens: number;
  uncached_input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number | undefined;
  total_tokens: number;
  response_id?: string | undefined;
  source: "provider_reported";
};

export type RequestCacheAttributionSummary = {
  estimated_cached_input_tokens?: number | undefined;
  estimated_uncached_input_tokens?: number | undefined;
  estimated_cache_attributed_tokens?: number | undefined;
  estimated_cache_hit_ratio?: number | undefined;
  attribution_coverage?: number | "partial" | "unavailable" | undefined;
  attribution_state: "complete" | "partial" | "unavailable" | "overlong_normalized" | "under_attributed" | "estimated";
};

export type RequestArtifactInclusion = {
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
  privacy: {
    storage_mode: string;
    preview_state: PreviewState;
    hidden_fields: string[];
  };
  caveats: AnalysisCaveat[];
};

export type RequestAccountingRow = {
  request_id: string;
  timestamp?: string | undefined;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage | undefined;
  artifact_count: number;
  total_local_artifact_tokens: number;
  cache_attribution?: RequestCacheAttributionSummary | undefined;
  artifact_inclusions: RequestArtifactInclusion[];
  caveats: AnalysisCaveat[];
};

export type RequestAccountingResult = {
  analyzer_id: "request-accounting";
  schema_version: 1;
  availability: AnalyzerAvailability;
  summary: {
    request_count: number;
    usage_reported_count: number;
    usage_incomplete_count: number;
    artifact_inclusion_count: number;
    highest_total_request_id?: string | undefined;
    highest_uncached_request_id?: string | undefined;
  };
  metrics: Record<string, number | string | boolean | null>;
  rows: RequestAccountingRow[];
  caveats: AnalysisCaveat[];
};

export type TurnGroupingSource = "direct_turn_id" | "missing_turn_id" | "fallback";
export type TurnTitleSource = "user_preview" | "safe_summary" | "fallback" | "turn_id";
export type TurnConfidence = "complete" | "partial" | "fallback";
export type TurnRequestTitleSource = "assistant_preview" | "action_label" | "turn_title" | "request_id";

export type TurnRequest = {
  request_id: string;
  timestamp?: string | undefined;
  display_title: string;
  title_source: TurnRequestTitleSource;
  chronology_index: number;
  availability: RequestUsageAvailability;
  usage?: ProviderRequestUsage | undefined;
  artifact_inclusions: RequestArtifactInclusion[];
  caveats: AnalysisCaveat[];
};

export type TurnGroup = {
  turn_id: string;
  display_title: string;
  title_source: TurnTitleSource;
  grouping_source: TurnGroupingSource;
  confidence: TurnConfidence;
  request_ids: string[];
  artifact_ids: string[];
  requests: TurnRequest[];
  metrics: {
    input_tokens?: number | undefined;
    cached_input_tokens?: number | undefined;
    uncached_input_tokens?: number | undefined;
    output_tokens?: number | undefined;
    total_tokens?: number | undefined;
    total_local_artifact_tokens: number;
    artifact_count: number;
  };
  privacy: {
    preview_state: PreviewState;
    prompt_available: boolean;
    hidden_reason?: string | undefined;
  };
  caveats: AnalysisCaveat[];
};

export type TurnGroupAnalysisResult = Omit<AnalyzerResult, "analyzer_id" | "rows"> & {
  analyzer_id: "turn-groups";
  rows: TurnGroup[];
};

export type SessionIdentityMapping = {
  route_run_id: string;
  canonical_run_id?: string | undefined;
  codex_session_id?: string | undefined;
  codex_conversation_id?: string | undefined;
  codex_label?: string | undefined;
  mapping_confidence: "one_to_one" | "probable" | "best_effort" | "unknown";
  mapping_source: "direct_session_id" | "cache_key" | "wrapper_header" | "rollout_time_index" | "fallback_fingerprint" | "unavailable";
  limitations: string[];
};

export type DisplayCategory =
  | "command"
  | "command_output"
  | "patch"
  | "tool_call"
  | "assistant_message"
  | "user_message"
  | "file_context"
  | "request_metadata"
  | "reasoning_state"
  | "unknown";

export type ReadableArtifact = {
  artifact_id: string;
  artifact_name: string;
  stable_short_id: string;
  display_name: string;
  display_category: DisplayCategory;
  summary?: string | undefined;
  tool_name?: string | undefined;
  call_id?: string | undefined;
  request_id?: string | undefined;
  total_exposure: number;
  repeated_exposure: number;
  inclusion_count: number;
  attribution_state?: string | undefined;
  storage_mode: string;
  preview_state: PreviewState;
  title_candidate?: boolean | undefined;
  message_source?: string | undefined;
  specificity: number;
  source_facts: string[];
  caveats: AnalysisCaveat[];
};

export type ToolCallLink = {
  link_id: string;
  call_id?: string | undefined;
  tool_name?: string | undefined;
  call_artifact_id?: string | undefined;
  output_artifact_ids: string[];
  match_state: "exact" | "inferred" | "unmatched_call" | "unmatched_output";
  confidence: "high" | "medium" | "low";
  evidence: string[];
  caveats: AnalysisCaveat[];
};

export type ArtifactDetail = {
  artifact_id: string;
  display_name: string;
  display_category: DisplayCategory;
  identity: {
    artifact_name: string;
    stable_short_id: string;
    request_ids: string[];
  };
  metrics: {
    total_exposure: number;
    repeated_exposure: number;
    inclusion_count: number;
    distinct_hash_count?: number | undefined;
    estimated_cached_input_tokens?: number | undefined;
    estimated_uncached_input_tokens?: number | undefined;
    attribution_state?: string | undefined;
  };
  persistence: {
    first_seen_at?: string | undefined;
    last_seen_at?: string | undefined;
    task_group_ids?: string[] | undefined;
  };
  command?: {
    command?: string | undefined;
    workdir?: string | undefined;
    exit_code?: number | undefined;
    output_preview?: string | undefined;
    preview_state: PreviewState;
  };
  patch?: {
    touched_files?: string[] | undefined;
    touched_file_count?: number | undefined;
    adds?: number | undefined;
    updates?: number | undefined;
    deletes?: number | undefined;
  };
  content?: {
    preview?: string | undefined;
    raw?: string | undefined;
  };
  privacy: {
    storage_mode: string;
    preview_state: PreviewState;
    hidden_fields: string[];
  };
  tool_links: ToolCallLink[];
  caveats: AnalysisCaveat[];
};

export type TaskGroup = {
  task_group_id: string;
  display_name: string;
  label_source: "user_prompt" | "safe_summary" | "request_window" | "fallback";
  confidence: "complete" | "partial" | "heuristic";
  start_request_id: string;
  end_request_id: string;
  request_ids: string[];
  artifact_ids: string[];
  tool_call_link_ids: string[];
  metrics: {
    input_tokens?: number | undefined;
    cached_input_tokens?: number | undefined;
    uncached_input_tokens?: number | undefined;
    output_tokens?: number | undefined;
    total_exposure: number;
    repeated_exposure: number;
    artifact_count: number;
  };
  top_artifact_ids: string[];
  privacy: {
    prompt_available: boolean;
    preview_state: PreviewState;
    hidden_reason?: string | undefined;
  };
  caveats: AnalysisCaveat[];
};

export type LegibilityAnalysisResult = Omit<AnalyzerResult, "analyzer_id" | "rows"> & {
  analyzer_id: "legibility";
  rows: ReadableArtifact[];
  tool_links: ToolCallLink[];
  details: ArtifactDetail[];
};

export type TaskGroupAnalysisResult = Omit<AnalyzerResult, "analyzer_id" | "rows"> & {
  analyzer_id: "task-groups";
  rows: TaskGroup[];
};

/**
 * Output from a single analyzer module.
 *
 * `metrics` contains headline scalar values for summaries. `rows` contains
 * ranked or grouped detail records, such as top contributors or cost drivers.
 */
export type AnalyzerResult = {
  analyzer_id: string;
  schema_version: number;
  availability: AnalyzerAvailability;
  metrics: Record<string, number | string | boolean | null>;
  rows?: unknown[];
  caveats: AnalysisCaveat[];
};

/**
 * Combined analysis for one run.
 *
 * This extends the legacy aggregate shape during migration so existing
 * renderers can keep working while newer surfaces consume `analyzers`,
 * `artifact_aggregates`, and `caveats` directly.
 */
export type RunAnalysisSummary = AggregateSummary & {
  schema_version: 1;
  run_id?: string;
  generated_at: string;
  analyzers: AnalyzerResult[];
  artifact_aggregates: ArtifactAggregate[];
  caveats: AnalysisCaveat[];
  legibility?: LegibilityAnalysisResult;
  task_groups?: TaskGroup[];
  turns?: TurnGroup[];
  request_accounting?: RequestAccountingResult;
};

/**
 * Canonical analyzer input after event validation and source-agnostic grouping.
 *
 * Provider-specific payloads have already been converted by adapters before
 * data reaches this shape.
 */
export type PreparedRunData = {
  run_id?: string;
  events: CanonicalEvent[];
  artifactEvents: Extract<CanonicalEvent, { event_kind: "artifact" }>[];
  usageEvents: Extract<CanonicalEvent, { event_kind: "request_usage" }>[];
  turnIdentityEvents: Extract<CanonicalEvent, { event_kind: "request_turn_identity" }>[];
};

/**
 * Exposure analyzer output.
 *
 * `totals` includes run-wide exposure metrics; `artifacts` and `requests`
 * contain the derived rows other analyzers enrich later in the pipeline.
 */
export type ExposureAnalysis = {
  totals: JsonObject;
  artifacts: ArtifactAggregate[];
  requests: RequestSummary[];
  result: AnalyzerResult;
};

/**
 * Cache attribution analyzer output.
 *
 * The provider usage totals are authoritative request-level facts. Estimated
 * cached and uncached artifact values are local allocations over artifact
 * token ranges and must remain caveated as estimates.
 */
export type CacheAttributionAnalysis = {
  totals: JsonObject;
  artifacts: ArtifactAggregate[];
  requests: RequestSummary[];
  cost_drivers: ArtifactAggregate[];
  result: AnalyzerResult;
  caveats: AnalysisCaveat[];
};
