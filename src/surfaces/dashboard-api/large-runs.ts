import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pageLargeRunArtifacts, pageLargeRunRequests, summarizeLargeRun, type LargeRunRequest, type LargeRunSummary } from "../../analysis/large-run.ts";
import type { ProviderRequestUsage } from "../../analysis/types.ts";
import { streamEventsFromRunDir } from "../../core/store/index.ts";
import { DashboardApiRouteError } from "./errors.ts";
import { dashboardPrivacyState, safeDisplayText } from "./privacy.ts";
import type { DashboardApiLargeRun, DashboardApiLargeRunArtifact, DashboardApiLargeRunArtifactPage, DashboardApiLargeRunRequest } from "./types.ts";

const SUMMARY_FILE = ".dashboard-large-run-summary-v1.json";
export type LargeRunCachedSummary = LargeRunSummary & { source_bytes: number; source_mtime_ms: number };

export async function readLargeRunSummary(runDir: string, source: { size: number; mtimeMs: number }): Promise<LargeRunCachedSummary> {
  const cached = await readCachedSummary(runDir);
  if (cached && cached.source_bytes === source.size && cached.source_mtime_ms === source.mtimeMs) return cached;
  let summary: LargeRunSummary;
  try {
    summary = await summarizeLargeRun(streamEventsFromRunDir(runDir));
  } catch (error) {
    throw new DashboardApiRouteError(
      "run_unreadable",
      422,
      error instanceof Error ? error.message : "Unable to read run events."
    );
  }
  const cachedSummary: LargeRunCachedSummary = { ...summary, source_bytes: source.size, source_mtime_ms: source.mtimeMs };
  await writeFile(join(runDir, SUMMARY_FILE), JSON.stringify(cachedSummary), "utf8").catch(() => undefined);
  return cachedSummary;
}

type LargeRunCursor = { offset: number; run_id?: string; source_mtime_ms?: number };
type LargeRunArtifactCursor = LargeRunCursor & { request_id?: string };

export async function createLargeRunResponse(
  runDir: string,
  runId: string,
  source: { size: number; mtimeMs: number },
  cursor: LargeRunCursor = { offset: 0 },
  limit = 50
): Promise<DashboardApiLargeRun> {
  if (cursor.run_id !== undefined && (cursor.run_id !== runId || cursor.source_mtime_ms !== source.mtimeMs)) {
    throw invalidCursor();
  }
  const summary = await readLargeRunSummary(runDir, source);
  const page = pageLargeRunRequests(summary.requests, cursor.offset, limit);
  const items = page.items.map((row, index) => mapLargeRunRequest(row, cursor.offset + index));
  return {
    run_id: runId,
    mode: "paged",
    overview: {
      request_count: summary.requests.length,
      artifact_count: summary.artifact_count,
      input_tokens: summary.input_tokens,
      cached_input_tokens: summary.cached_input_tokens,
      uncached_input_tokens: summary.uncached_input_tokens,
      output_tokens: summary.output_tokens,
      event_count: summary.event_count,
      event_file_bytes: source.size
    },
    request_page: {
      items,
      ...(page.nextOffset === undefined ? {} : {
        next_cursor: encodeCursor({ offset: page.nextOffset, run_id: runId, source_mtime_ms: source.mtimeMs })
      })
    }
  };
}

export async function createLargeRunArtifactPage(
  runDir: string,
  runId: string,
  requestId: string,
  source: { size: number; mtimeMs: number },
  cursor: LargeRunArtifactCursor = { offset: 0 },
  limit = 50
): Promise<DashboardApiLargeRunArtifactPage> {
  if (cursor.run_id !== undefined && (cursor.run_id !== runId || cursor.request_id !== requestId || cursor.source_mtime_ms !== source.mtimeMs)) {
    throw invalidCursor();
  }
  try {
    const page = await pageLargeRunArtifacts(streamEventsFromRunDir(runDir), requestId, cursor.offset, limit);
    return {
      request_id: requestId,
      items: page.items.map((artifact, index) => mapLargeRunArtifact(artifact, cursor.offset + index)),
      ...(page.nextOffset === undefined ? {} : {
        next_cursor: encodeCursor({ offset: page.nextOffset, run_id: runId, request_id: requestId, source_mtime_ms: source.mtimeMs })
      })
    };
  } catch (error) {
    if (error instanceof DashboardApiRouteError) throw error;
    throw new DashboardApiRouteError(
      "run_unreadable",
      422,
      error instanceof Error ? error.message : "Unable to read run events."
    );
  }
}

