import assert from "node:assert/strict";
import test from "node:test";
import { aggregateEvents } from "../src/analysis/aggregate.ts";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { formatSummary } from "../src/surfaces/cli/report-renderer.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("analyzer pipeline returns structured results and legacy parity", () => {
  const events = [
    artifact("req_1", "FILE:auth", "FILE", "auth.js", "hash_auth", 10, 0, 10),
    artifact("req_2", "FILE:auth", "FILE", "auth.js", "hash_auth", 10, 0, 10),
    usage("req_1", 10, 5)
  ];
  const analysis = analyzeEvents(events);
  const legacy = aggregateEvents(events);

  assert.equal(analysis.schema_version, 1);
  assert.equal(analysis.analyzers.some((analyzer) => analyzer.analyzer_id === "exposure"), true);
  assert.equal(analysis.analyzers.some((analyzer) => analyzer.analyzer_id === "legibility"), true);
  assert.equal(analysis.analyzers.some((analyzer) => analyzer.analyzer_id === "task-groups"), true);
  assert.equal(analysis.totals.total_exposure, legacy.totals.total_exposure);
  assert.equal(analysis.top_contributors[0].artifact_id, legacy.top_contributors[0].artifact_id);
});

test("analyzer pipeline exports legibility and task group details", () => {
  const analysis = analyzeEvents([
    artifact("req_1", "MSG:user:1", "MESSAGE", "user message", "hash_prompt", 5, 0, 5, {
      content_kind: "user_message",
      role: "user",
      prompt_summary: "Explain labels"
    }),
    artifact("req_1", "OUT:exec:1", "TOOL_OUTPUT", "tool:exec_command:call_1", "hash_out", 20, 5, 25, {
      tool_name: "exec_command",
      call_id: "call_1",
      content_kind: "command_output",
      command: "npm test"
    }),
    usage("req_1", 25, 5)
  ]);

  assert.equal(analysis.legibility.rows.some((row) => row.display_name.includes("npm test")), true);
  assert.equal(analysis.legibility.details.some((detail) => detail.artifact_id === "OUT:exec:1"), true);
  assert.equal(analysis.task_groups.length, 1);
  assert.equal(analysis.task_groups[0].display_name, "Explain labels");
});

test("CLI renderer consumes analyzer results with attribution caveat", () => {
  const summary = analyzeEvents([
    artifact("req_1", "FILE:auth", "FILE", "auth.js", "hash_auth", 10, 0, 10),
    usage("req_1", 10, 5)
  ]);
  const report = formatSummary(summary);
  assert.match(report, /Token Profiler Report/);
  assert.match(report, /Artifact-level attribution is estimated/);
});

test("CLI renderer includes task groups from analyzer results", () => {
  const summary = analyzeEvents([
    artifact("req_1", "MSG:user:1", "MESSAGE", "user message", "hash_prompt", 5, 0, 5, {
      content_kind: "user_message",
      role: "user",
      prompt_summary: "Render task groups"
    }),
    artifact("req_1", "FILE:auth", "FILE", "auth.js", "hash_auth", 10, 5, 15)
  ]);
  const report = formatSummary(summary);

  assert.match(report, /Task Groups/);
  assert.match(report, /Render task groups/);
});
