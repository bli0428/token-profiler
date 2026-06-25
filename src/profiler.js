import { randomUUID } from "node:crypto";
import { sha256 } from "./hash.js";
import { JsonlEventStore } from "./store.js";
import { countTokens } from "./tokenizer.js";

export const ARTIFACT_TYPES = Object.freeze([
  "SYSTEM_PROMPT",
  "USER_MESSAGE",
  "FILE",
  "REPO_MAP",
  "TOOL_OUTPUT",
  "SEARCH_RESULT",
  "ERROR_LOG",
  "TEST_OUTPUT",
  "SUMMARY",
  "CODEX_USAGE"
]);

export class TokenProfiler {
  constructor({
    runId = randomUUID(),
    rootDir = ".token-profiler",
    tokenCounter = countTokens,
    tokenizerName = "o200k_base",
    store = new JsonlEventStore({ rootDir, runId }),
    clock = () => new Date(),
    storeContent = false
  } = {}) {
    this.runId = runId;
    this.tokenCounter = tokenCounter;
    this.tokenizerName = tokenizerName;
    this.store = store;
    this.clock = clock;
    this.storeContent = storeContent;
    this.pendingWrites = [];
  }

  track({
    requestId,
    artifactType,
    artifactName,
    content,
    metadata,
    artifactId = `${artifactType}:${artifactName}`,
    artifactIndex,
    tokenStart,
    tokenEnd
  }) {
    const event = this.createEvent({
      requestId,
      artifactType,
      artifactName,
      artifactId,
      content,
      metadata,
      artifactIndex,
      tokenStart,
      tokenEnd
    });

    this.pendingWrites.push(this.store.append(event));
    return content;
  }

  record({
    requestId,
    artifactType,
    artifactName,
    artifactId = `${artifactType}:${artifactName}`,
    content,
    metadata,
    artifactIndex,
    tokenStart,
    tokenEnd
  }) {
    const event = this.createEvent({
      requestId,
      artifactType,
      artifactName,
      artifactId,
      content,
      metadata,
      artifactIndex,
      tokenStart,
      tokenEnd
    });

    this.pendingWrites.push(this.store.append(event));
    return event;
  }

  async recordAsync(input) {
    const event = this.createEvent(input);
    await this.store.append(event);
    return event;
  }

  async flush() {
    const pendingWrites = this.pendingWrites;
    this.pendingWrites = [];
    await Promise.all(pendingWrites);
  }

  createEvent({
    requestId,
    artifactType,
    artifactName,
    artifactId = `${artifactType}:${artifactName}`,
    content,
    metadata,
    artifactIndex,
    tokenStart,
    tokenEnd
  }) {
    if (!requestId) {
      throw new Error("record() requires requestId.");
    }

    if (!ARTIFACT_TYPES.includes(artifactType)) {
      throw new Error(`Unsupported artifactType "${artifactType}".`);
    }

    if (!artifactName) {
      throw new Error("record() requires artifactName.");
    }

    const normalizedContent = String(content ?? "");
    const event = {
      schema_version: 1,
      run_id: this.runId,
      request_id: requestId,
      artifact_id: artifactId,
      artifact_type: artifactType,
      artifact_name: artifactName,
      content_hash: sha256(normalizedContent),
      token_count: this.tokenCounter(normalizedContent),
      tokenizer: this.tokenizerName,
      timestamp: this.clock().toISOString()
    };

    if (Number.isInteger(artifactIndex)) {
      event.artifact_index = artifactIndex;
    }

    if (Number.isFinite(tokenStart) && Number.isFinite(tokenEnd)) {
      event.token_start = tokenStart;
      event.token_end = tokenEnd;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      event.metadata = metadata;
    }

    if (this.storeContent) {
      event.content = normalizedContent;
    }

    return event;
  }
}
