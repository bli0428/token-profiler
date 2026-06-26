import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { ARTIFACT_TYPES, createArtifactEvent } from "./core/events/index.ts";
import { JsonlEventStore } from "./core/store/index.ts";
import { countTokens } from "./tokenizer.js";
import { normalizeStorageMode } from "./core/privacy/index.ts";

export { ARTIFACT_TYPES };

export class TokenProfiler {
  constructor({
    runId = randomUUID(),
    rootDir = join(homedir(), ".token-profiler"),
    tokenCounter = countTokens,
    tokenizerName = "o200k_base",
    store = new JsonlEventStore({ rootDir, runId }),
    clock = () => new Date(),
    storeContent = false,
    storageMode
  } = {}) {
    this.runId = runId;
    this.tokenCounter = tokenCounter;
    this.tokenizerName = tokenizerName;
    this.store = store;
    this.clock = clock;
    this.storageMode = normalizeStorageMode({ storageMode, storeContent });
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
    return createArtifactEvent({
      runId: this.runId,
      requestId,
      artifactType,
      artifactName,
      artifactId,
      content,
      metadata,
      artifactIndex,
      tokenStart,
      tokenEnd,
      tokenCounter: this.tokenCounter,
      tokenizerName: this.tokenizerName,
      storageMode: this.storageMode,
      timestamp: this.clock().toISOString()
    });
  }
}
