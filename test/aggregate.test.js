import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { aggregateEvents } from "../src/aggregate.js";

test("aggregates exposure and replay by exact content hash", () => {
  const events = [
    event("req_1", "FILE:auth", "FILE", "auth.js", "hash_auth", 10),
    event("req_2", "FILE:auth", "FILE", "auth.js", "hash_auth", 10),
    event("req_2", "REPO_MAP:repo", "REPO_MAP", "repo_map", "hash_repo", 20),
    event("req_3", "REPO_MAP:repo", "REPO_MAP", "repo_map", "hash_repo", 20)
  ];

  const summary = aggregateEvents(events);

  assert.equal(summary.totals.total_exposure, 60);
  assert.equal(summary.totals.unique_exposure, 30);
  assert.equal(summary.totals.repeated_exposure, 30);
  assert.equal(summary.totals.replay_ratio, 0.5);
  assert.equal(summary.totals.context_efficiency, 0.5);
  assert.equal(summary.replay_hotspots[0].artifact_name, "repo_map");
  assert.equal(summary.replay_hotspots[0].repeated_exposure, 20);
});

test("summarizes new contract fixture runs", async () => {
  const events = (await readFile("test/fixtures/events/new-contract.jsonl", "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  const summary = aggregateEvents(events);

  assert.equal(summary.totals.total_exposure, 42);
  assert.equal(summary.totals.input_tokens, 50);
  assert.equal(summary.artifacts[0].metadata.extra_field, "preserved");
});

test("treats changed content hashes as new unique exposure", () => {
  const events = [
    event("req_1", "FILE:auth", "FILE", "auth.js", "hash_v1", 10),
    event("req_2", "FILE:auth", "FILE", "auth.js", "hash_v2", 12)
  ];

  const summary = aggregateEvents(events);
  const auth = summary.artifacts[0];

  assert.equal(summary.totals.total_exposure, 22);
  assert.equal(summary.totals.unique_exposure, 22);
  assert.equal(summary.totals.repeated_exposure, 0);
  assert.equal(auth.distinct_hashes, 2);
});

test("carries readable artifact metadata into aggregate rows", () => {
  const summary = aggregateEvents([
    {
      ...event("req_1", "SUMMARY:patch", "SUMMARY", "input:custom_tool_call:1", "hash_patch", 40),
      metadata: {
        display_name: "apply_patch: add runtime tests",
        tool_name: "apply_patch",
        content_kind: "patch",
        touched_files: ["tests/runtime.test.py"]
      }
    },
    {
      ...event("req_2", "SUMMARY:patch", "SUMMARY", "input:custom_tool_call:1", "hash_patch", 40),
      metadata: {
        touched_files: ["tests/runtime_more.test.py"]
      }
    }
  ]);

  const artifact = summary.artifacts[0];
  assert.equal(artifact.display_name, "apply_patch: add runtime tests");
  assert.equal(artifact.metadata.tool_name, "apply_patch");
  assert.deepEqual(artifact.metadata.touched_files, [
    "tests/runtime.test.py",
    "tests/runtime_more.test.py"
  ]);
});

test("prefers more specific display metadata for mixed-version captures", () => {
  const summary = aggregateEvents([
    {
      ...event("req_1", "TOOL_OUTPUT:call_1", "TOOL_OUTPUT", "tool:exec_command:call_1", "hash_output", 20),
      metadata: {
        display_name: "tool:exec_command:call_1",
        tool_name: "exec_command",
        content_kind: "tool_output"
      }
    },
    {
      ...event("req_2", "TOOL_OUTPUT:call_1", "TOOL_OUTPUT", "exec_command output: npm test", "hash_output", 20),
      metadata: {
        display_name: "exec_command output: npm test",
        tool_name: "exec_command",
        content_kind: "tool_output",
        command: "npm test",
        output_preview: "all good"
      }
    }
  ]);

  const artifact = summary.artifacts[0];
  assert.equal(artifact.display_name, "exec_command output: npm test");
  assert.equal(artifact.metadata.command, "npm test");
});

test("preserves command, patch, and unknown metadata variants", () => {
  const summary = aggregateEvents([
    {
      ...event("req_1", "TOOL_OUTPUT:call_1", "TOOL_OUTPUT", "exec_command output: npm test", "hash_cmd", 20),
      metadata: {
        display_name: "exec_command output: npm test",
        tool_name: "exec_command",
        content_kind: "tool_output",
        command: "npm test",
        workdir: "/repo",
        unknown_detail: "kept"
      }
    },
    {
      ...event("req_2", "SUMMARY:patch", "SUMMARY", "apply_patch: update src/app.js", "hash_patch", 10),
      metadata: {
        display_name: "apply_patch: update src/app.js",
        tool_name: "apply_patch",
        content_kind: "patch",
        touched_files: ["src/app.js"],
        patch_updates: 1
      }
    }
  ]);

  const command = summary.artifacts.find((artifact) => artifact.artifact_id === "TOOL_OUTPUT:call_1");
  const patch = summary.artifacts.find((artifact) => artifact.artifact_id === "SUMMARY:patch");
  assert.equal(command.metadata.command, "npm test");
  assert.equal(command.metadata.unknown_detail, "kept");
  assert.deepEqual(patch.metadata.touched_files, ["src/app.js"]);
});

test("new contract aggregate rejects unsupported older MVP artifact records", () => {
  assert.throws(
    () => aggregateEvents([
      {
        schema_version: 1,
        run_id: "run_test",
        request_id: "req_1",
        artifact_id: "FILE:auth",
        artifact_type: "FILE",
        artifact_name: "auth.js",
        content_hash: "hash_auth",
        token_count: 10,
        timestamp: "2026-06-23T12:00:01.000Z"
      }
    ]),
    /event_kind/
  );
});

test("aggregates prompt cache usage without adding it to exposure", () => {
  const summary = aggregateEvents([
    event("req_1", "FILE:auth", "FILE", "auth.js", "hash_auth", 10),
    usage("req_1", 100, 80, 20),
    usage("req_2", 200, 50, 30)
  ]);

  assert.equal(summary.totals.total_exposure, 10);
  assert.equal(summary.totals.input_tokens, 300);
  assert.equal(summary.totals.cached_input_tokens, 130);
  assert.equal(summary.totals.uncached_input_tokens, 170);
  assert.equal(summary.totals.cache_hit_ratio, 130 / 300);
  assert.equal(summary.totals.request_count, 2);
});

test("attributes cached and uncached tokens to artifact offsets", () => {
  const summary = aggregateEvents([
    event("req_1", "SYSTEM_PROMPT:instructions", "SYSTEM_PROMPT", "instructions", "hash_i", 10, 0, 10),
    event("req_1", "FILE:auth", "FILE", "auth.py", "hash_auth", 30, 10, 40),
    event("req_1", "ERROR_LOG:build", "ERROR_LOG", "build.log", "hash_log", 60, 40, 100),
    usage("req_1", 120, 55, 10)
  ]);

  const costDrivers = summary.cost_drivers.map((artifact) => artifact.artifact_name);
  const auth = summary.artifacts.find((artifact) => artifact.artifact_name === "auth.py");
  const buildLog = summary.artifacts.find((artifact) => artifact.artifact_name === "build.log");

  assert.deepEqual(costDrivers.slice(0, 2), ["build.log", "auth.py"]);
  assert.equal(auth.estimated_cached_input_tokens, 30);
  assert.equal(auth.estimated_uncached_input_tokens, 0);
  assert.equal(auth.estimated_cache_hit_ratio, 1);
  assert.equal(buildLog.estimated_cached_input_tokens, 15);
  assert.equal(buildLog.estimated_uncached_input_tokens, 45);
  assert.equal(buildLog.estimated_cache_hit_ratio, 0.25);
  assert.equal(summary.totals.estimated_cache_attributed_tokens, 100);
  assert.equal(summary.totals.estimated_cache_attribution_coverage, 100 / 120);
});

test("normalizes overlong reconstructed artifact offsets to actual input tokens", () => {
  const summary = aggregateEvents([
    event("req_1", "SUMMARY:history", "SUMMARY", "history", "hash_history", 150, 0, 150),
    event("req_1", "TOOL_OUTPUT:build", "TOOL_OUTPUT", "build.log", "hash_build", 50, 150, 200),
    usage("req_1", 100, 80, 10)
  ]);

  const history = summary.artifacts.find((artifact) => artifact.artifact_name === "history");
  const buildLog = summary.artifacts.find((artifact) => artifact.artifact_name === "build.log");

  assert.equal(summary.totals.estimated_cache_attributed_tokens, 100);
  assert.equal(summary.totals.estimated_cached_input_tokens, 80);
  assert.equal(summary.totals.estimated_uncached_input_tokens, 20);
  assert.equal(summary.totals.estimated_cache_attribution_coverage, 1);
  assert.equal(history.estimated_uncached_input_tokens, 0);
  assert.equal(buildLog.estimated_cached_input_tokens, 5);
  assert.equal(buildLog.estimated_uncached_input_tokens, 20);
  assert.equal(buildLog.estimated_cache_hit_ratio, 0.2);
});

function event(requestId, artifactId, artifactType, artifactName, contentHash, tokenCount, tokenStart, tokenEnd) {
  return {
    schema_version: 1,
    run_id: "run_test",
    request_id: requestId,
    artifact_id: artifactId,
    artifact_type: artifactType,
    artifact_name: artifactName,
    content_hash: contentHash,
    local_token_count: tokenCount,
    tokenizer: "o200k_base",
    storage_mode: "metadata",
    event_kind: "artifact",
    metadata: {},
    token_start: tokenStart,
    token_end: tokenEnd,
    timestamp: `2026-06-23T12:00:0${requestId.at(-1)}.000Z`
  };
}

function usage(requestId, inputTokens, cachedTokens, outputTokens) {
  return {
    schema_version: 1,
    event_kind: "request_usage",
    run_id: "run_test",
    request_id: requestId,
    input_tokens: inputTokens,
    cached_input_tokens: cachedTokens,
    uncached_input_tokens: inputTokens - cachedTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    timestamp: "2026-06-23T12:01:00.000Z"
  };
}
