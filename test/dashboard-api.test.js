import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleDashboardApiRequest } from "../src/surfaces/dashboard-api/routes.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("dashboard API status advertises local read-only contract", async () => {
  const root = tempRoot("status");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "proxy-state.json"), JSON.stringify({
    schema_version: 2,
    pid: process.pid,
    host: "127.0.0.1",
    port: 8787,
    capture_mode: "preview"
  }));
  const response = await handleDashboardApiRequest("GET", "/api/status", { rootDir: root });

  assert.equal(response.status, 200);
  assert.equal(response.body.schema_version, 1);
  assert.equal(response.body.data.service, "token-profiler-dashboard-api");
  assert.equal(response.body.data.read_only, true);
  assert.equal(response.body.data.local_only, true);
  assert.deepEqual(response.body.data.current_proxy, {
    status: "running",
    host: "127.0.0.1",
    port: 8787,
    capture_mode: "preview"
  });
  assert.equal(response.body.data.capabilities.refresh, "request");
  assert.equal(response.headers["access-control-allow-origin"], "http://127.0.0.1:5173");
});

test("dashboard API serves built dashboard static assets", async () => {
  const root = tempRoot("static-root");
  const staticDir = tempRoot("static-assets");
  await mkdir(staticDir, { recursive: true });
  await writeFile(join(staticDir, "index.html"), "<!doctype html><div id=\"root\"></div>");
  await writeFile(join(staticDir, "app.js"), "console.log('dashboard');");

  const index = await handleDashboardApiRequest("GET", "/", { rootDir: root, staticDir });
  assert.equal(index.status, 200);
  assert.equal(index.raw, true);
  assert.match(String(index.body), /id="root"/);
  assert.equal(index.headers["content-type"], "text/html; charset=utf-8");

  const asset = await handleDashboardApiRequest("GET", "/app.js", { rootDir: root, staticDir });
  assert.equal(asset.status, 200);
  assert.equal(asset.raw, true);
  assert.equal(Buffer.isBuffer(asset.body), true);
  assert.equal(asset.headers["content-type"], "text/javascript; charset=utf-8");

  const nestedRoute = await handleDashboardApiRequest("GET", "/runs/current", { rootDir: root, staticDir });
  assert.equal(nestedRoute.status, 200);
  assert.match(String(nestedRoute.body), /id="root"/);
});

test("dashboard API sessions return safe recent summaries", async () => {
  const root = tempRoot("sessions");
  await writeRun(root, "older", [artifact("req_1", "FILE:old", "FILE", "old.ts", "h1", 2, 0, 2), usage("req_1", 2, 0)]);
  await writeRun(root, "newer", [artifact("req_1", "FILE:new", "FILE", "new.ts", "h2", 4, 0, 4), usage("req_1", 4, 1)]);

  const response = await handleDashboardApiRequest("GET", "/api/sessions?limit=1", { rootDir: root });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.sessions.length, 1);
  assert.equal(response.body.data.sessions[0].run_id, "newer");
  assert.equal(response.body.data.sessions[0].canonical_run_id, "run_test");
  assert.equal(response.body.data.sessions[0].artifact_count, 1);
  assert.equal("run_dir" in response.body.data.sessions[0], false);
});

