import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleDashboardApiRequest } from "../src/surfaces/dashboard-api/routes.ts";
import {
  requestAccountingEvents,
  requestArtifactInclusionEvents
} from "./helpers/request-accounting-fixtures.js";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("dashboard API exposes request accounting capability and run request rows", async () => {
  const root = tempRoot("request-accounting");
  await writeRun(root, "selected", requestAccountingEvents());

  const status = await handleDashboardApiRequest("GET", "/api/status", { rootDir: root });
  assert.equal(status.body.data.capabilities.request_accounting, true);

  const response = await handleDashboardApiRequest("GET", "/api/runs/selected", { rootDir: root });
  const requests = response.body.data.requests;

  assert.equal(response.status, 200);
  assert.equal(requests.summary.request_count, 4);
  assert.equal(requests.summary.highest_total_request_id, "req_same_b");
  assert.deepEqual(requests.rows.map((row) => row.request_id), ["req_early", "req_same_a", "req_same_b", "req_missing"]);
  assert.equal(requests.rows[2].usage.cached_input_tokens, 20);
  assert.equal(requests.rows[2].usage.uncached_input_tokens, 10);
  assert.equal(requests.rows[3].usage, undefined);
  assert.equal(requests.rows[3].availability.usage_status, "missing");
});

test("dashboard API exposes session identity mapping without replacing route identity", async () => {
  const root = tempRoot("identity");
  const directRunId = "codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd2341";
  await writeRun(root, directRunId, [
    artifact("req_1", "FILE:direct", "FILE", "direct.ts", "h-direct", 2, 0, 2),
    usage("req_1", 2, 0)
  ]);
  await writeRun(root, "codex-cache-9906b655adce8b87", [
    artifact("req_1", "FILE:cache", "FILE", "cache.ts", "h-cache", 3, 0, 3),
    usage("req_1", 3, 0)
  ]);

  const response = await handleDashboardApiRequest("GET", "/api/sessions", {
    rootDir: root,
    sessionTitleLookup: async () => new Map([
      [directRunId, "Direct Codex session"],
      ["codex-cache-9906b655adce8b87", "Cache-key session"]
    ])
  });

  const direct = response.body.data.sessions.find((session) => session.run_id === directRunId);
  assert.equal(direct.identity.route_run_id, directRunId);
  assert.equal(direct.identity.codex_session_id, "019ef64d-7666-7ba3-a9d6-ac0fe4cd2341");
  assert.equal(direct.identity.mapping_confidence, "one_to_one");
  assert.equal(direct.identity.mapping_source, "direct_session_id");
  assert.equal(direct.identity.codex_label, "Direct Codex session");

  const cache = response.body.data.sessions.find((session) => session.run_id === "codex-cache-9906b655adce8b87");
  assert.equal(cache.identity.mapping_confidence, "probable");
  assert.equal(cache.identity.mapping_source, "cache_key");
  assert.equal(cache.identity.limitations.length > 0, true);
});

test("dashboard API keeps direct Codex sessions separate when labels and local hints overlap", async () => {
  const root = tempRoot("direct-identity-separation");
  const firstRunId = "codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd2341";
  const secondRunId = "codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd9999";

  await writeRun(root, firstRunId, [
    artifact("req_1", "FILE:first", "FILE", "shared.ts", "h-first", 2, 0, 2, { prompt_cache_key: "shared-cache-hint" }),
    usage("req_1", 2, 0)
  ]);
  await writeRun(root, secondRunId, [
    artifact("req_2", "FILE:second", "FILE", "shared.ts", "h-second", 3, 0, 3, { prompt_cache_key: "shared-cache-hint" }),
    usage("req_2", 3, 0)
  ]);

  const response = await handleDashboardApiRequest("GET", "/api/sessions", {
    rootDir: root,
    sessionTitleLookup: async () => new Map([
      [firstRunId, "Shared title"],
      [secondRunId, "Shared title"]
    ])
  });

  const directSessions = response.body.data.sessions
    .filter((session) => session.identity.mapping_source === "direct_session_id")
    .sort((a, b) => a.run_id.localeCompare(b.run_id));

  assert.equal(directSessions.length, 2);
  assert.deepEqual(directSessions.map((session) => session.run_id), [firstRunId, secondRunId].sort());
  assert.deepEqual(directSessions.map((session) => session.identity.codex_session_id).sort(), [
    "019ef64d-7666-7ba3-a9d6-ac0fe4cd2341",
    "019ef64d-7666-7ba3-a9d6-ac0fe4cd9999"
  ].sort());
  assert.equal(directSessions.every((session) => session.label === "Shared title"), true);
});

test("dashboard API exposes request-scoped artifact inclusions", async () => {
  const root = tempRoot("request-inclusions");
  await writeRun(root, "selected", requestArtifactInclusionEvents());

  const response = await handleDashboardApiRequest("GET", "/api/runs/selected", { rootDir: root });
  const detail = response.body.data.requests.rows.find((row) => row.request_id === "req_detail");

  assert.deepEqual(detail.artifact_inclusions.map((inclusion) => inclusion.artifact_id), [
    "CALL:exec:detail",
    "OUT:exec:detail"
  ]);
  assert.equal(detail.artifact_inclusions[0].privacy.hidden_fields.includes("raw_content"), true);
  assert.equal(detail.artifact_inclusions[1].estimated_uncached_input_tokens, 12);
  assert.equal(detail.artifact_inclusions[1].caveats.some((caveat) => caveat.code === "local_artifact_attribution_estimate"), true);
});

function tempRoot(name) {
  return join(tmpdir(), `token-profiler-dashboard-api-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

async function writeRun(root, runId, events) {
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
}
