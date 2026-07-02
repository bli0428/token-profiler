import assert from "node:assert/strict";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("cache attribution preserves exact and under-attributed coverage", () => {
  const exact = analyzeEvents([
    artifact("req_1", "FILE:auth", "FILE", "auth.py", "hash_auth", 30, 0, 30),
    usage("req_1", 30, 10)
  ]);
  assert.equal(exact.totals.estimated_cache_attribution_coverage, 1);
  assert.equal(exact.artifacts[0].estimated_cached_input_tokens, 10);
  assert.equal(exact.artifacts[0].estimated_uncached_input_tokens, 20);

  const under = analyzeEvents([
    artifact("req_1", "FILE:auth", "FILE", "auth.py", "hash_auth", 10, 0, 10),
    usage("req_1", 30, 10)
  ]);
  assert.equal(under.totals.estimated_cache_attribution_coverage, 1 / 3);
});

test("cache attribution normalizes overlong reconstructed coordinates", () => {
  const summary = analyzeEvents([
    artifact("req_1", "SUMMARY:history", "SUMMARY", "history", "hash_history", 150, 0, 150),
    artifact("req_1", "TOOL_OUTPUT:build", "TOOL_OUTPUT", "build.log", "hash_build", 50, 150, 200),
    usage("req_1", 100, 80)
  ]);

  const buildLog = summary.artifacts.find((artifact) => artifact.artifact_name === "build.log");
  assert.equal(summary.totals.normalized_estimated_input_tokens, 100);
  assert.equal(summary.totals.estimated_cached_input_tokens, 80);
  assert.equal(summary.totals.estimated_uncached_input_tokens, 20);
  assert.equal(buildLog.estimated_cached_input_tokens, 5);
  assert.equal(buildLog.estimated_uncached_input_tokens, 20);
});

test("cache attribution exposes unavailable usage and caveats", () => {
  const summary = analyzeEvents([
    artifact("req_1", "FILE:auth", "FILE", "auth.py", "hash_auth", 10)
  ]);
  const result = summary.analyzers.find((analyzer) => analyzer.analyzer_id === "cache-attribution");
  assert.equal(result.availability.status, "unavailable");

  const withUsage = analyzeEvents([
    artifact("req_1", "FILE:auth", "FILE", "auth.py", "hash_auth", 10, 0, 10),
    usage("req_1", 10, 5)
  ]);
  assert.equal(withUsage.caveats.some((caveat) => caveat.code === "local_artifact_attribution_estimate"), true);
});
