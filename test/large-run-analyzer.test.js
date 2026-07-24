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
