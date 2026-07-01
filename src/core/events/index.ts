import { sha256 } from "../hash/index.ts";
import { applyStorageMode, STORAGE_MODES } from "../privacy/index.ts";
import type { ArtifactEvent, CanonicalEvent, RequestTurnIdentityEvent, RequestUsageEvent } from "./types.ts";

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

/**
 * Creates the canonical artifact fact shared by analyzers and surfaces.
 *
 * Content is hashed and token-counted before privacy policy is applied, so
 * analyzers can compare exposure without requiring raw content to be stored.
 */
export function createArtifactEvent({
  runId,
  requestId,
  artifactType,
  artifactName,
  artifactId = `${artifactType}:${artifactName}`,
  content,
  metadata,
  artifactIndex,
  tokenStart,
  tokenEnd,
  tokenCounter,
  tokenizerName,
  storageMode,
  timestamp
}: any) {
  if (!runId) throw new Error("Artifact event requires runId.");
  if (!requestId) throw new Error("Artifact event requires requestId.");
  if (!ARTIFACT_TYPES.includes(artifactType)) {
    throw new Error(`Unsupported artifactType "${artifactType}".`);
  }
  if (!artifactName) throw new Error("Artifact event requires artifactName.");
  if (typeof tokenCounter !== "function") throw new Error("Artifact event requires tokenCounter.");
  if (!tokenizerName) throw new Error("Artifact event requires tokenizerName.");

  const normalizedContent = String(content ?? "");
  const event: Record<string, any> = {
    schema_version: 1,
    event_kind: "artifact",
    run_id: runId,
    request_id: requestId,
    artifact_id: artifactId,
    artifact_type: artifactType,
    artifact_name: artifactName,
    content_hash: sha256(normalizedContent),
    local_token_count: tokenCounter(normalizedContent),
    tokenizer: tokenizerName,
    timestamp
  };

  if (Number.isInteger(artifactIndex)) event.artifact_index = artifactIndex;
  if (Number.isFinite(tokenStart) && Number.isFinite(tokenEnd)) {
    event.token_start = tokenStart;
    event.token_end = tokenEnd;
  }
  event.metadata = metadata && Object.keys(metadata).length > 0 ? metadata : {};

  return validateArtifactEvent(applyStorageMode(event, normalizedContent, storageMode));
}

/**
 * Normalizes provider usage payloads into the canonical request usage fact.
 *
 * The accepted aliases cover OpenAI-style prompt/completion naming and newer
 * input/output naming while keeping downstream analysis provider-neutral.
 */
export function createRequestUsageEvent({
  runId,
  requestId,
  responseId,
  usage,
  timestamp
}: any) {
  if (!runId) throw new Error("Usage event requires runId.");
  if (!requestId) throw new Error("Usage event requires requestId.");

  const inputTokens = Number(usage?.input_tokens ?? usage?.prompt_tokens) || 0;
  const cachedTokens = Number(
    usage?.input_tokens_details?.cached_tokens
      ?? usage?.prompt_tokens_details?.cached_tokens
      ?? usage?.cached_input_tokens
  ) || 0;
  const outputTokens = Number(usage?.output_tokens ?? usage?.completion_tokens) || 0;
  const reasoningTokens = Number(usage?.output_tokens_details?.reasoning_tokens) || 0;

  return validateRequestUsageEvent({
    schema_version: 1,
    event_kind: "request_usage",
    run_id: runId,
    request_id: requestId,
    response_id: responseId,
    input_tokens: inputTokens,
    cached_input_tokens: cachedTokens,
    uncached_input_tokens: Math.max(0, inputTokens - cachedTokens),
    output_tokens: outputTokens,
    ...(reasoningTokens > 0 ? { reasoning_tokens: reasoningTokens } : {}),
    total_tokens: Number(usage?.total_tokens) || inputTokens + outputTokens,
    timestamp
  });
}

/**
 * Records request-to-turn identity as a first-class canonical fact.
 *
 * Missing and malformed identities are represented explicitly so analyzers can
 * surface fallback grouping instead of inventing hidden IDs.
 */
export function createRequestTurnIdentityEvent({
  runId,
  requestId,
  turnId,
  turnIdentitySource,
  turnStartedAt,
  caveats = [],
  timestamp
}: any) {
  if (!runId) throw new Error("Request turn identity event requires runId.");
  if (!requestId) throw new Error("Request turn identity event requires requestId.");

  const event: Record<string, any> = {
    schema_version: 1,
    event_kind: "request_turn_identity",
    run_id: runId,
    request_id: requestId,
    turn_identity_source: turnIdentitySource,
    caveats,
    timestamp
  };

  if (typeof turnId === "string" && turnId.length > 0) event.turn_id = turnId;
  if (typeof turnStartedAt === "string" && turnStartedAt.length > 0) event.turn_started_at = turnStartedAt;

  return validateRequestTurnIdentityEvent(event);
}

