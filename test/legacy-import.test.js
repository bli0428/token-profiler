import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { aggregateEvents } from "../src/aggregate.js";
import { importLegacyEvents } from "../src/legacy-import.js";

test("imports legacy MVP artifact fields before analysis", async () => {
  const legacy = await readJsonl("test/fixtures/legacy-events/mvp.jsonl");
  const events = importLegacyEvents(legacy);

  assert.equal(events[0].event_kind, "artifact");
  assert.equal(events[0].local_token_count, 12);
  assert.equal("token_count" in events[0], false);
  assert.equal(events[0].storage_mode, "metadata");
  assert.equal(events[1].storage_mode, "raw");
  assert.equal(events[1].content, "full output");

  const summary = aggregateEvents(events);
  assert.equal(summary.totals.total_exposure, 42);
  assert.equal(summary.totals.input_tokens, 50);
});

test("aggregate rejects legacy fields unless the importer is used", async () => {
  const legacy = await readJsonl("test/fixtures/legacy-events/mvp.jsonl");
  assert.throws(() => aggregateEvents(legacy), /event_kind|local_token_count/);
});

async function readJsonl(path) {
  return (await readFile(path, "utf8")).trim().split("\n").map(JSON.parse);
}
