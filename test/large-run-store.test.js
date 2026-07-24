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

test("streamEventsFromRunDir reads only newline-terminated events while a file is appended", async () => {
  const runDir = join(tmpdir(), `token-profiler-stream-tail-${Date.now()}`, "runs", "run");
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), '{"one":1}\n{"two":2}');

  const events = [];
  for await (const event of streamEventsFromRunDir(runDir)) events.push(event);

  assert.deepEqual(events, [{ one: 1 }]);
});

test("streamEventsFromRunDir reports malformed complete lines with their line number", async () => {
  const runDir = join(tmpdir(), `token-profiler-stream-invalid-${Date.now()}`, "runs", "run");
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), '{"one":1}\nnot-json\n');

  await assert.rejects(
    async () => {
      for await (const _event of streamEventsFromRunDir(runDir)) {
        // Consume the stream so the parse failure is observed.
      }
    },
    /events\.jsonl:2/
  );
});