/** Dispatches validation by canonical event kind for JSONL store reads. */
export function validateEvent(event: unknown): CanonicalEvent {
  const candidate = event as any;
  if (candidate?.event_kind === "artifact") return validateArtifactEvent(candidate);
  if (candidate?.event_kind === "request_usage") return validateRequestUsageEvent(candidate);
  if (candidate?.event_kind === "request_turn_identity") return validateRequestTurnIdentityEvent(candidate);
  throw new Error(`Unsupported event_kind "${candidate?.event_kind}".`);
}

/**
 * Enforces the artifact event contract at the canonical store boundary.
 *
 * Privacy invariants live here: metadata mode cannot carry content, preview
 * mode cannot carry raw content, and raw mode must include explicit content.
 */
export function validateArtifactEvent(event: any): ArtifactEvent {
  requireField(event, "schema_version");
  requireExact(event, "event_kind", "artifact");
  requireString(event, "run_id");
  requireString(event, "request_id");
  requireString(event, "artifact_id");
  requireString(event, "artifact_type");
  requireString(event, "artifact_name");
  requireString(event, "content_hash");
  requireNumber(event, "local_token_count");
  requireString(event, "tokenizer");
  requireString(event, "timestamp");
  requireStorageMode(event);

  if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) {
    throw new Error("Artifact event requires metadata object.");
  }
  if (event.storage_mode === "metadata" && ("content" in event || "preview" in event)) {
    throw new Error("metadata storage mode must not include content or preview.");
  }
  if (event.storage_mode === "preview" && (!("preview" in event) || "content" in event)) {
    throw new Error("preview storage mode requires preview and must not include content.");
  }
  if (event.storage_mode === "raw" && !("content" in event)) {
    throw new Error("raw storage mode requires content.");
  }

  return event;
}

/** Validates canonical request usage facts before analyzers consume them. */
export function validateRequestUsageEvent(event: any): RequestUsageEvent {
  requireField(event, "schema_version");
  requireExact(event, "event_kind", "request_usage");
  requireString(event, "run_id");
  requireString(event, "request_id");
  requireNumber(event, "input_tokens");
  requireNumber(event, "cached_input_tokens");
  requireNumber(event, "uncached_input_tokens");
  requireNumber(event, "output_tokens");
  if (event.reasoning_tokens !== undefined) requireNumber(event, "reasoning_tokens");
  requireNumber(event, "total_tokens");
  requireString(event, "timestamp");
  return event;
}

/** Validates canonical turn identity facts, including explicit fallback states. */
export function validateRequestTurnIdentityEvent(event: any): RequestTurnIdentityEvent {
  requireField(event, "schema_version");
  requireExact(event, "event_kind", "request_turn_identity");
  requireString(event, "run_id");
  requireString(event, "request_id");
  requireString(event, "turn_identity_source");
  if (!["direct_turn_id", "missing", "malformed"].includes(event.turn_identity_source)) {
    throw new Error("Request turn identity event requires valid turn_identity_source.");
  }
  if (event.turn_identity_source === "direct_turn_id") requireString(event, "turn_id");
  if (event.turn_id !== undefined) requireString(event, "turn_id");
  if (event.turn_started_at !== undefined) requireString(event, "turn_started_at");
  if (!Array.isArray(event.caveats)) {
    throw new Error("Request turn identity event requires caveats array.");
  }
  for (const caveat of event.caveats) validateCaveat(caveat);
  requireString(event, "timestamp");
  return event;
}

function requireField(event: any, key: string) {
  if (event?.[key] === undefined) throw new Error(`Event requires ${key}.`);
}

function requireExact(event: any, key: string, expected: string) {
  if (event?.[key] !== expected) {
    throw new Error(`Event requires ${key} to be "${expected}".`);
  }
}

function requireString(event: any, key: string) {
  if (typeof event?.[key] !== "string" || event[key].length === 0) {
    throw new Error(`Event requires string ${key}.`);
  }
}

function requireNumber(event: any, key: string) {
  if (!Number.isFinite(Number(event?.[key]))) {
    throw new Error(`Event requires numeric ${key}.`);
  }
}

function requireStorageMode(event: any) {
  if (!STORAGE_MODES.includes(event?.storage_mode)) {
    throw new Error("Artifact event requires valid storage_mode.");
  }
}

function validateCaveat(caveat: any) {
  if (!caveat || typeof caveat !== "object" || Array.isArray(caveat)) {
    throw new Error("Event caveats must be objects.");
  }
  requireString(caveat, "code");
  if (!["info", "warning"].includes(caveat.severity)) {
    throw new Error("Event caveat requires valid severity.");
  }
  requireString(caveat, "message");
}
