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
  rows?: AnalyzerRow[];
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
