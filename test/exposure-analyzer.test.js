import assert from "node:assert/strict";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { artifact } from "./helpers/analyzer-fixtures.js";

test("exposure analyzer handles repeated and changed content", () => {
  const summary = analyzeEvents([
    artifact("req_1", "FILE:auth", "FILE", "auth.js", "hash_v1", 10),
    artifact("req_2", "FILE:auth", "FILE", "auth.js", "hash_v1", 10),
    artifact("req_3", "FILE:auth", "FILE", "auth.js", "hash_v2", 12)
  ]);

  assert.equal(summary.totals.total_exposure, 32);
  assert.equal(summary.totals.unique_exposure, 22);
  assert.equal(summary.totals.repeated_exposure, 10);
  assert.equal(summary.artifacts[0].distinct_hashes, 2);
});

test("exposure analyzer orders tied contributors deterministically", () => {
  const summary = analyzeEvents([
    artifact("req_1", "B:file", "FILE", "b.js", "hash_b", 10),
    artifact("req_1", "A:file", "FILE", "a.js", "hash_a", 10)
  ]);

  assert.deepEqual(summary.top_contributors.map((row) => row.artifact_id), ["A:file", "B:file"]);
});
