import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { ARTIFACT_TYPES, createArtifactEvent } from "../events/index.ts";
import { normalizeStorageMode } from "../privacy/index.ts";
import { JsonlEventStore } from "../store/index.ts";
import { countTokens } from "../tokenization/index.ts";

export { ARTIFACT_TYPES };

type CaptureWriterOptions = {
  runId?: string;
  rootDir?: string;
  tokenCounter?: (content: unknown) => number;
  tokenizerName?: string;
  store?: { append(event: unknown): Promise<void> };
  clock?: () => Date;
  storageMode?: string;
};

type CaptureRecordInput = {
  requestId: string;
  artifactType: string;
  artifactName: string;
  artifactId?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  artifactIndex?: number;
  tokenStart?: number;
  tokenEnd?: number;
};

/**
 * Capture boundary used by adapters and CLI commands.
 *
 * The profiler deliberately emits canonical artifact events only; provider
 * payload details must already have been mapped into artifact metadata before
 * they reach this class.
 */
export class TokenProfiler {
  runId: string;
  tokenCounter: (content: unknown) => number;
  tokenizerName: string;
  store: { append(event: unknown): Promise<void> };
  clock: () => Date;
  storageMode: string;
  pendingWrites: Promise<void>[];

  constructor({
    runId = randomUUID(),
    rootDir = join(homedir(), ".token-profiler"),
    tokenCounter = countTokens,
    tokenizerName = "o200k_base",
    store = new JsonlEventStore({ rootDir, runId }),
    clock = () => new Date(),
    storageMode
  }: CaptureWriterOptions = {}) {
    this.runId = runId;
    this.tokenCounter = tokenCounter;
    this.tokenizerName = tokenizerName;
    this.store = store;
    this.clock = clock;
    this.storageMode = normalizeStorageMode({ storageMode: storageMode as any });
    this.pendingWrites = [];
  }

  /**
   * Fire-and-forget capture for wrapping an observed value inline.
   *
   * The original content is returned so callers can instrument data flow
   * without changing the value they forward to the provider or command.
   */
  track(input: CaptureRecordInput): unknown {
    const event = this.createEvent(input);
    this.pendingWrites.push(this.store.append(event));
    return input.content;
  }

  /** Captures from the caller's perspective and returns the canonical event for tests or adapters. */
  record(input: CaptureRecordInput): unknown {
    const event = this.createEvent(input);
    this.pendingWrites.push(this.store.append(event));
    return event;
  }

  /** Persists the canonical event before returning it to callers that need write ordering. */
  async recordAsync(input: CaptureRecordInput): Promise<unknown> {
    const event = this.createEvent(input);
    await this.store.append(event);
    return event;
  }

  /** Waits for queued fire-and-forget writes and clears the queue for the next capture batch. */
  async flush(): Promise<void> {
    const pendingWrites = this.pendingWrites;
    this.pendingWrites = [];
    await Promise.all(pendingWrites);
  }

  /** Builds the canonical artifact event without persisting it. */
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
  }: CaptureRecordInput): unknown {
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