export function decodeCursor(value: string | null): LargeRunCursor { return decodeCursorFields(value, false); }
export function decodeArtifactCursor(value: string | null): LargeRunArtifactCursor { return decodeCursorFields(value, true); }
function decodeCursorFields(value: string | null, allowsRequestId: boolean): LargeRunArtifactCursor {
  try {
    if (!value) return { offset: 0 };
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || !Number.isInteger(parsed.offset) || parsed.offset < 0 || (parsed.run_id !== undefined && typeof parsed.run_id !== "string") || (parsed.source_mtime_ms !== undefined && !Number.isFinite(parsed.source_mtime_ms)) || (!allowsRequestId && parsed.request_id !== undefined) || (allowsRequestId && parsed.request_id !== undefined && typeof parsed.request_id !== "string")) throw new Error();
    return parsed;
  } catch { throw invalidCursor(); }
}
function encodeCursor(cursor: LargeRunArtifactCursor): string { return Buffer.from(JSON.stringify(cursor)).toString("base64url"); }
async function readCachedSummary(runDir: string): Promise<LargeRunCachedSummary | undefined> { try { const value = JSON.parse(await readFile(join(runDir, SUMMARY_FILE), "utf8")); return value && Array.isArray(value.requests) ? value : undefined; } catch { return undefined; } }

function invalidCursor(): DashboardApiRouteError {
  return new DashboardApiRouteError("invalid_request", 400, "Invalid page cursor.");
}

function mapLargeRunRequest(row: LargeRunRequest, chronologyIndex: number): DashboardApiLargeRunRequest {
  return {
    request_id: row.request_id,
    ...(row.timestamp === undefined ? {} : { timestamp: row.timestamp }),
    ...(row.turn_id === undefined ? {} : { turn_id: row.turn_id }),
    chronology_index: chronologyIndex,
    artifact_count: row.artifact_count,
    total_local_artifact_tokens: row.total_local_artifact_tokens,
    ...(row.usage === undefined ? {} : { usage: mapProviderUsage(row.usage) })
  };
}

function mapProviderUsage(usage: NonNullable<LargeRunRequest["usage"]>): ProviderRequestUsage {
  return {
    input_tokens: usage.input_tokens,
    cached_input_tokens: usage.cached_input_tokens,
    uncached_input_tokens: usage.uncached_input_tokens,
    output_tokens: usage.output_tokens,
    ...(usage.reasoning_tokens === undefined ? {} : { reasoning_tokens: usage.reasoning_tokens }),
    total_tokens: usage.total_tokens,
    ...(usage.response_id === undefined ? {} : { response_id: usage.response_id }),
    source: "provider_reported"
  };
}

function mapLargeRunArtifact(artifact: Awaited<ReturnType<typeof pageLargeRunArtifacts>>["items"][number], fallbackOrder: number): DashboardApiLargeRunArtifact {
  const previewState = artifact.storage_mode === "raw" ? "raw_available" : artifact.storage_mode === "preview" ? "preview" : "hidden";
  const privacy = dashboardPrivacyState({
    storageMode: artifact.storage_mode,
    previewState,
    hiddenFields: previewState === "hidden" ? ["raw_content"] : []
  });
  return {
    artifact_id: artifact.artifact_id,
    artifact_type: artifact.artifact_type,
    display_name: safeDisplayText(artifact.artifact_name, privacy, "display_name") ?? artifact.artifact_type,
    local_token_count: artifact.local_token_count,
    request_order: artifact.artifact_index ?? fallbackOrder,
    preview_state: previewState
  };
}
