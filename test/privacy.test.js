import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatArtifactDetail } from "../src/analysis/legibility.ts";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { applyStorageMode, createContentPreview, normalizeStorageMode } from "../src/core/privacy/index.ts";

const baseEvent = {
  schema_version: 1,
  event_kind: "artifact",
  storage_mode: "metadata"
};

test("metadata mode stores no content or preview", () => {
  const event = applyStorageMode({ ...baseEvent, content: "old", preview: {} }, "secret", "metadata");

  assert.equal(event.storage_mode, "metadata");
  assert.equal("content" in event, false);
  assert.equal("preview" in event, false);
});

test("preview mode stores bounded excerpts without raw content", () => {
  const event = applyStorageMode(baseEvent, "a".repeat(1000), "preview");

  assert.equal(event.storage_mode, "preview");
  assert.equal("content" in event, false);
  assert.equal(event.preview.char_count, 1000);
  assert.equal(event.preview.truncated, true);
  assert.ok(event.preview.head.length + event.preview.tail.length <= 800);
});

test("raw mode stores full content explicitly", () => {
  const event = applyStorageMode(baseEvent, "secret", "raw");

  assert.equal(event.storage_mode, "raw");
  assert.equal(event.content, "secret");
  assert.equal("preview" in event, false);
});

test("storeContent maps to raw for existing callers", () => {
  assert.equal(normalizeStorageMode({ storeContent: true }), "raw");
  assert.equal(normalizeStorageMode({ storeContent: false }), "metadata");
  assert.equal(normalizeStorageMode({ storageMode: "preview", storeContent: true }), "preview");
});

test("content preview captures short text without truncation", () => {
  assert.deepEqual(createContentPreview("one\ntwo", { maxChars: 20 }), {
    head: "one\ntwo",
    tail: "",
    char_count: 7,
    line_count: 2,
    truncated: false
  });
});

async function fixture(name) {
  const text = await readFile(new URL(`./fixtures/events/${name}`, import.meta.url), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

test("legibility labels and task names respect metadata-only storage", async () => {
  const summary = analyzeEvents(await fixture("legibility-privacy.jsonl"));
  const metadata = summary.legibility.rows.find((row) => row.artifact_id === "MSG:user:metadata");

  assert.equal(metadata.preview_state, "hidden");
  assert.equal(metadata.display_name.includes("SECRET"), false);
  assert.ok(summary.task_groups.some((group) => group.privacy.prompt_available === false));
});

test("artifact detail distinguishes preview and raw permission states", async () => {
  const summary = analyzeEvents(await fixture("legibility-privacy.jsonl"));

  assert.match(formatArtifactDetail(summary, "OUT:exec:preview"), /Preview State:\s+preview/);
  assert.match(formatArtifactDetail(summary, "OUT:exec:preview"), /SECRET_PREVIEW/);
  assert.match(formatArtifactDetail(summary, "OUT:exec:raw"), /Preview State:\s+raw_available/);
});

test("hidden and unavailable privacy caveats remain visible", async () => {
  const summary = analyzeEvents(await fixture("legibility-privacy.jsonl"));
  const metadata = formatArtifactDetail(summary, "MSG:user:metadata");

  assert.match(metadata, /privacy_hidden/);
  assert.match(metadata, /Hidden Fields/);
});
