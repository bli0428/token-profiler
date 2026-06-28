import assert from "node:assert/strict";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import {
  requestAccountingEvents,
  requestArtifactInclusionEvents
} from "./helpers/request-accounting-fixtures.js";
import { usage } from "./helpers/analyzer-fixtures.js";

test("request accounting exposes provider usage rows in deterministic chronology", () => {
  const summary = analyzeEvents([
    ...requestAccountingEvents(),
    usage("req_usage_only", 3, 0, 1)
  ]);
  const accounting = summary.request_accounting;

  assert.equal(accounting.analyzer_id, "request-accounting");
  assert.deepEqual(accounting.rows.map((row) => row.request_id), [
    "req_early",
    "req_same_a",
    "req_same_b",
    "req_missing",
    "req_usage_only"
  ]);
  assert.deepEqual(accounting.rows.map((row) => row.chronology_index), [0, 1, 2, 3, 4]);
  assert.equal(accounting.summary.highest_total_request_id, "req_same_b");
  assert.equal(accounting.summary.highest_uncached_request_id, "req_same_b");

  const same = accounting.rows.find((row) => row.request_id === "req_same_b");
  assert.equal(same.usage.input_tokens, 30);
  assert.equal(same.usage.cached_input_tokens, 20);
  assert.equal(same.usage.uncached_input_tokens, 10);
  assert.equal(same.usage.output_tokens, 5);
  assert.equal(same.usage.total_tokens, 35);
  assert.equal(same.usage.source, "provider_reported");

  const missing = accounting.rows.find((row) => row.request_id === "req_missing");
  assert.equal(missing.usage, undefined);
  assert.equal(missing.availability.usage_status, "missing");
  assert.equal(missing.availability.missing_facts.includes("request_usage"), true);

  const usageOnly = accounting.rows.find((row) => row.request_id === "req_usage_only");
  assert.equal(usageOnly.artifact_count, 0);
  assert.equal(usageOnly.availability.status, "complete");
  assert.equal(usageOnly.availability.attribution_status, "not_applicable");
});

test("request accounting exposes request-scoped artifact inclusions and attribution availability", () => {
  const summary = analyzeEvents(requestArtifactInclusionEvents());
  const accounting = summary.request_accounting;
  const detail = accounting.rows.find((row) => row.request_id === "req_detail");

  assert.equal(detail.artifact_count, 2);
  assert.equal(detail.total_local_artifact_tokens, 20);
  assert.deepEqual(detail.artifact_inclusions.map((inclusion) => inclusion.artifact_id), [
    "CALL:exec:detail",
    "OUT:exec:detail"
  ]);
  assert.equal(detail.artifact_inclusions[0].request_order, 0);
  assert.equal(detail.artifact_inclusions[0].local_token_count, 5);
  assert.equal(detail.artifact_inclusions[0].estimated_cached_input_tokens, 5);
  assert.equal(detail.artifact_inclusions[1].estimated_cached_input_tokens, 3);
  assert.equal(detail.artifact_inclusions[1].estimated_uncached_input_tokens, 12);
  assert.equal(detail.caveats.some((caveat) => caveat.code === "local_artifact_attribution_estimate"), true);

  const noOffsets = accounting.rows.find((row) => row.request_id === "req_no_offsets");
  assert.equal(noOffsets.artifact_inclusions[0].estimated_cached_input_tokens, undefined);
  assert.equal(noOffsets.availability.attribution_status, "unavailable");
  assert.equal(noOffsets.availability.missing_facts.includes("artifact_offsets"), true);
});
