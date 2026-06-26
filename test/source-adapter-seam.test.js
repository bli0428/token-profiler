import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { aggregateEvents } from "../src/analysis/aggregate.ts";
import { writeFixtureSourceRun } from "../src/ingest/fixture-source/index.ts";

test("fixture-only non-Codex adapter emits canonical records and limitations", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "fixture-source-test-"));

  try {
    const result = await writeFixtureSourceRun({ runId: "fixture-run", rootDir });
    assert.deepEqual(result, { artifactCount: 2, usageCount: 1, limitationCount: 1 });

    const events = (await readFile(join(rootDir, "runs", "fixture-run", "events.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(events.length, 3);
    assert.equal(events.every((event) => event.run_id === "fixture-run"), true);
    assert.equal(events.filter((event) => event.event_kind === "artifact").length, 2);
    assert.equal(events.filter((event) => event.event_kind === "request_usage").length, 1);
    assert.equal(events.some((event) => event.metadata?.source_id === "fixture-source"), true);
    assert.equal(events.some((event) => event.metadata?.limitation_code === "prompt_composition_unavailable"), true);

    const summary = aggregateEvents(events);
    assert.equal(summary.totals.request_count, 1);
    assert.equal(summary.totals.artifact_count, 2);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
