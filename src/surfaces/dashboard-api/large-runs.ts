import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pageLargeRunArtifacts, pageLargeRunRequests, summarizeLargeRun, type LargeRunSummary } from "../../analysis/large-run.ts";
import { streamEventsFromRunDir } from "../../core/store/index.ts";
import { DashboardApiRouteError } from "./errors.ts";

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

export async function createLargeRunResponse(runDir: string, runId: string, source: { size: number; mtimeMs: number }, cursor: LargeRunCursor = { offset: 0 }, limit = 50) {
  if (cursor.run_id !== undefined && (cursor.run_id !== runId || cursor.source_mtime_ms !== source.mtimeMs)) {
    throw invalidCursor();
  }
  const summary = await readLargeRunSummary(runDir, source);
  const page = pageLargeRunRequests(summary.requests, cursor.offset, limit);
  const items = page.items.map((row, index) => ({ ...row, chronology_index: cursor.offset + index }));
  return { run_id: runId, mode: "paged" as const, overview: { request_count: summary.requests.length, artifact_count: summary.artifact_count, input_tokens: summary.input_tokens, cached_input_tokens: summary.cached_input_tokens, uncached_input_tokens: summary.uncached_input_tokens, output_tokens: summary.output_tokens, event_count: summary.event_count, event_file_bytes: source.size }, request_page: { items, ...(page.nextOffset !== undefined ? { next_cursor: encodeCursor({ offset: page.nextOffset, run_id: runId, source_mtime_ms: source.mtimeMs }) } : {}) } };
}

export async function createLargeRunArtifactPage(runDir: string, requestId: string, offset = 0, limit = 50) {
  const page = await pageLargeRunArtifacts(streamEventsFromRunDir(runDir), requestId, offset, limit);
  return { request_id: requestId, items: page.items.map((artifact, index) => ({ artifact_id: artifact.artifact_id, artifact_type: artifact.artifact_type, display_name: artifact.artifact_name, local_token_count: artifact.local_token_count, request_order: artifact.artifact_index ?? offset + index, preview_state: artifact.storage_mode === "raw" ? "raw_available" : artifact.storage_mode === "preview" ? "preview" : "hidden" })), ...(page.nextOffset !== undefined ? { next_cursor: encodeCursor({ offset: page.nextOffset }) } : {}) };
}

export function decodeCursor(value: string | null): LargeRunCursor { try { if (!value) return { offset: 0 }; const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); if (!Number.isInteger(parsed.offset) || parsed.offset < 0 || (parsed.run_id !== undefined && typeof parsed.run_id !== "string") || (parsed.source_mtime_ms !== undefined && !Number.isFinite(parsed.source_mtime_ms))) throw new Error(); return parsed; } catch { throw invalidCursor(); } }
function encodeCursor(cursor: LargeRunCursor): string { return Buffer.from(JSON.stringify(cursor)).toString("base64url"); }
async function readCachedSummary(runDir: string): Promise<LargeRunCachedSummary | undefined> { try { const value = JSON.parse(await readFile(join(runDir, SUMMARY_FILE), "utf8")); return value && Array.isArray(value.requests) ? value : undefined; } catch { return undefined; } }

function invalidCursor(): DashboardApiRouteError {
  return new DashboardApiRouteError("invalid_request", 400, "Invalid page cursor.");
}
