import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { handleDashboardApiRequest } from "../src/surfaces/dashboard-api/routes.ts";
import { largeRunArtifactEvents, largeRunRequestEvents } from "./helpers/dashboard-fixtures.js";

test("large run API returns overview metrics and run-bound request cursors", async () => {
  const root = join(tmpdir(), `token-profiler-large-api-${Date.now()}`);
  const runId = "codex-019f8654-d457-7560-88e9-131adc7a7c57";
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  const events = largeRunRequestEvents([
    { requestId: "new", turnId: "turn_new", inputTokens: 100, cachedTokens: 90, outputTokens: 10, timestamp: "2026-06-23T12:00:02.000Z" },
    { requestId: "old", turnId: "turn_old", inputTokens: 50, cachedTokens: 40, outputTokens: 10, timestamp: "2026-06-23T12:00:01.000Z" }
  ]);
  await writeFile(join(runDir, "events.jsonl"), `${events.map(JSON.stringify).join("\n")}\n`);
  const first = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large?limit=1`, { rootDir: root });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.mode, "paged");
  assert.equal(first.body.data.request_page.items.length, 1);
  assert.equal(first.body.data.request_page.items[0].request_id, "new");
  assert.equal(first.body.data.request_page.items[0].turn_id, "turn_new");
  assert.deepEqual(first.body.data.request_page.items[0].usage, {
    input_tokens: 100,
    cached_input_tokens: 90,
    uncached_input_tokens: 10,
    output_tokens: 10,
    total_tokens: 110,
    source: "provider_reported"
  });
  assert.equal("metadata" in first.body.data.request_page.items[0], false);
  assert.equal(first.body.data.overview.request_count, 2);
  assert.equal(first.body.data.overview.input_tokens, 150);
  const cursor = first.body.data.request_page.next_cursor;
  assert.ok(cursor);
  const second = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(second.status, 200);
  assert.equal(second.body.data.items.length, 1);
  assert.equal(second.body.data.items[0].request_id, "old");

  const otherRun = "codex-019f8654-d457-7560-88e9-131adc7a7c58";
  await mkdir(join(root, "runs", otherRun), { recursive: true });
  await writeFile(join(root, "runs", otherRun, "events.jsonl"), `${JSON.stringify(events[0])}\n`);
  const crossRun = await handleDashboardApiRequest("GET", `/api/runs/${otherRun}/large/requests?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(crossRun.status, 400);
  assert.equal(crossRun.body.error, "invalid_request");

  await writeFile(join(runDir, "events.jsonl"), `${events.map(JSON.stringify).join("\n")}\n${JSON.stringify(events[0])}\n`);
  const stale = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(stale.status, 400);
  assert.equal(stale.body.error, "invalid_request");

  const malformed = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests?cursor=not-a-cursor`, { rootDir: root });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.message, "Invalid page cursor.");

  const invalidLimit = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests?limit=501`, { rootDir: root });
  assert.equal(invalidLimit.status, 400);
  assert.equal(invalidLimit.body.message, "Invalid page limit.");
});

test("large run API reports malformed complete canonical JSONL as unreadable", async () => {
  const root = join(tmpdir(), `token-profiler-large-invalid-${Date.now()}`);
  const runId = "codex-019f8654-d457-7560-88e9-131adc7a7c59";
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), '{"event_kind":"artifact"}\n');

  const response = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large`, { rootDir: root });
  assert.equal(response.status, 422);
  assert.equal(response.body.error, "run_unreadable");
});

test("large run artifact pages isolate a request, preserve privacy state, and bind cursors", async () => {
  const root = join(tmpdir(), `token-profiler-large-artifacts-${Date.now()}`);
  const runId = "codex-019f8654-d457-7560-88e9-131adc7a7c60";
  const otherRun = "codex-019f8654-d457-7560-88e9-131adc7a7c61";
  const runDir = join(root, "runs", runId);
  const events = largeRunArtifactEvents();
  await mkdir(runDir, { recursive: true });
  await mkdir(join(root, "runs", otherRun), { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), `${events.map(JSON.stringify).join("\n")}\n`);
  await writeFile(join(root, "runs", otherRun, "events.jsonl"), `${JSON.stringify(events[0])}\n`);

  const first = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/selected/artifacts?limit=1`, { rootDir: root });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.request_id, "selected");
  assert.deepEqual(first.body.data.items[0], {
    artifact_id: "META:selected",
    artifact_type: "FILE",
    display_name: "selected.ts",
    local_token_count: 3,
    request_order: 0,
    preview_state: "hidden"
  });
  assert.equal("content" in first.body.data.items[0], false);
  assert.equal("preview" in first.body.data.items[0], false);
  const cursor = first.body.data.next_cursor;
  assert.ok(cursor);

  const second = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/selected/artifacts?cursor=${encodeURIComponent(cursor)}&limit=1`, { rootDir: root });
  assert.equal(second.status, 200);
  assert.equal(second.body.data.items[0].artifact_id, "PREVIEW:selected");
  assert.equal(second.body.data.items[0].preview_state, "preview");
  const third = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/selected/artifacts?cursor=${encodeURIComponent(second.body.data.next_cursor)}&limit=1`, { rootDir: root });
  assert.equal(third.status, 200);
  assert.equal(third.body.data.items[0].preview_state, "raw_available");
  assert.equal(third.body.data.next_cursor, undefined);

  const crossRequest = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/other/artifacts?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(crossRequest.status, 400);
  const crossRun = await handleDashboardApiRequest("GET", `/api/runs/${otherRun}/large/requests/selected/artifacts?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(crossRun.status, 400);
  const malformed = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/selected/artifacts?cursor=not-a-cursor`, { rootDir: root });
  assert.equal(malformed.status, 400);
  const invalidLimit = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/selected/artifacts?limit=501`, { rootDir: root });
  assert.equal(invalidLimit.status, 400);

  await writeFile(join(runDir, "events.jsonl"), `${events.map(JSON.stringify).join("\n")}\n${JSON.stringify(events[0])}\n`);
  const stale = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/selected/artifacts?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(stale.status, 400);
});
