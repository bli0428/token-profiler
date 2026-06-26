import assert from "node:assert/strict";
import test from "node:test";
import { createArtifactEvent, createRequestUsageEvent, validateEvent } from "../src/core/events/index.ts";

test("creates strict metadata-only artifact events", () => {
  const event = createArtifactEvent({
    runId: "run_1",
    requestId: "req_1",
    artifactType: "FILE",
    artifactName: "src/app.js",
    content: "hello world",
    tokenCounter: (content) => content.split(" ").length,
    tokenizerName: "test_tokenizer",
    storageMode: "metadata",
    timestamp: "2026-06-25T12:00:00.000Z"
  });

  assert.equal(event.event_kind, "artifact");
  assert.equal(event.local_token_count, 2);
  assert.equal(event.storage_mode, "metadata");
  assert.deepEqual(event.metadata, {});
  assert.equal("token_count" in event, false);
  assert.equal("content" in event, false);
  assert.equal("preview" in event, false);
});

test("validates usage events from provider usage", () => {
  const event = createRequestUsageEvent({
    runId: "run_1",
    requestId: "req_1",
    responseId: "resp_1",
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 40 },
      output_tokens: 9,
      total_tokens: 109
    },
    timestamp: "2026-06-25T12:00:01.000Z"
  });

  assert.equal(event.event_kind, "request_usage");
  assert.equal(event.cached_input_tokens, 40);
  assert.equal(event.uncached_input_tokens, 60);
  assert.equal(validateEvent(event), event);
});

test("rejects older MVP artifact fields in the new contract", () => {
  assert.throws(
    () => validateEvent({
      schema_version: 1,
      event_kind: "artifact",
      run_id: "run_1",
      request_id: "req_1",
      artifact_id: "FILE:src/app.js",
      artifact_type: "FILE",
      artifact_name: "src/app.js",
      content_hash: "hash",
      token_count: 10,
      tokenizer: "o200k_base",
      timestamp: "2026-06-25T12:00:00.000Z",
      storage_mode: "metadata",
      metadata: {}
    }),
    /local_token_count/
  );
});
