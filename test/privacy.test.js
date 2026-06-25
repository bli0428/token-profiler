import assert from "node:assert/strict";
import test from "node:test";
import { applyStorageMode, createContentPreview, normalizeStorageMode } from "../src/privacy.js";

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
