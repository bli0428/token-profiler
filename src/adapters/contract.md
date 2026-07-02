# Adapters API Contract

Adapters are the public integration layer for source-specific data. External
modules should use the exports listed here and should only receive canonical
records or adapter-owned metadata from this layer.

## Shared Adapter Types

Import from `src/adapters/source-adapter.ts`.

```ts
type AdapterCapability =
  | "live-capture"
  | "log-import"
  | "telemetry-import"
  | "config-helper"
  | "fixture";

type AdapterCaptureMethod = "live" | "import" | "telemetry" | "fixture";
type AdapterLimitationSeverity = "info" | "partial" | "unavailable";

type AdapterLimitation = {
  code: string;
  message: string;
  severity: AdapterLimitationSeverity;
  appliesTo: "session" | "request" | "artifact" | "usage" | "tool";
};

type AdapterDescriptor = {
  id: string;
  displayName: string;
  capabilities: AdapterCapability[];
  limitations?: AdapterLimitation[];
};

type AdapterRecordMetadata = {
  source_id: string;
  capture_method: AdapterCaptureMethod;
  adapter_version?: string;
};
```

## Codex Adapter APIs

Import from `src/adapters/codex/index.ts`.

```ts
const codexAdapter: AdapterDescriptor;

function createProfilerProxy(options: {
  profiler?: TokenProfiler;
  sessionRouter?: SessionRouter;
  upstream: string | URL;
  host?: string;
  port?: number;
  maxBodyBytes?: number;
  logger?: Pick<Console, "error" | "log">;
}): {
  server: import("node:http").Server;
  host: string;
  port: number;
  listen(): Promise<unknown>;
  close(): Promise<void>;
};

function buildUpstreamUrl(upstream: string | URL, incomingPath: string): URL;

function enableCodexProxyConfig(
  config: string,
  proxyUrl: string,
  now?: Date
): string;

function disableCodexProxyConfig(config: string, state: unknown): string;

function createSessionId(now?: Date): string;
function sanitizeSessionId(value?: unknown): string;

class SessionRouter {
  constructor(options: {
    rootDir: string;
    storageMode?: string;
    fallbackSessionId?: string | null;
    idleMs?: number;
    clock?: () => Date;
  });
  resolve(input: {
    headers?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  }): {
    sessionId: string;
    source: string;
    timestamp: string;
    turnIdentity: unknown;
  };
  getProfiler(sessionId: unknown): TokenProfiler;
  registerResponse(responseId: unknown, sessionId: unknown): void;
  flush(): Promise<void>;
}

function recordRequestArtifacts(input: {
  profiler: TokenProfiler;
  requestId: string;
  body: Buffer;
  requestPath?: string;
  contentEncoding?: unknown;
  maxBodyBytes?: number;
}): Promise<number>;

function extractResponsesArtifacts(payload: unknown): CodexExtractedArtifact[];

function importCodexRolloutUsage(input: {
  rolloutPath: string;
  runId: string;
  rootDir?: string;
}): Promise<{ imported: number; skipped: number }>;

function readCodexSessionMetadata(input: {
  codexHome: string;
  maxRollouts?: number;
}): Promise<{
  index: Map<string, unknown>;
  rollouts: unknown[];
}>;

function enrichProfilerSessions(
  sessions: unknown[],
  metadata: { index: Map<string, unknown>; rollouts: unknown[] },
  options?: { maxTimeDeltaMs?: number }
): unknown[];
```

## Codex Artifact Types

Import Codex artifact metadata types from
`src/adapters/codex/live-proxy/artifacts/index.ts` only when code is still
inside the adapter boundary or adapter tests. These types describe extracted
Codex artifacts before they become canonical records.

## Fixture Source APIs

Import from `src/adapters/fixture-source/index.ts`.

```ts
const FIXTURE_SOURCE_ID: "fixture-source";
const FIXTURE_ADAPTER_VERSION: "1";

function writeFixtureSourceRun(input: {
  runId: string;
  rootDir?: string;
  storageMode?: string;
}): Promise<{
  artifactCount: number;
  usageCount: number;
  limitationCount: number;
}>;
```

## Invariants

- Provider-specific payloads and transport details stay inside adapters.
- Adapter outputs that cross into core or analysis must be canonical records.
- Other layers must not depend on adapter-private payload shapes or raw
  provider metadata.
