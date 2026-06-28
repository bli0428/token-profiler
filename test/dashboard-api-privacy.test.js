import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleDashboardApiRequest } from "../src/surfaces/dashboard-api/routes.ts";
import { metadataOnlyLeakSummary } from "./helpers/dashboard-fixtures.js";
import { metadataOnlyRequestAccountingEvents } from "./helpers/request-accounting-fixtures.js";

test("metadata-only dashboard API responses do not leak hidden raw content", async () => {
  const root = join(tmpdir(), `token-profiler-dashboard-api-privacy-${Date.now()}`);
  await writeRun(root, "secret", metadataOnlyLeakSummary().requests.length > 0 ? rawSecretEvents() : rawSecretEvents());

  const runResponse = await handleDashboardApiRequest("GET", "/api/runs/secret", { rootDir: root });
  const artifactResponse = await handleDashboardApiRequest("GET", "/api/runs/secret/artifacts/OUT%3Asecret", { rootDir: root });
  const serialized = JSON.stringify([runResponse.body, artifactResponse.body]);

  assert.equal(runResponse.status, 200);
  assert.equal(artifactResponse.status, 200);
  assert.equal(serialized.includes("SECRET_DO_NOT_LEAK"), false);
  assert.equal(serialized.includes("Hidden by privacy mode"), true);
  assert.equal(runResponse.body.data.privacy.hidden_fields.includes("raw_content"), true);
});

test("metadata-only request accounting does not leak hidden content", async () => {
  const root = join(tmpdir(), `token-profiler-dashboard-api-request-privacy-${Date.now()}`);
  await writeRun(root, "secret-request", metadataOnlyRequestAccountingEvents());

  const runResponse = await handleDashboardApiRequest("GET", "/api/runs/secret-request", { rootDir: root });
  const serialized = JSON.stringify(runResponse.body.data.requests);

  assert.equal(runResponse.status, 200);
  assert.equal(serialized.includes("SECRET_DO_NOT_LEAK"), false);
  assert.equal(serialized.includes("print secret"), false);
  assert.equal(runResponse.body.data.requests.rows[0].artifact_inclusions[0].privacy.hidden_fields.includes("raw_content"), true);
});

function rawSecretEvents() {
  return [
    {
      schema_version: 1,
      run_id: "run_secret",
      request_id: "req_1",
      artifact_id: "OUT:secret",
      artifact_type: "TOOL_OUTPUT",
      artifact_name: "tool:exec_command:secret",
      content_hash: "hash_secret",
      local_token_count: 20,
      tokenizer: "o200k_base",
      storage_mode: "metadata",
      event_kind: "artifact",
      metadata: {
        content_kind: "command_output",
        tool_name: "exec_command",
        command: "print secret",
        output_preview: "SECRET_DO_NOT_LEAK"
      },
      timestamp: "2026-06-23T12:00:01.000Z"
    },
    {
      schema_version: 1,
      event_kind: "request_usage",
      run_id: "run_secret",
      request_id: "req_1",
      input_tokens: 20,
      cached_input_tokens: 0,
      uncached_input_tokens: 20,
      output_tokens: 1,
      total_tokens: 21,
      timestamp: "2026-06-23T12:01:00.000Z"
    }
  ];
}

async function writeRun(root, runId, events) {
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
}
