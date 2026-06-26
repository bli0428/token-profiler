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
  assert.equal(analysis.totals.total_exposure, legacy.totals.total_exposure);
  assert.equal(analysis.top_contributors[0].artifact_id, legacy.top_contributors[0].artifact_id);
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
