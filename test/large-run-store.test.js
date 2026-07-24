import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { streamEventsFromRunDir } from "../src/core/store/index.ts";

test("streamEventsFromRunDir parses JSONL incrementally", async () => {
  const runDir = join(tmpdir(), `token-profiler-stream-${Date.now()}`, "runs", "run");
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), '{"one":1}\n{"two":2}\n');
  const events = [];
  for await (const event of streamEventsFromRunDir(runDir)) events.push(event);
  assert.deepEqual(events, [{ one: 1 }, { two: 2 }]);
});
