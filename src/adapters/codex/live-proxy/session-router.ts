/**
 * Session routing for Codex live proxy captures.
 *
 * The router maps provider request and response hints to stable local run IDs,
 * then lazily creates one TokenProfiler per resolved session.
 */
import { randomUUID } from "node:crypto";
import { TokenProfiler } from "../../../core/capture/index.ts";
import { sha256 } from "../../../core/hash/index.ts";
import { normalizeStorageMode } from "../../../core/privacy/index.ts";
import { codexSessionRoute, parseCodexRequestEnvelope } from "./codex-envelope.ts";

const SESSION_HEADER = "x-token-profiler-session";

type SessionRouterOptions = {
  rootDir: string;
  storeContent?: boolean;
  storageMode?: string;
  fallbackSessionId?: string | null;
  idleMs?: number;
  clock?: () => Date;
};

type ResolvedSession = {
  sessionId: string;
  source: string;
  timestamp: string;
};

type FingerprintSession = {
  sessionId: string;
  lastSeenAt: number;
};

export class SessionRouter {
  rootDir: string;
  storageMode: string;
  fallbackSessionId: string | null;
  idleMs: number;
  clock: () => Date;
  profilers: Map<string, TokenProfiler>;
  responseSessions: Map<unknown, string>;
  fingerprintSessions: Map<string, FingerprintSession>;

  /**
   * Creates a router for resolving Codex traffic into profiler sessions.
   *
   * @param rootDir - Root directory where per-session profiler stores are written.
   * @param storeContent - Legacy boolean privacy option folded into `storageMode`.
   * @param storageMode - Explicit storage mode for created profilers.
   * @param fallbackSessionId - Optional run ID used when no session hint is available.
   * @param idleMs - Time window for reusing prompt-fingerprint sessions.
   * @param clock - Clock used for timestamps and deterministic tests.
   */
  constructor({
    rootDir,
    storeContent = false,
    storageMode,
    fallbackSessionId,
    idleMs = 30 * 60 * 1000,
    clock = () => new Date()
  }: SessionRouterOptions) {
    this.rootDir = rootDir;
    this.storageMode = normalizeStorageMode({ storageMode: storageMode as any, storeContent });
    this.fallbackSessionId = fallbackSessionId ? sanitizeSessionId(fallbackSessionId) : null;
    this.idleMs = idleMs;
    this.clock = clock;
    this.profilers = new Map();
    this.responseSessions = new Map();
    this.fingerprintSessions = new Map();
  }

  /**
   * Resolves request headers and payload fields into a profiler session.
   *
   * @param headers - Incoming request headers, checked first for an explicit session id.
   * @param payload - Parsed Responses API request payload used for conversation, cache, response, or fingerprint hints.
   * @returns Session id, routing source, and timestamp for the resolved request.
   */
  resolve({ headers = {}, payload = {} }: { headers?: Record<string, unknown>; payload?: Record<string, any> }): ResolvedSession {
    const now = this.clock();
    const explicit = headerValue(headers[SESSION_HEADER]);
    if (explicit) return this.result(explicit, "header", now);

    const codexRoute = codexSessionRoute(parseCodexRequestEnvelope({ headers, payload }));
    if (codexRoute) return this.result(codexRoute.sessionId, codexRoute.source, now);

    const conversationId = payload.conversation?.id
      ?? payload.metadata?.session_id
      ?? payload.metadata?.conversation_id;
    if (conversationId) return this.result(`codex-${conversationId}`, "conversation", now);

    if (payload.prompt_cache_key) {
      return this.result(`codex-cache-${shortHash(payload.prompt_cache_key)}`, "prompt_cache_key", now);
    }

    const priorSession = this.responseSessions.get(payload.previous_response_id);
    if (priorSession) return this.result(priorSession, "previous_response_id", now);

    const fingerprint = requestFingerprint(payload);
    const existing = fingerprint ? this.fingerprintSessions.get(fingerprint) : null;
    if (existing && now.getTime() - existing.lastSeenAt <= this.idleMs) {
      existing.lastSeenAt = now.getTime();
      return this.result(existing.sessionId, "prompt_fingerprint", now);
    }

    const sessionId = this.fallbackSessionId ?? createSessionId(now);
    if (fingerprint) {
      this.fingerprintSessions.set(fingerprint, {
        sessionId,
        lastSeenAt: now.getTime()
      });
    }
    return this.result(sessionId, this.fallbackSessionId ? "fallback" : "generated", now);
  }

