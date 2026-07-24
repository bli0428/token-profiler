import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pageLargeRunArtifacts, summarizeLargeRun, type LargeRunSummary } from "../../analysis/large-run.ts";
import { streamEventsFromRunDir } from "../../core/store/index.ts";

const SUMMARY_FILE = ".dashboard-large-run-summary-v1.json";
export type LargeRunCachedSummary = LargeRunSummary & { source_bytes: number; source_mtime_ms: number };

export async function readLargeRunSummary(runDir: string, source: { size: number; mtimeMs: number }): Promise<LargeRunCachedSummary> {
  const cached = await readCachedSummary(runDir);
  if (cached && cached.source_bytes === source.size && cached.source_mtime_ms === source.mtimeMs) return cached;
  const summary: LargeRunCachedSummary = { ...await summarizeLargeRun(streamEventsFromRunDir(runDir)), source_bytes: source.size, source_mtime_ms: source.mtimeMs };
  await writeFile(join(runDir, SUMMARY_FILE), JSON.stringify(summary), "utf8").catch(() => undefined);
  return summary;
}

export async function createLargeRunResponse(runDir: string, runId: string, source: { size: number; mtimeMs: number }, offset = 0, limit = 50) {
  const summary = await readLargeRunSummary(runDir, source);
  const items = summary.requests.slice(offset, offset + limit).map((row, index) => ({ ...row, chronology_index: offset + index }));
  return { run_id: runId, mode: "paged" as const, overview: { request_count: summary.requests.length, artifact_count: summary.artifact_count, input_tokens: summary.input_tokens, cached_input_tokens: summary.cached_input_tokens, uncached_input_tokens: summary.uncached_input_tokens, output_tokens: summary.output_tokens, event_count: summary.event_count, event_file_bytes: source.size }, request_page: { items, ...(offset + items.length < summary.requests.length ? { next_cursor: encodeCursor(offset + items.length) } : {}) } };
}

export async function createLargeRunArtifactPage(runDir: string, requestId: string, offset = 0, limit = 50) {
  const page = await pageLargeRunArtifacts(streamEventsFromRunDir(runDir), requestId, offset, limit);
  return { request_id: requestId, items: page.items.map((artifact, index) => ({ artifact_id: artifact.artifact_id, artifact_type: artifact.artifact_type, display_name: artifact.artifact_name, local_token_count: artifact.local_token_count, request_order: artifact.artifact_index ?? offset + index, preview_state: artifact.storage_mode === "raw" ? "raw_available" : artifact.storage_mode === "preview" ? "preview" : "hidden" })), ...(page.nextOffset !== undefined ? { next_cursor: encodeCursor(page.nextOffset) } : {}) };
}

export function decodeCursor(value: string | null): number { try { if (!value) return 0; const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); if (!Number.isInteger(parsed.offset) || parsed.offset < 0) throw new Error(); return parsed.offset; } catch { throw new Error("Invalid page cursor."); } }
function encodeCursor(offset: number): string { return Buffer.from(JSON.stringify({ offset })).toString("base64url"); }
async function readCachedSummary(runDir: string): Promise<LargeRunCachedSummary | undefined> { try { const value = JSON.parse(await readFile(join(runDir, SUMMARY_FILE), "utf8")); return value && Array.isArray(value.requests) ? value : undefined; } catch { return undefined; } }
