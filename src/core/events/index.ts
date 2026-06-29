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
    total_tokens: Number(usage?.total_tokens) || inputTokens + outputTokens,
    timestamp
  });
}

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

export function validateEvent(event: unknown): CanonicalEvent {
  const candidate = event as any;
  if (candidate?.event_kind === "artifact") return validateArtifactEvent(candidate);
  if (candidate?.event_kind === "request_usage") return validateRequestUsageEvent(candidate);
  if (candidate?.event_kind === "request_turn_identity") return validateRequestTurnIdentityEvent(candidate);
  throw new Error(`Unsupported event_kind "${candidate?.event_kind}".`);
}

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

export function validateRequestUsageEvent(event: any): RequestUsageEvent {
  requireField(event, "schema_version");
  requireExact(event, "event_kind", "request_usage");
  requireString(event, "run_id");
  requireString(event, "request_id");
  requireNumber(event, "input_tokens");
  requireNumber(event, "cached_input_tokens");
  requireNumber(event, "uncached_input_tokens");
  requireNumber(event, "output_tokens");
  requireNumber(event, "total_tokens");
  requireString(event, "timestamp");
  return event;
}

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
