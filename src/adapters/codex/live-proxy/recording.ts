/**
 * Recording helpers that translate observed Codex request and response data into
 * canonical profiler events.
 *
 * Request payload parsing and artifact extraction remain adapter-local; callers
 * receive only artifact counts or appended canonical usage events.
 */
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { createRequestUsageEvent } from "../../../core/events/index.ts";
import { extractResponsesArtifacts, toCaptureRecord } from "./artifacts/index.ts";

/**
 * Parses an encoded request body and records any extracted artifacts.
 *
 * @param profiler - Token profiler that owns artifact persistence and token counting.
 * @param requestId - Stable request identifier used to group artifacts.
 * @param body - Encoded request body captured by the proxy.
 * @param requestPath - Incoming request path stored as artifact metadata.
 * @param contentEncoding - Optional HTTP content encoding for the request body.
 * @param maxBodyBytes - Maximum decoded body size accepted for profiling.
 * @returns Number of artifacts recorded, or `0` when the body cannot be parsed.
 */
export async function recordRequestArtifacts({
  profiler,
  requestId,
  body,
  requestPath,
  contentEncoding,
  maxBodyBytes = 100 * 1024 * 1024
}: any) {
  const payload = parseRequestPayload(body, contentEncoding, maxBodyBytes);
  if (!payload) return 0;

  return recordPayloadArtifacts({ profiler, requestId, payload, requestPath });
}

/**
 * Records artifacts from an already-parsed Responses API payload.
 *
 * @param profiler - Token profiler that owns artifact persistence and token counting.
 * @param requestId - Stable request identifier used to group artifacts.
 * @param payload - Parsed provider request payload to inspect.
 * @param requestPath - Incoming request path stored as artifact metadata.
 * @param sessionSource - Optional session-routing source stored as artifact metadata.
 * @returns Number of artifacts recorded for the payload.
 */
export async function recordPayloadArtifacts({
  profiler,
  requestId,
  payload,
  requestPath,
  sessionSource
}: any) {
  if (!profiler) return 0;

  const artifacts = extractResponsesArtifacts(payload);
  let tokenCursor = 0;
  for (const [artifactIndex, artifact] of artifacts.entries()) {
    const record = toCaptureRecord(artifact);
    const tokenCount = profiler.tokenCounter(String(record.content ?? ""));
    const tokenStart = tokenCursor;
    const tokenEnd = tokenStart + tokenCount;
    tokenCursor = tokenEnd;

    await profiler.recordAsync({
      requestId,
      artifactType: record.artifactType,
      artifactName: record.artifactName,
      artifactId: record.artifactId,
      content: record.content,
      artifactIndex,
      tokenStart,
      tokenEnd,
      metadata: {
        ...record.metadata,
        model: typeof payload.model === "string" ? payload.model : undefined,
        request_path: requestPath,
        session_source: sessionSource
      }
    });
  }
  return artifacts.length;
}

/**
 * Decodes and parses a proxied JSON request payload.
 *
 * @param body - Encoded request body buffer.
 * @param contentEncoding - HTTP content encoding value, if any.
 * @param maxBodyBytes - Maximum decoded body size accepted before parsing is abandoned.
 * @returns Parsed JSON payload, or `null` when decoding or parsing fails.
 */
export function parseRequestPayload(body: Buffer, contentEncoding: unknown, maxBodyBytes: number) {
  try {
    const decoded = decodeBody(body, contentEncoding);
    if (decoded.length > maxBodyBytes) throw new Error("Decoded request body is too large to profile.");
    return JSON.parse(decoded.toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Appends a canonical request-usage event for a completed upstream response.
 *
 * @param profiler - Token profiler whose store receives the usage event.
 * @param requestId - Proxy request identifier associated with the response.
 * @param usage - Provider-normalized usage object observed from the response.
 * @param responseId - Upstream response id, when available.
 * @returns Promise that resolves after the event is appended to the profiler store.
 */
export async function recordUsageEvent({ profiler, requestId, usage, responseId }: any) {
  await profiler.store.append(createRequestUsageEvent({
    runId: profiler.runId,
    requestId,
    responseId,
    usage,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Decodes a request body according to its HTTP content encoding.
 *
 * @param body - Encoded body buffer.
 * @param contentEncoding - HTTP content encoding value, such as `gzip`, `br`, or `deflate`.
 * @returns Decoded body buffer.
 * @throws When the content encoding is unsupported or decompression fails.
 */
function decodeBody(body: Buffer, contentEncoding: unknown): Buffer {
  const encoding = String(contentEncoding ?? "identity").toLowerCase().trim();
  if (!encoding || encoding === "identity") return body;
  if (encoding === "gzip") return gunzipSync(body);
  if (encoding === "br") return brotliDecompressSync(body);
  if (encoding === "deflate") return inflateSync(body);
  throw new Error(`Unsupported content encoding: ${encoding}`);
}
