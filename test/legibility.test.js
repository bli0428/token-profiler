import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { aggregateEvents } from "../src/analysis/aggregate.ts";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { formatArtifactDetail, formatLegibilityReport } from "../src/analysis/legibility.ts";

async function fixture(name) {
  const text = await readFile(new URL(`./fixtures/events/${name}`, import.meta.url), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

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

test("derives readable labels, categories, links, and deterministic order", async () => {
  const summary = analyzeEvents(await fixture("legibility-work-units.jsonl"));
  const rows = summary.legibility.rows;

  assert.ok(rows.some((row) => row.display_category === "command" && row.display_name.includes("npm test")));
  assert.ok(rows.some((row) => row.display_category === "command_output" && row.display_name.includes("npm test")));
  assert.ok(rows.some((row) => row.display_category === "patch" && row.display_name.includes("src/analysis/legibility.ts")));
  assert.ok(rows.some((row) => row.display_category === "user_message" && row.display_name.includes("Implement readable labels")));
  assert.ok(rows.some((row) => row.display_category === "unknown" && row.caveats.some((caveat) => caveat.code === "metadata_missing")));

  const link = summary.legibility.tool_links.find((candidate) => candidate.call_id === "call_build");
  assert.equal(link.match_state, "exact");
  assert.equal(link.call_artifact_id, "CALL:exec:call_build");
  assert.deepEqual(link.output_artifact_ids, ["OUT:exec:call_build"]);

  assert.deepEqual(
    analyzeEvents(await fixture("legibility-work-units.jsonl")).legibility.rows.map((row) => row.artifact_id),
    rows.map((row) => row.artifact_id)
  );
});

test("prefers richer mixed-version metadata in readable labels", async () => {
  const summary = analyzeEvents(await fixture("legibility-work-units.jsonl"));
  const row = summary.legibility.rows.find((candidate) => candidate.artifact_id === "MIXED:label");

  assert.equal(row.display_category, "command_output");
  assert.match(row.display_name, /npm run lint/);
});

test("artifact detail exposes command, patch, unknown, and attribution caveats", async () => {
  const summary = analyzeEvents(await fixture("legibility-work-units.jsonl"));

  const command = formatArtifactDetail(summary, "OUT:exec:call_build");
  assert.match(command, /Command:\s+npm test/);
  assert.match(command, /Workdir:\s+\/repo/);
  assert.match(command, /Output Preview:\s+ok 42 tests/);
  assert.match(command, /local_artifact_attribution_estimate/);

  const patch = formatArtifactDetail(summary, "CALL:patch:call_patch");
  assert.match(patch, /Patch Files:\s+2/);
  assert.match(patch, /src\/analysis\/legibility\.ts/);

  const unknown = formatArtifactDetail(summary, "LEGACY:opaque");
  assert.match(unknown, /metadata_missing/);
  assert.match(unknown, /Stable|Short ID/);
});
