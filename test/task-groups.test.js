import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";

async function fixture(name) {
  const text = await readFile(new URL(`./fixtures/events/${name}`, import.meta.url), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

test("groups multi-prompt sessions into deterministic task windows", async () => {
  const summary = analyzeEvents(await fixture("task-groups.jsonl"));
  const groups = summary.task_groups;

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.start_request_id), ["req_1", "req_3"]);
  assert.match(groups[0].display_name, /Set up labels/);
  assert.match(groups[1].display_name, /Add drilldown/);
  assert.deepEqual(
    analyzeEvents(await fixture("task-groups.jsonl")).task_groups.map((group) => group.task_group_id),
    groups.map((group) => group.task_group_id)
  );
});

test("rolls up task group token and artifact metrics", async () => {
  const summary = analyzeEvents(await fixture("task-groups.jsonl"));
  const first = summary.task_groups[0];
  const second = summary.task_groups[1];

  assert.equal(first.metrics.total_exposure, 230);
  assert.equal(first.metrics.input_tokens, 230);
  assert.equal(first.metrics.cached_input_tokens, 150);
  assert.equal(first.metrics.uncached_input_tokens, 80);
  assert.equal(first.metrics.output_tokens, 18);
  assert.ok(first.top_artifact_ids.includes("OUT:exec:setup"));

  assert.equal(second.metrics.total_exposure, 205);
  assert.equal(second.metrics.artifact_count, 3);
});

test("marks cross-group persistence and heuristic confidence", async () => {
  const summary = analyzeEvents(await fixture("task-groups.jsonl"));
  const repeated = summary.task_groups.filter((group) => group.artifact_ids.includes("OUT:exec:setup"));

  assert.equal(repeated.length, 2);
  assert.equal(summary.analyzers.find((analyzer) => analyzer.analyzer_id === "task-groups").metrics.cross_group_artifact_count, 1);
  assert.ok(summary.task_groups.every((group) => group.confidence === "partial"));
});
