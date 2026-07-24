import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { handleDashboardApiRequest } from "../src/surfaces/dashboard-api/routes.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("large run API returns overview metrics and run-bound request cursors", async () => {
  const root = join(tmpdir(), `token-profiler-large-api-${Date.now()}`);
  const runId = "codex-019f8654-d457-7560-88e9-131adc7a7c57";
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  const events = [artifact("new", "FILE:new", "FILE", "new.ts", "new", 2, 0, 2), usage("new", 100, 90), artifact("old", "FILE:old", "FILE", "old.ts", "old", 2, 0, 2), usage("old", 50, 40)];
  await writeFile(join(runDir, "events.jsonl"), `${events.map(JSON.stringify).join("\n")}\n`);
  const first = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large?limit=1`, { rootDir: root });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.mode, "paged");
  assert.equal(first.body.data.request_page.items.length, 1);
  assert.equal(first.body.data.overview.request_count, 2);
  assert.equal(first.body.data.overview.input_tokens, 150);
  const cursor = first.body.data.request_page.next_cursor;
  assert.ok(cursor);
  const second = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(second.status, 200);
  assert.equal(second.body.data.items.length, 1);

  const otherRun = "codex-019f8654-d457-7560-88e9-131adc7a7c58";
  await mkdir(join(root, "runs", otherRun), { recursive: true });
  await writeFile(join(root, "runs", otherRun, "events.jsonl"), `${JSON.stringify(events[0])}\n`);
  const crossRun = await handleDashboardApiRequest("GET", `/api/runs/${otherRun}/large/requests?cursor=${encodeURIComponent(cursor)}`, { rootDir: root });
  assert.equal(crossRun.status, 400);
  assert.equal(crossRun.body.error, "invalid_request");
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
