import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { createRequestUsageEvent } from "../../core/events/index.js";
import { extractResponsesArtifacts } from "./artifacts.js";

export async function recordRequestArtifacts({
  profiler,
  requestId,
  body,
  requestPath,
  contentEncoding,
  maxBodyBytes = 100 * 1024 * 1024
}) {
  const payload = parseRequestPayload(body, contentEncoding, maxBodyBytes);
  if (!payload) return 0;

  return recordPayloadArtifacts({ profiler, requestId, payload, requestPath });
}

export async function recordPayloadArtifacts({
  profiler,
  requestId,
  payload,
  requestPath,
  sessionSource
}) {
  if (!profiler) return 0;

  const artifacts = extractResponsesArtifacts(payload);
  let tokenCursor = 0;
  for (const [artifactIndex, artifact] of artifacts.entries()) {
    const tokenCount = profiler.tokenCounter(String(artifact.content ?? ""));
    const tokenStart = tokenCursor;
    const tokenEnd = tokenStart + tokenCount;
    tokenCursor = tokenEnd;

    await profiler.recordAsync({
      requestId,
      ...artifact,
      artifactIndex,
      tokenStart,
      tokenEnd,
      metadata: {
        ...artifact.metadata,
        model: typeof payload.model === "string" ? payload.model : undefined,
        request_path: requestPath,
        session_source: sessionSource
      }
    });
  }
  return artifacts.length;
}

export function parseRequestPayload(body, contentEncoding, maxBodyBytes) {
  try {
    const decoded = decodeBody(body, contentEncoding);
    if (decoded.length > maxBodyBytes) throw new Error("Decoded request body is too large to profile.");
    return JSON.parse(decoded.toString("utf8"));
  } catch {
    return null;
  }
}

export async function recordUsageEvent({ profiler, requestId, usage, responseId }) {
  await profiler.store.append(createRequestUsageEvent({
    runId: profiler.runId,
    requestId,
    responseId,
    usage,
    timestamp: new Date().toISOString()
  }));
}

function decodeBody(body, contentEncoding) {
  const encoding = String(contentEncoding ?? "identity").toLowerCase().trim();
  if (!encoding || encoding === "identity") return body;
  if (encoding === "gzip") return gunzipSync(body);
  if (encoding === "br") return brotliDecompressSync(body);
  if (encoding === "deflate") return inflateSync(body);
  throw new Error(`Unsupported content encoding: ${encoding}`);
}
