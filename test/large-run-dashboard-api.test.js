import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { handleDashboardApiRequest } from "../src/surfaces/dashboard-api/routes.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("large run API pages requests and selected-request artifacts", async () => {
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
  const artifacts = await handleDashboardApiRequest("GET", `/api/runs/${runId}/large/requests/new/artifacts`, { rootDir: root });
  assert.equal(artifacts.status, 200);
  assert.equal(artifacts.body.data.items[0].artifact_id, "FILE:new");
});
