# Canonical Core API Contract

The core layer owns the public canonical APIs that adapters write to and
analyzers read from. External modules should use the imports listed here rather
than reaching through implementation files.

## Event APIs

Import from `src/core/events/index.ts`.

```ts
const ARTIFACT_TYPES: readonly string[];

function createArtifactEvent(input: {
  runId: string;
  requestId: string;
  artifactType: string;
  artifactName: string;
  artifactId?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  artifactIndex?: number;
  tokenStart?: number;
  tokenEnd?: number;
  tokenCounter: (content: unknown) => number;
  tokenizerName: string;
  storageMode: StorageMode;
  timestamp: string;
}): ArtifactEvent;

function createRequestUsageEvent(input: {
  runId: string;
  requestId: string;
  responseId?: string;
  usage?: {
    input_tokens?: number;
    prompt_tokens?: number;
    cached_input_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    prompt_tokens_details?: { cached_tokens?: number };
    output_tokens?: number;
    completion_tokens?: number;
    output_tokens_details?: { reasoning_tokens?: number };
    total_tokens?: number;
  };
  timestamp: string;
}): RequestUsageEvent;

function createRequestTurnIdentityEvent(input: {
  runId: string;
  requestId: string;
  turnId?: string;
  turnIdentitySource: "direct_turn_id" | "missing" | "malformed";
  turnStartedAt?: string;
  caveats?: EventCaveat[];
  timestamp: string;
}): RequestTurnIdentityEvent;

function validateEvent(event: unknown): CanonicalEvent;
function validateArtifactEvent(event: unknown): ArtifactEvent;
function validateRequestUsageEvent(event: unknown): RequestUsageEvent;
function validateRequestTurnIdentityEvent(event: unknown): RequestTurnIdentityEvent;
```

These constructors create validated canonical event records from already-mapped
inputs. Validation functions throw when a record is malformed.

Import event types from `src/core/events/types.ts`.

- `ArtifactEvent`, `RequestUsageEvent`, `RequestTurnIdentityEvent`, and
  `CanonicalEvent`: persisted canonical event shapes.
- `RequestSummary`, `RequestArtifactSummary`, `ArtifactAggregate`, and
  `AggregateSummary`: canonical summary shapes consumed by analyzers.

## Store APIs

Import from `src/core/store/index.ts`.

```ts
class JsonlEventStore {
  constructor(options: { rootDir?: string; runId: string });
  append(event: unknown): Promise<void>;
  readAll(): Promise<unknown[]>;
}

function readEventsFromRunDir(runDir: string): Promise<unknown[]>;
```

`JsonlEventStore` writes to `<rootDir>/runs/<runId>/events.jsonl`.
`readEventsFromRunDir` reads `events.jsonl` from an already resolved run
directory and throws if the file is missing or invalid JSONL.

## Capture APIs

Import from `src/core/capture/index.ts`.

```ts
type CaptureWriterOptions = {
  runId?: string;
  rootDir?: string;
  tokenCounter?: (content: unknown) => number;
  tokenizerName?: string;
  store?: { append(event: unknown): Promise<void> };
  clock?: () => Date;
  storageMode?: StorageMode;
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

class TokenProfiler {
  runId: string;
  constructor(options?: CaptureWriterOptions);
  track(input: CaptureRecordInput): unknown;
  record(input: CaptureRecordInput): ArtifactEvent;
  recordAsync(input: CaptureRecordInput): Promise<ArtifactEvent>;
  flush(): Promise<void>;
  createEvent(input: CaptureRecordInput): ArtifactEvent;
}
```

`track` returns the original `content` after queueing a write. `record` and
`recordAsync` return the canonical event; `recordAsync` waits for persistence.

## Privacy, Hashing, And Tokenization APIs

Import from `src/core/privacy/index.ts`.

```ts
type StorageMode = "metadata" | "preview" | "raw";
const STORAGE_MODES: readonly StorageMode[];

function normalizeStorageMode(options?: { storageMode?: StorageMode }): StorageMode;
function applyStorageMode(
  event: Record<string, unknown>,
  content: unknown,
  storageMode: StorageMode
): Record<string, unknown>;
function createContentPreview(
  content: unknown,
  options?: { maxChars?: number }
): {
  head: string;
  tail: string;
  char_count: number;
  line_count: number;
  truncated: boolean;
};
```

Import from `src/core/hash/index.ts`.

```ts
function sha256(content: unknown): string;
```

Import from `src/core/tokenization/index.ts`.

```ts
function countTokens(content: unknown): number;
const estimateTokens: typeof countTokens;
```

## Invariants

- Core event shapes are provider-neutral.
- Provider payloads must be mapped by adapters before they reach core APIs.
- Privacy storage-mode rules are enforced at the event boundary.
- Analyzers should consume canonical events and summaries, not adapter data.
