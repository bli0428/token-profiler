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
  storeContent?: boolean;
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
    storeContent = false,
    storageMode
  }: CaptureWriterOptions = {}) {
    this.runId = runId;
    this.tokenCounter = tokenCounter;
    this.tokenizerName = tokenizerName;
    this.store = store;
    this.clock = clock;
    this.storageMode = normalizeStorageMode({ storageMode: storageMode as any, storeContent });
    this.pendingWrites = [];
  }

  track(input: CaptureRecordInput): unknown {
    const event = this.createEvent(input);
    this.pendingWrites.push(this.store.append(event));
    return input.content;
  }

  record(input: CaptureRecordInput): unknown {
    const event = this.createEvent(input);
    this.pendingWrites.push(this.store.append(event));
    return event;
  }

  async recordAsync(input: CaptureRecordInput): Promise<unknown> {
    const event = this.createEvent(input);
    await this.store.append(event);
    return event;
  }

  async flush(): Promise<void> {
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
