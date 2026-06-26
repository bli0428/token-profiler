import assert from "node:assert/strict";
import test from "node:test";
import { aggregateEvents } from "../src/analysis/aggregate.ts";
import { formatArtifactDetail, formatLegibilityReport } from "../src/analysis/legibility.ts";

test("formats readable artifacts and artifact detail", () => {
  const summary = aggregateEvents([
    {
      schema_version: 1,
      run_id: "run_test",
      request_id: "req_1",
      artifact_id: "SUMMARY:custom-tool-call:call_patch",
      artifact_type: "SUMMARY",
      artifact_name: "input:custom_tool_call:1",
      content_hash: "hash_patch",
      event_kind: "artifact",
      local_token_count: 100,
      tokenizer: "o200k_base",
      storage_mode: "metadata",
      timestamp: "2026-06-24T12:00:00.000Z",
      metadata: {
        display_name: "apply_patch: add runtime tests",
        tool_name: "apply_patch",
        call_id: "call_patch",
        content_kind: "patch",
        touched_files: ["tests/runtime.test.py"],
        patch_file_count: 1,
        patch_adds: 1,
        patch_updates: 0,
        patch_deletes: 0
      }
    }
  ]);

  const report = formatLegibilityReport(summary);
  assert.match(report, /apply_patch: add runtime tests/);
  assert.match(report, /patch/);
  assert.match(report, /tests\/runtime\.test\.py/);

  const detail = formatArtifactDetail(summary, "call_patch");
  assert.match(detail, /Call ID:\s+call_patch/);
  assert.match(detail, /Touched Files:/);
});
