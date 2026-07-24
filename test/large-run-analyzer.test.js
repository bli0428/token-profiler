import assert from "node:assert/strict";
import test from "node:test";
import { pageLargeRunRequests, summarizeLargeRun } from "../src/analysis/index.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("large-run projection retains request facts and supports bounded newest-first pages", async () => {
  const events = [
    artifact("old", "old-artifact", "FILE", "old.ts", "old", 3, 0, 3),
    usage("old", 10, 2),
    usage("usage-only", 20, 5),
    artifact("new", "new-artifact", "FILE", "new.ts", "new", 4, 0, 4),
    usage("new", 30, 10)
  ].map((event, index) => ({ ...event, timestamp: `2026-06-23T12:00:0${index}.000Z` }));

  const summary = await summarizeLargeRun(events);
  assert.deepEqual(summary.requests.map((row) => row.request_id), ["new", "usage-only", "old"]);
  assert.equal(summary.artifact_count, 2);
  assert.equal(summary.input_tokens, 60);
  assert.equal(summary.requests[0].artifact_count, 1);
  assert.equal(summary.requests[1].artifact_count, 0);

  const firstPage = pageLargeRunRequests(summary.requests, 0, 2);
  assert.deepEqual(firstPage.items.map((row) => row.request_id), ["new", "usage-only"]);
  assert.equal(firstPage.nextOffset, 2);
});

test("large-run projection preserves canonical turn and provider usage facts across timestamp ties", async () => {
  const timestamp = "2026-06-23T12:00:09.000Z";
  const events = [
    usage("alpha", 100, 80, 7),
    { schema_version: 1, event_kind: "request_turn_identity", run_id: "run_test", request_id: "alpha", turn_id: "turn_alpha", turn_identity_source: "direct_turn_id", caveats: [], timestamp },
    usage("beta", 90, 20, 3)
  ].map((event) => ({ ...event, timestamp }));

  const summary = await summarizeLargeRun(events);

  assert.deepEqual(summary.requests.map((row) => row.request_id), ["beta", "alpha"]);
  assert.equal(summary.requests[1].turn_id, "turn_alpha");
  assert.deepEqual(summary.requests[1].usage, {
    input_tokens: 100,
    cached_input_tokens: 80,
    uncached_input_tokens: 20,
    output_tokens: 7,
    total_tokens: 107
  });
});
