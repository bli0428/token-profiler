import { randomUUID } from "node:crypto";
import { sha256 } from "./hash.js";
import { TokenProfiler } from "./profiler.js";
import { normalizeStorageMode } from "./core/privacy/index.js";

const SESSION_HEADER = "x-token-profiler-session";

export class SessionRouter {
  constructor({
    rootDir,
    storeContent = false,
    storageMode,
    fallbackSessionId,
    idleMs = 30 * 60 * 1000,
    clock = () => new Date()
  }) {
    this.rootDir = rootDir;
    this.storageMode = normalizeStorageMode({ storageMode, storeContent });
    this.fallbackSessionId = fallbackSessionId ? sanitizeSessionId(fallbackSessionId) : null;
    this.idleMs = idleMs;
    this.clock = clock;
    this.profilers = new Map();
    this.responseSessions = new Map();
    this.fingerprintSessions = new Map();
  }

  resolve({ headers = {}, payload = {} }) {
    const now = this.clock();
    const explicit = headerValue(headers[SESSION_HEADER]);
    if (explicit) return this.result(explicit, "header", now);

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

  result(sessionId, source, now) {
    return {
      sessionId: sanitizeSessionId(sessionId),
      source,
      timestamp: now.toISOString()
    };
  }

  getProfiler(sessionId) {
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

  registerResponse(responseId, sessionId) {
    if (responseId) this.responseSessions.set(responseId, sanitizeSessionId(sessionId));
  }

  async flush() {
    await Promise.all([...this.profilers.values()].map((profiler) => profiler.flush()));
  }
}

export function createSessionId(now = new Date()) {
  const timestamp = now.toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  return `codex-${timestamp}-${randomUUID().slice(0, 8)}`;
}

export function sanitizeSessionId(value) {
  const safe = String(value).trim().replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
  return safe || createSessionId();
}

function requestFingerprint(payload) {
  const inputs = Array.isArray(payload.input) ? payload.input : [payload.input];
  const userContent = inputs.find((item) => item?.role === "user") ?? inputs[0];
  if (userContent === undefined || userContent === null) return null;
  return shortHash(typeof userContent === "string" ? userContent : JSON.stringify(userContent));
}

function shortHash(value) {
  return sha256(String(value)).slice(0, 16);
}

function headerValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
