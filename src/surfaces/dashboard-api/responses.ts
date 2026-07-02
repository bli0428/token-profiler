import { readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { analyzeEvents } from "../../analysis/pipeline.ts";
import { readEventsFromRunDir } from "../../core/store/index.ts";
import { createDashboardSessionIndex, type DashboardSessionTitleLookup } from "./sessions.ts";
import { createDashboardViewModel } from "./view-model.ts";
import { DashboardApiRouteError } from "./errors.ts";
import {
  DASHBOARD_API_SCHEMA_VERSION,
  type DashboardApiArtifactRow,
  type DashboardApiArtifactDetail,
  type DashboardApiFilterOptions,
  type DashboardApiMetadataSection,
  type DashboardApiPrivacyState,
  type DashboardApiRequestAccounting,
  type DashboardApiRequestAccountingRow,
  type DashboardApiRequestArtifactInclusion,
  type DashboardApiRun,
  type DashboardApiRunOverview,
  type DashboardApiSession,
  type DashboardApiStatus,
  type DashboardApiTaskGroup,
  type DashboardApiTurnGroup,
  type DashboardApiTurnRequest
} from "./types.ts";

type ProxyState = {
  pid?: unknown;
  host?: unknown;
  port?: unknown;
  capture_mode?: unknown;
};

/**
 * Builds the read-only local API status document.
 *
 * The proxy state is advisory: unreadable or stale state should degrade the
 * status response, not prevent the dashboard from loading local run data.
 */
export async function createStatusResponse(rootDir: string): Promise<DashboardApiStatus> {
  return {
    service: "token-profiler-dashboard-api",
    ready: true,
    read_only: true,
    local_only: true,
    data_root_label: basename(resolve(rootDir)) || "token-profiler",
    current_proxy: await readCurrentProxy(rootDir),
    schema_version: DASHBOARD_API_SCHEMA_VERSION,
    capabilities: {
      sessions: true,
      run_view: true,
      artifact_detail: true,
      request_accounting: true,
      refresh: "request"
    }
  };
}

async function readCurrentProxy(rootDir: string): Promise<DashboardApiStatus["current_proxy"]> {
  try {
    const state = JSON.parse(await readFile(join(rootDir, "proxy-state.json"), "utf8")) as ProxyState;
    if (!isProcessRunning(state.pid)) {
      return { status: "not_running", ...(typeof state.capture_mode === "string" ? { capture_mode: state.capture_mode } : {}) };
    }
    return {
      status: "running",
      host: typeof state.host === "string" ? state.host : "127.0.0.1",
      port: typeof state.port === "number" ? state.port : Number(state.port ?? 8787),
      capture_mode: typeof state.capture_mode === "string" ? state.capture_mode : "unknown"
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "not_running" };
    }
    return { status: "unknown" };
  }
}

function isProcessRunning(pid: unknown): boolean {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid as number, 0);
    return true;
  } catch {
    return false;
  }
}

export async function createSessionsResponse(
  rootDir: string,
  options: { limit?: number; sessionTitleLookup?: DashboardSessionTitleLookup | undefined } = {}
): Promise<{ sessions: DashboardApiSession[] }> {
  const index = await createDashboardSessionIndex(rootDir, options);
  return {
    sessions: index.sessions.map(toApiSession)
  };
}

/**
 * Loads and analyzes a run for the public dashboard contract.
 *
 * Store/analyzer errors are converted to route errors here so HTTP routing can
 * return stable API envelopes without exposing filesystem or parser details.
 */
