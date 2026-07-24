import { validateEvent } from "../core/events/index.ts";
import type { ArtifactEvent } from "../core/events/types.ts";

export type LargeRunRequest = {
  request_id: string;
  timestamp?: string;
  turn_id?: string;
  artifact_count: number;
  total_local_artifact_tokens: number;
  usage?: { input_tokens: number; cached_input_tokens: number; uncached_input_tokens: number; output_tokens: number; total_tokens: number };
};

export type LargeRunSummary = {
  event_count: number;
  artifact_count: number;
  input_tokens: number;
  cached_input_tokens: number;
  uncached_input_tokens: number;
  output_tokens: number;
  requests: LargeRunRequest[];
};

export async function summarizeLargeRun(events: AsyncIterable<unknown>): Promise<LargeRunSummary> {
  const byRequest = new Map<string, LargeRunRequest>();
  let event_count = 0;
  let artifact_count = 0;
  let input_tokens = 0;
  let cached_input_tokens = 0;
  let uncached_input_tokens = 0;
  let output_tokens = 0;
  for await (const raw of events) {
    event_count += 1;
    const event = validateEvent(raw);
    const row = byRequest.get(event.request_id) ?? { request_id: event.request_id, artifact_count: 0, total_local_artifact_tokens: 0 };
    if (!row.timestamp || String(event.timestamp) > row.timestamp) row.timestamp = event.timestamp;
    if (event.event_kind === "artifact") {
      row.artifact_count += 1;
      row.total_local_artifact_tokens += Number(event.local_token_count) || 0;
      artifact_count += 1;
    } else if (event.event_kind === "request_usage") {
      row.usage = {
        input_tokens: event.input_tokens, cached_input_tokens: event.cached_input_tokens,
        uncached_input_tokens: event.uncached_input_tokens, output_tokens: event.output_tokens, total_tokens: event.total_tokens
      };
      input_tokens += event.input_tokens; cached_input_tokens += event.cached_input_tokens;
      uncached_input_tokens += event.uncached_input_tokens; output_tokens += event.output_tokens;
    } else if (event.turn_id) row.turn_id = event.turn_id;
    byRequest.set(event.request_id, row);
  }
  return { event_count, artifact_count, input_tokens, cached_input_tokens, uncached_input_tokens, output_tokens,
    requests: [...byRequest.values()].sort((a, b) => String(b.timestamp ?? "").localeCompare(String(a.timestamp ?? "")) || b.request_id.localeCompare(a.request_id)) };
}

export function pageLargeRunRequests(requests: LargeRunRequest[], offset: number, limit: number): { items: LargeRunRequest[]; nextOffset?: number } {
  const items = requests.slice(offset, offset + limit);
  return {
    items,
    ...(offset + items.length < requests.length ? { nextOffset: offset + items.length } : {})
  };
}

export async function pageLargeRunArtifacts(events: AsyncIterable<unknown>, requestId: string, offset: number, limit: number): Promise<{ items: ArtifactEvent[]; nextOffset?: number }> {
  const items: ArtifactEvent[] = [];
  let seen = 0;
  for await (const raw of events) {
    const event = validateEvent(raw);
    if (event.event_kind !== "artifact" || event.request_id !== requestId) continue;
    if (seen >= offset && items.length < limit) items.push(event);
    seen += 1;
    if (items.length === limit && seen > offset + limit) break;
  }
  return { items, ...(seen > offset + items.length ? { nextOffset: offset + items.length } : {}) };
}
