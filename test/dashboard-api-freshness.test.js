import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleDashboardApiRequest } from "../src/surfaces/dashboard-api/routes.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("dashboard API sessions and runs refresh from disk on each request", async () => {
  const root = join(tmpdir(), `token-profiler-dashboard-api-fresh-${Date.now()}`);
  await writeRun(root, "active", [artifact("req_1", "FILE:one", "FILE", "one.ts", "h1", 1, 0, 1), usage("req_1", 1, 0)]);

  const firstRun = await handleDashboardApiRequest("GET", "/api/runs/active", { rootDir: root });
  assert.equal(firstRun.body.data.overview.request_count, 1);

  await writeRun(root, "active", [
    artifact("req_1", "FILE:one", "FILE", "one.ts", "h1", 1, 0, 1),
    usage("req_1", 1, 0),
    artifact("req_2", "FILE:two", "FILE", "two.ts", "h2", 2, 0, 2),
    usage("req_2", 2, 0)
  ]);
  await writeRun(root, "new-session", [artifact("req_1", "FILE:new", "FILE", "new.ts", "h3", 3, 0, 3), usage("req_1", 3, 0)]);

  const secondRun = await handleDashboardApiRequest("GET", "/api/runs/active", { rootDir: root });
  const sessions = await handleDashboardApiRequest("GET", "/api/sessions", { rootDir: root });

  assert.equal(secondRun.body.data.overview.request_count, 2);
  assert.equal(secondRun.body.data.artifacts.length, 2);
  assert.equal(sessions.body.data.sessions.length, 2);
});

async function writeRun(root, runId, events) {
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
}