  /**
   * Formats a resolved session result.
   *
   * @param sessionId - Candidate session id to sanitize.
   * @param source - Routing source that explains why this session was selected.
   * @param now - Timestamp for the resolution.
   * @returns Sanitized session result suitable for metadata and profiler lookup.
   */
  result(sessionId: unknown, source: string, now: Date): ResolvedSession {
    return {
      sessionId: sanitizeSessionId(sessionId),
      source,
      timestamp: now.toISOString()
    };
  }

  /**
   * Gets or creates the TokenProfiler for a session id.
   *
   * @param sessionId - Session id to sanitize and use as the profiler run id.
   * @returns Existing or newly-created profiler for the session.
   */
  getProfiler(sessionId: unknown): TokenProfiler {
    const safeId = sanitizeSessionId(sessionId);
    let profiler = this.profilers.get(safeId);
    if (!profiler) {
      profiler = new TokenProfiler({
        runId: safeId,
        rootDir: this.rootDir,
        storageMode: this.storageMode
      });
      this.profilers.set(safeId, profiler);
    }
    return profiler;
  }

  /**
   * Associates an upstream response id with a resolved session id.
   *
   * @param responseId - Provider response id observed after forwarding a request.
   * @param sessionId - Session id that originated the response.
   * @returns Nothing.
   */
  registerResponse(responseId: unknown, sessionId: unknown): void {
    if (responseId) this.responseSessions.set(responseId, sanitizeSessionId(sessionId));
  }

  /**
   * Flushes every profiler created by this router.
   *
   * @returns Promise that resolves after all session stores have flushed.
   */
  async flush(): Promise<void> {
    await Promise.all([...this.profilers.values()].map((profiler) => profiler.flush()));
  }
}

/**
 * Creates a new generated Codex session id.
 *
 * @param now - Timestamp embedded into the generated id.
 * @returns Session id with `codex-` prefix, timestamp, and short random suffix.
 */
export function createSessionId(now = new Date()): string {
  const timestamp = now.toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  return `codex-${timestamp}-${randomUUID().slice(0, 8)}`;
}

/**
 * Converts an arbitrary value into a filesystem-safe session id.
 *
 * @param value - Candidate session id, or omitted to generate a fresh id.
 * @returns Trimmed, sanitized, non-empty session id capped at 120 characters.
 */
export function sanitizeSessionId(value: unknown = createSessionId()): string {
  const safe = String(value).trim().replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  return safe || createSessionId();
}

/**
 * Computes a stable fingerprint from the first user-like request input.
 *
 * @param payload - Parsed Responses API request payload.
 * @returns Short hash for the request input, or `null` when no input is available.
 */
function requestFingerprint(payload: Record<string, any>): string | null {
  const inputs = Array.isArray(payload.input) ? payload.input : [payload.input];
  const userContent = inputs.find((item) => item?.role === "user") ?? inputs[0];
  if (userContent === undefined || userContent === null) return null;
  return shortHash(typeof userContent === "string" ? userContent : JSON.stringify(userContent));
}

/**
 * Hashes a value for compact identifiers.
 *
 * @param value - Value to stringify and hash.
 * @returns First 16 hex characters of the SHA-256 hash.
 */
function shortHash(value: unknown): string {
  return sha256(String(value)).slice(0, 16);
}

/**
 * Reads a single string header value from Node-style header data.
 *
 * @param value - Header value as a string, array, or unknown value.
 * @returns First non-empty string header value, or `undefined`.
 */
function headerValue(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
}