export async function createRunResponse(rootDir: string, runId: string): Promise<DashboardApiRun> {
  const runDir = resolveRunDir(rootDir, runId);

  try {
    await stat(join(runDir, "events.jsonl"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DashboardApiRouteError("not_found", 404, "Run not found.");
    }
    throw error;
  }

  try {
    const summary = analyzeEvents(await readEventsFromRunDir(runDir));
    const view = createDashboardViewModel(summary);
    return toApiRun(view, runId);
  } catch (error) {
    throw new DashboardApiRouteError(
      "run_unreadable",
      422,
      "Run data could not be interpreted as supported canonical data.",
      [{
        code: "run_unreadable",
        severity: "warning",
        message: "The selected run could not be read."
      }]
    );
  }
}

export async function createArtifactDetailResponse(
  rootDir: string,
  runId: string,
  artifactId: string
): Promise<DashboardApiArtifactDetail> {
  const run = await createRunResponse(rootDir, runId);
  const detail = findArtifactDetail(run.artifact_details, artifactId);
  if (!detail) {
    throw new DashboardApiRouteError("artifact_not_found", 404, "Artifact not found.");
  }
  return detail;
}

type DashboardSessionSource = Awaited<ReturnType<typeof createDashboardSessionIndex>>["sessions"][number];
type DashboardViewSource = ReturnType<typeof createDashboardViewModel>;
type DashboardOverviewSource = DashboardViewSource["overview"];
type DashboardArtifactRowSource = DashboardViewSource["artifacts"][number];
type DashboardArtifactDetailSource = DashboardViewSource["artifact_details"][string];
type DashboardTaskGroupSource = DashboardViewSource["task_groups"][number];
type DashboardTurnGroupSource = DashboardViewSource["turns"][number];
type DashboardTurnRequestSource = DashboardTurnGroupSource["requests"][number];
type DashboardPrivacySource = DashboardViewSource["privacy"];
type DashboardFilterSource = DashboardViewSource["filters"];
type DashboardMetadataSectionSource = DashboardArtifactDetailSource["metadata_sections"][number];

// The API layer owns its transport contract. Keep these mappers explicit so
// analyzer/view-model additions never become public response fields by accident.
function toApiSession(session: DashboardSessionSource): DashboardApiSession {
  const routableRunId = basename(session.run_dir);
  return {
    run_id: routableRunId,
    ...(session.run_id !== routableRunId ? { canonical_run_id: session.run_id } : {}),
    ...(session.label !== undefined ? { label: session.label } : {}),
    identity: {
      route_run_id: routableRunId,
      ...(session.identity.canonical_run_id !== undefined ? { canonical_run_id: session.identity.canonical_run_id } : {}),
      ...(session.identity.codex_session_id !== undefined ? { codex_session_id: session.identity.codex_session_id } : {}),
      ...(session.identity.codex_conversation_id !== undefined ? { codex_conversation_id: session.identity.codex_conversation_id } : {}),
      ...(session.identity.codex_label !== undefined ? { codex_label: session.identity.codex_label } : {}),
      mapping_confidence: session.identity.mapping_confidence,
      mapping_source: session.identity.mapping_source,
      limitations: [...session.identity.limitations]
    },
    ...(session.updated_at !== undefined ? { updated_at: session.updated_at } : {}),
    ...(session.request_count !== undefined ? { request_count: session.request_count } : {}),
    ...(session.artifact_count !== undefined ? { artifact_count: session.artifact_count } : {}),
    ...(session.input_tokens !== undefined ? { input_tokens: session.input_tokens } : {}),
    ...(session.cached_input_tokens !== undefined ? { cached_input_tokens: session.cached_input_tokens } : {}),
    ...(session.uncached_input_tokens !== undefined ? { uncached_input_tokens: session.uncached_input_tokens } : {}),
    ...(session.output_tokens !== undefined ? { output_tokens: session.output_tokens } : {}),
    availability: session.availability.status === "unavailable"
      ? { status: "unavailable", reason: "Run data is unreadable." }
      : session.availability,
    caveats: session.caveats
  };
}

function toApiRun(view: DashboardViewSource, runId: string): DashboardApiRun {
  return {
    run_id: runId,
    ...(view.run_id && view.run_id !== runId ? { canonical_run_id: view.run_id } : {}),
    overview: toApiOverview(view.overview),
    requests: toApiRequestAccounting(view.requests),
    artifacts: view.artifacts.map(toApiArtifactRow),
    artifact_details: Object.fromEntries(
      Object.entries(view.artifact_details).map(([artifactId, detail]) => [artifactId, toApiArtifactDetail(detail)])
    ),
    task_groups: view.task_groups.map(toApiTaskGroup),
    turns: view.turns.map(toApiTurnGroup),
    filters: toApiFilters(view.filters),
    privacy: toApiPrivacy(view.privacy),
    caveats: view.caveats
  };
}

function toApiRequestAccounting(requests: DashboardViewSource["requests"]): DashboardApiRequestAccounting {
  return {
    availability: requests.availability,
    summary: {
      request_count: requests.summary.request_count,
      usage_reported_count: requests.summary.usage_reported_count,
      usage_incomplete_count: requests.summary.usage_incomplete_count,
      artifact_inclusion_count: requests.summary.artifact_inclusion_count,
      ...(requests.summary.highest_total_request_id !== undefined ? { highest_total_request_id: requests.summary.highest_total_request_id } : {}),
      ...(requests.summary.highest_uncached_request_id !== undefined ? { highest_uncached_request_id: requests.summary.highest_uncached_request_id } : {})
    },
    rows: requests.rows.map(toApiRequestAccountingRow),
    caveats: [...requests.caveats]
  };
}

function toApiRequestAccountingRow(row: DashboardViewSource["requests"]["rows"][number]): DashboardApiRequestAccountingRow {
  return {
    request_id: row.request_id,
    ...(row.timestamp !== undefined ? { timestamp: row.timestamp } : {}),
    chronology_index: row.chronology_index,
    availability: {
      status: row.availability.status,
      usage_status: row.availability.usage_status,
      attribution_status: row.availability.attribution_status,
      missing_facts: [...row.availability.missing_facts],
      limitations: [...row.availability.limitations],
      ...(row.availability.reason !== undefined ? { reason: row.availability.reason } : {})
    },
    ...(row.usage !== undefined ? { usage: { ...row.usage } } : {}),
    artifact_count: row.artifact_count,
    total_local_artifact_tokens: row.total_local_artifact_tokens,
    ...(row.cache_attribution !== undefined ? { cache_attribution: { ...row.cache_attribution } } : {}),
    artifact_inclusions: row.artifact_inclusions.map(toApiRequestArtifactInclusion),
    caveats: [...row.caveats]
  };
}

function toApiRequestArtifactInclusion(inclusion: DashboardViewSource["requests"]["rows"][number]["artifact_inclusions"][number]): DashboardApiRequestArtifactInclusion {
  return {
    artifact_id: inclusion.artifact_id,
    stable_short_id: inclusion.stable_short_id,
    artifact_type: inclusion.artifact_type,
    display_name: inclusion.display_name,
    display_category: inclusion.display_category,
    request_order: inclusion.request_order,
    local_token_count: inclusion.local_token_count,
    ...(inclusion.token_start !== undefined ? { token_start: inclusion.token_start } : {}),
    ...(inclusion.token_end !== undefined ? { token_end: inclusion.token_end } : {}),
    ...(inclusion.normalized_estimated_input_tokens !== undefined ? { normalized_estimated_input_tokens: inclusion.normalized_estimated_input_tokens } : {}),
    ...(inclusion.estimated_cached_input_tokens !== undefined ? { estimated_cached_input_tokens: inclusion.estimated_cached_input_tokens } : {}),
    ...(inclusion.estimated_uncached_input_tokens !== undefined ? { estimated_uncached_input_tokens: inclusion.estimated_uncached_input_tokens } : {}),
    attribution_state: inclusion.attribution_state,
    privacy: toApiPrivacy(inclusion.privacy),
    caveats: [...inclusion.caveats]
  };
}

function toApiOverview(overview: DashboardOverviewSource): DashboardApiRunOverview {
  return {
    scope: overview.scope,
    ...(overview.scope_id !== undefined ? { scope_id: overview.scope_id } : {}),
    scope_label: overview.scope_label,
    request_count: overview.request_count,
    artifact_count: overview.artifact_count,
    ...(overview.input_tokens !== undefined ? { input_tokens: overview.input_tokens } : {}),
    ...(overview.cached_input_tokens !== undefined ? { cached_input_tokens: overview.cached_input_tokens } : {}),
    ...(overview.uncached_input_tokens !== undefined ? { uncached_input_tokens: overview.uncached_input_tokens } : {}),
    ...(overview.output_tokens !== undefined ? { output_tokens: overview.output_tokens } : {}),
    total_exposure: overview.total_exposure,
    repeated_exposure: overview.repeated_exposure,
    ...(overview.replay_ratio !== undefined ? { replay_ratio: overview.replay_ratio } : {}),
    ...(overview.context_efficiency !== undefined ? { context_efficiency: overview.context_efficiency } : {}),
    ...(overview.attribution_coverage !== undefined ? { attribution_coverage: overview.attribution_coverage } : {}),
    availability: overview.availability,
    caveats: overview.caveats
  };
}

function toApiArtifactRow(row: DashboardArtifactRowSource): DashboardApiArtifactRow {
  return {
    artifact_id: row.artifact_id,
    stable_short_id: row.stable_short_id,
    display_name: row.display_name,
    display_category: row.display_category,
    ...(row.summary !== undefined ? { summary: row.summary } : {}),
    task_group_ids: [...row.task_group_ids],
    total_exposure: row.total_exposure,
    repeated_exposure: row.repeated_exposure,
    inclusion_count: row.inclusion_count,
    ...(row.normalized_estimated_input_tokens !== undefined ? { normalized_estimated_input_tokens: row.normalized_estimated_input_tokens } : {}),
    ...(row.estimated_cached_input_tokens !== undefined ? { estimated_cached_input_tokens: row.estimated_cached_input_tokens } : {}),
    ...(row.estimated_uncached_input_tokens !== undefined ? { estimated_uncached_input_tokens: row.estimated_uncached_input_tokens } : {}),
    ...(row.attribution_state !== undefined ? { attribution_state: row.attribution_state } : {}),
    preview_state: row.preview_state,
    detail_available: row.detail_available,
    search_text: row.search_text,
    caveats: [...row.caveats]
  };
}

function toApiArtifactDetail(detail: DashboardArtifactDetailSource): DashboardApiArtifactDetail {
  return {
    artifact_id: detail.artifact_id,
    title: detail.title,
    identity: {
      ...(detail.identity.artifact_name !== undefined ? { artifact_name: detail.identity.artifact_name } : {}),
      stable_short_id: detail.identity.stable_short_id,
      display_category: detail.identity.display_category,
      request_ids: [...detail.identity.request_ids]
    },
    metrics: {
      total_exposure: detail.metrics.total_exposure,
      repeated_exposure: detail.metrics.repeated_exposure,
      inclusion_count: detail.metrics.inclusion_count,
      distinct_hash_count: detail.metrics.distinct_hash_count,
      estimated_cached_input_tokens: detail.metrics.estimated_cached_input_tokens,
      estimated_uncached_input_tokens: detail.metrics.estimated_uncached_input_tokens,
      attribution_state: detail.metrics.attribution_state,
      first_seen_at: detail.metrics.first_seen_at,
      last_seen_at: detail.metrics.last_seen_at
    },
    metadata_sections: detail.metadata_sections.map(toApiMetadataSection),
    tool_links: detail.tool_links.map((link) => ({
      link_id: link.link_id,
      ...(link.call_id !== undefined ? { call_id: link.call_id } : {}),
      ...(link.tool_name !== undefined ? { tool_name: link.tool_name } : {}),
      ...(link.call_artifact_id !== undefined ? { call_artifact_id: link.call_artifact_id } : {}),
      output_artifact_ids: [...link.output_artifact_ids],
      match_state: link.match_state,
      confidence: link.confidence,
      evidence: [...link.evidence],
      caveats: [...link.caveats]
    })),
    task_group_ids: [...detail.task_group_ids],
    privacy: toApiPrivacy(detail.privacy),
    ...(detail.content ? {
      content: {
        ...(detail.content.preview !== undefined ? { preview: detail.content.preview } : {}),
        ...(detail.content.raw !== undefined ? { raw: detail.content.raw } : {}),
        raw_reveal_required: detail.content.raw_reveal_required
      }
    } : {}),
    caveats: [...detail.caveats]
  };
}

function toApiMetadataSection(section: DashboardMetadataSectionSource): DashboardApiMetadataSection {
  return {
    title: section.title,
    rows: section.rows.map((row) => ({
      label: row.label,
      value: row.value,
      visibility: row.visibility
    }))
  };
}

function toApiTaskGroup(group: DashboardTaskGroupSource): DashboardApiTaskGroup {
  return {
    task_group_id: group.task_group_id,
    display_name: group.display_name,
    label_source: group.label_source,
    confidence: group.confidence,
    request_count: group.request_count,
    artifact_count: group.artifact_count,
    request_ids: [...group.request_ids],
    artifact_ids: [...group.artifact_ids],
    top_artifact_ids: [...group.top_artifact_ids],
    metrics: {
      ...(group.metrics.input_tokens !== undefined ? { input_tokens: group.metrics.input_tokens } : {}),
      ...(group.metrics.cached_input_tokens !== undefined ? { cached_input_tokens: group.metrics.cached_input_tokens } : {}),
      ...(group.metrics.uncached_input_tokens !== undefined ? { uncached_input_tokens: group.metrics.uncached_input_tokens } : {}),
      ...(group.metrics.output_tokens !== undefined ? { output_tokens: group.metrics.output_tokens } : {}),
      total_exposure: group.metrics.total_exposure,
      repeated_exposure: group.metrics.repeated_exposure
    },
    privacy: toApiPrivacy(group.privacy),
    caveats: [...group.caveats]
  };
}

function toApiTurnGroup(group: DashboardTurnGroupSource): DashboardApiTurnGroup {
  return {
    turn_id: group.turn_id,
    display_title: group.display_title,
    title_source: group.title_source,
    grouping_source: group.grouping_source,
    confidence: group.confidence,
    request_ids: [...group.request_ids],
    artifact_ids: [...group.artifact_ids],
    requests: group.requests.map(toApiTurnRequest),
    metrics: {
      ...(group.metrics.input_tokens !== undefined ? { input_tokens: group.metrics.input_tokens } : {}),
      ...(group.metrics.cached_input_tokens !== undefined ? { cached_input_tokens: group.metrics.cached_input_tokens } : {}),
      ...(group.metrics.uncached_input_tokens !== undefined ? { uncached_input_tokens: group.metrics.uncached_input_tokens } : {}),
      ...(group.metrics.output_tokens !== undefined ? { output_tokens: group.metrics.output_tokens } : {}),
      ...(group.metrics.total_tokens !== undefined ? { total_tokens: group.metrics.total_tokens } : {}),
      total_local_artifact_tokens: group.metrics.total_local_artifact_tokens,
      artifact_count: group.metrics.artifact_count
    },
    privacy: toApiPrivacy(group.privacy),
    caveats: [...group.caveats]
  };
}

function toApiTurnRequest(request: DashboardTurnRequestSource): DashboardApiTurnRequest {
  return {
    request_id: request.request_id,
    ...(request.timestamp !== undefined ? { timestamp: request.timestamp } : {}),
    display_title: request.display_title,
    title_source: request.title_source,
    chronology_index: request.chronology_index,
    availability: {
      status: request.availability.status,
      usage_status: request.availability.usage_status,
      attribution_status: request.availability.attribution_status,
      missing_facts: [...request.availability.missing_facts],
      limitations: [...request.availability.limitations],
      ...(request.availability.reason !== undefined ? { reason: request.availability.reason } : {})
    },
    ...(request.usage !== undefined ? {
      usage: {
        input_tokens: request.usage.input_tokens,
        cached_input_tokens: request.usage.cached_input_tokens,
        uncached_input_tokens: request.usage.uncached_input_tokens,
        output_tokens: request.usage.output_tokens,
        ...(request.usage.reasoning_tokens !== undefined ? { reasoning_tokens: request.usage.reasoning_tokens } : {}),
        total_tokens: request.usage.total_tokens,
        ...(request.usage.response_id !== undefined ? { response_id: request.usage.response_id } : {}),
        source: request.usage.source
      }
    } : {}),
    artifact_inclusions: request.artifact_inclusions.map(toApiRequestArtifactInclusion),
    caveats: [...request.caveats]
  };
}

function toApiFilters(filters: DashboardFilterSource): DashboardApiFilterOptions {
  return {
    categories: [...filters.categories],
    task_groups: filters.task_groups.map((group) => ({
      task_group_id: group.task_group_id,
      display_name: group.display_name
    })),
    default_sort: filters.default_sort,
    searchable_fields: [...filters.searchable_fields]
  };
}

function toApiPrivacy(privacy: DashboardPrivacySource): DashboardApiPrivacyState {
  return {
    storage_mode: privacy.storage_mode,
    raw_content_available: privacy.raw_content_available,
    raw_content_revealed: privacy.raw_content_revealed,
    preview_fields: [...privacy.preview_fields],
    hidden_fields: [...privacy.hidden_fields],
    unavailable_fields: [...privacy.unavailable_fields],
    caveats: [...privacy.caveats]
  };
}

// Artifact IDs are accepted as either full IDs or unique short prefixes to
// support compact UI links without making the API ambiguous.
function findArtifactDetail(
  details: Record<string, DashboardApiArtifactDetail>,
  artifactId: string
): DashboardApiArtifactDetail | undefined {
  if (details[artifactId]) return details[artifactId];

  const shortMatches = Object.values(details).filter((detail) => detail.identity.stable_short_id === artifactId);
  return shortMatches.length === 1 ? shortMatches[0] : undefined;
}

function resolveRunDir(rootDir: string, runId: string): string {
  if (!runId || runId.includes("/") || runId.includes("\\") || runId === "." || runId === "..") {
    throw new DashboardApiRouteError("invalid_request", 400, "Invalid run identifier.");
  }

  const runsDir = resolve(rootDir, "runs");
  const runDir = resolve(runsDir, runId);
  if (runDir !== runsDir && runDir.startsWith(`${runsDir}/`)) return runDir;

  throw new DashboardApiRouteError("invalid_request", 400, "Invalid run identifier.");
}