test("dashboard API labels cache-key sessions with resolved session titles", async () => {
  const root = tempRoot("title");
  const runId = "codex-cache-9906b655adce8b87";
  await writeRun(root, runId, [
    artifact("req_1", "FILE:cache", "FILE", "cache.ts", "h-cache", 3, 0, 3),
    usage("req_1", 3, 0)
  ]);

  const response = await handleDashboardApiRequest("GET", "/api/sessions", {
    rootDir: root,
    sessionTitleLookup: async () => new Map([[runId, "Clean up dashboard surface"]])
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.sessions[0].run_id, runId);
  assert.equal(response.body.data.sessions[0].label, "Clean up dashboard surface");
});

test("dashboard API labels Codex internal title generation sessions", async () => {
  const root = tempRoot("internal-title");
  const runId = "codex-019f1977-e3b0-7750-94bf-311495932396";
  await writeRun(root, runId, [
    titleGenerationArtifact(runId),
    {
      ...usage("req_title", 10, 4, 1),
      run_id: runId
    }
  ]);

  const response = await handleDashboardApiRequest("GET", "/api/sessions", {
    rootDir: root,
    sessionTitleLookup: async () => new Map([[runId, "Move refresh beside auto refresh"]])
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.sessions[0].run_id, runId);
  assert.equal(response.body.data.sessions[0].label, "[Codex Internal][generate_title]");
  assert.equal(response.body.data.sessions[0].identity.codex_label, "[Codex Internal][generate_title]");
});

test("dashboard API labels truncated Codex internal title generation sessions", async () => {
  const root = tempRoot("internal-title-truncated");
  const runId = "codex-019f2131-cec5-7cb1-9341-d90ce887afaa";
  await writeRun(root, runId, [
    {
      ...titleGenerationArtifact(runId),
      preview: {
        head: "You are a helpful assistant. You will be presented with a user prompt, and your job is to provide a short title for a task that will be created from that prompt.\nGenerate a concise UI title (up to 36 char",
        tail: "The end result should very closely align with the session total",
        truncated: true
      }
    },
    {
      ...usage("req_title", 10, 4, 1),
      run_id: runId
    }
  ]);

  const response = await handleDashboardApiRequest("GET", "/api/sessions", { rootDir: root });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.sessions[0].run_id, runId);
  assert.equal(response.body.data.sessions[0].label, "[Codex Internal][generate_title]");
});

test("dashboard API session run_id is routable to the run endpoint", async () => {
  const root = tempRoot("session-route");
  await writeRun(root, "directory-id", [
    artifact("req_1", "FILE:routable", "FILE", "routable.ts", "h-route", 3, 0, 3),
    usage("req_1", 3, 0)
  ]);

  const sessionsResponse = await handleDashboardApiRequest("GET", "/api/sessions", { rootDir: root });
  const session = sessionsResponse.body.data.sessions[0];
  const runResponse = await handleDashboardApiRequest("GET", `/api/runs/${encodeURIComponent(session.run_id)}`, { rootDir: root });

  assert.equal(session.run_id, "directory-id");
  assert.equal(session.canonical_run_id, "run_test");
  assert.equal(runResponse.status, 200);
  assert.equal(runResponse.body.data.run_id, session.run_id);
  assert.equal(runResponse.body.data.canonical_run_id, session.canonical_run_id);
});

test("dashboard API returns run views and artifact details", async () => {
  const root = tempRoot("run");
  await writeRun(root, "selected", [
    artifact("req_1", "CALL:exec:1", "TOOL_CALL", "tool-call:exec_command:call_1", "hash_call", 5, 0, 5, {
      content_kind: "command",
      tool_name: "exec_command",
      call_id: "call_1",
      command: "npm test"
    }),
    usage("req_1", 5, 0)
  ]);

  const runResponse = await handleDashboardApiRequest("GET", "/api/runs/selected", { rootDir: root });

  assert.equal(runResponse.status, 200);
  assert.equal(runResponse.body.schema_version, 1);
  assert.equal(runResponse.body.data.run_id, "selected");
  assert.equal(runResponse.body.data.canonical_run_id, "run_test");
  assert.equal(runResponse.body.data.overview.request_count, 1);
  assert.equal(runResponse.body.data.artifacts.length, 1);
  assert.equal(runResponse.body.data.task_groups.length >= 0, true);

  const artifactId = runResponse.body.data.artifacts[0].artifact_id;
  const detailResponse = await handleDashboardApiRequest("GET", `/api/runs/selected/artifacts/${encodeURIComponent(artifactId)}`, {
    rootDir: root
  });

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.data.artifact_id, artifactId);
  assert.equal(detailResponse.body.data.identity.stable_short_id.length > 0, true);
});

test("dashboard API returns structured not-found and invalid responses", async () => {
  const root = tempRoot("errors");
  await writeRun(root, "selected", [artifact("req_1", "FILE:one", "FILE", "one.ts", "h1", 1, 0, 1), usage("req_1", 1, 0)]);

  const missingRun = await handleDashboardApiRequest("GET", "/api/runs/missing", { rootDir: root });
  assert.equal(missingRun.status, 404);
  assert.equal(missingRun.body.error, "not_found");
  assert.equal(missingRun.body.schema_version, 1);

  const missingArtifact = await handleDashboardApiRequest("GET", "/api/runs/selected/artifacts/nope", { rootDir: root });
  assert.equal(missingArtifact.status, 404);
  assert.equal(missingArtifact.body.error, "artifact_not_found");

  const invalid = await handleDashboardApiRequest("POST", "/api/status", { rootDir: root });
  assert.equal(invalid.status, 405);
  assert.equal(invalid.body.error, "invalid_request");
});

function tempRoot(name) {
  return join(tmpdir(), `token-profiler-dashboard-api-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

async function writeRun(root, runId, events) {
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);
}

function titleGenerationArtifact(runId) {
  return {
    ...artifact("req_title", "USER_MESSAGE:title", "USER_MESSAGE", "message:user:2:0", "hash_title", 12, 0, 12, {
      content_kind: "user_message",
      role: "user",
      message_source: "current_turn",
      title_candidate: true
    }),
    run_id: runId,
    storage_mode: "preview",
    preview: {
      head: "You are a helpful assistant. You will be presented with a user prompt, and your job is to provide a short title for a task that will be created from that prompt.\nGenerate a concise UI title (up to 36 chars).\n\nUser prompt:\nMove the dashboard refresh button",
      tail: ""
    }
  };
}
