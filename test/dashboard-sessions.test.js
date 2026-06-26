import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import { createDashboardSessionIndex } from "../src/surfaces/dashboard/sessions.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("dashboard session index sorts recent runs and summarizes metrics", async () => {
  const root = join(tmpdir(), `token-profiler-dashboard-${Date.now()}`);
  for (let index = 0; index < 25; index += 1) {
    await writeRun(root, `run-${String(index).padStart(2, "0")}`, [
      artifact("req_1", `FILE:${index}`, "FILE", `${index}.ts`, `h${index}`, index + 1, 0, index + 1),
      usage("req_1", index + 1, 0)
    ]);
  }

  const index = await createDashboardSessionIndex(root, { limit: 20 });

  assert.equal(index.sessions[0].run_id, "run_test");
  assert.equal(index.sessions[0].artifact_count, 1);
  assert.equal(index.sessions.length, 20);
});

test("dashboard session index marks unreadable runs", async () => {
  const root = join(tmpdir(), `token-profiler-dashboard-bad-${Date.now()}`);
  const runDir = join(root, "runs", "bad");
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), "{bad json}\n");

  const index = await createDashboardSessionIndex(root);

  assert.equal(index.sessions[0].availability.status, "unavailable");
  assert.equal(index.sessions[0].caveats[0].code, "session_unreadable");
});

async function writeRun(root, runId, events) {
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
}
