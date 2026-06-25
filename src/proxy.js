import http from "node:http";
import https from "node:https";
import { randomUUID } from "node:crypto";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

export function createProfilerProxy({
  profiler,
  sessionRouter,
  upstream,
  host = "127.0.0.1",
  port = 8787,
  maxBodyBytes = 100 * 1024 * 1024,
  logger = console
}) {
  if (!profiler && !sessionRouter) {
    throw new Error("createProfilerProxy requires a profiler or sessionRouter.");
  }

  const upstreamUrl = new URL(upstream);
  const pendingObservations = new Set();
  if (!["https:", "http:"].includes(upstreamUrl.protocol)) {
    throw new Error("Proxy upstream must use http or https.");
  }

  const server = http.createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/_token_profiler/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    try {
      const body = await readRequestBody(request, maxBodyBytes);
      const requestId = request.headers["x-request-id"] ?? `proxy_${randomUUID()}`;
      const contentType = String(request.headers["content-type"] ?? "");
      let activeProfiler = profiler;
      let sessionId = profiler?.runId;

      if (body.length > 0 && contentType.includes("application/json")) {
        const payload = parseRequestPayload(body, request.headers["content-encoding"], maxBodyBytes);
        if (payload) {
          const session = sessionRouter?.resolve({ headers: request.headers, payload });
          if (session) {
            sessionId = session.sessionId;
            activeProfiler = sessionRouter.getProfiler(sessionId);
          }
          await recordPayloadArtifacts({
            profiler: activeProfiler,
            requestId,
            payload,
            requestPath: request.url,
            sessionSource: session?.source
          });
        }
      }

      forwardRequest({
        request,
        response,
        body,
        upstreamUrl,
        logger,
        onCompleted: (completed) => queueObservation(pendingObservations, async () => {
          sessionRouter?.registerResponse(completed.responseId, sessionId);
          if (activeProfiler && completed.usage) {
            await recordUsageEvent({
              profiler: activeProfiler,
              requestId,
              usage: completed.usage,
              responseId: completed.responseId
            });
          }
        })
      });
    } catch (error) {
      const status = error.code === "BODY_TOO_LARGE" ? 413 : 502;
      logger.error(`Proxy request failed: ${error.message}`);
      if (!response.headersSent) {
        response.writeHead(status, { "content-type": "application/json" });
      }
      response.end(JSON.stringify({ error: "token_profiler_proxy_error", message: error.message }));
    }
  });

  return {
    server,
    host,
    port,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      });
      return server.address();
    },
    async close() {
      await Promise.all([...pendingObservations]);
      await profiler?.flush();
      await sessionRouter?.flush();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

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

async function recordPayloadArtifacts({
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

function parseRequestPayload(body, contentEncoding, maxBodyBytes) {
  try {
    const decoded = decodeBody(body, contentEncoding);
    if (decoded.length > maxBodyBytes) throw new Error("Decoded request body is too large to profile.");
    return JSON.parse(decoded.toString("utf8"));
  } catch {
    return null;
  }
}

async function recordUsageEvent({ profiler, requestId, usage, responseId }) {
  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens) || 0;
  const cachedTokens = Number(
    usage.input_tokens_details?.cached_tokens
      ?? usage.prompt_tokens_details?.cached_tokens
      ?? usage.cached_input_tokens
  ) || 0;
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens) || 0;

  await profiler.store.append({
    schema_version: 1,
    event_kind: "request_usage",
    run_id: profiler.runId,
    request_id: requestId,
    response_id: responseId,
    input_tokens: inputTokens,
    cached_input_tokens: cachedTokens,
    uncached_input_tokens: Math.max(0, inputTokens - cachedTokens),
    output_tokens: outputTokens,
    total_tokens: Number(usage.total_tokens) || inputTokens + outputTokens,
    timestamp: new Date().toISOString()
  });
}

function decodeBody(body, contentEncoding) {
  const encoding = String(contentEncoding ?? "identity").toLowerCase().trim();
  if (!encoding || encoding === "identity") return body;
  if (encoding === "gzip") return gunzipSync(body);
  if (encoding === "br") return brotliDecompressSync(body);
  if (encoding === "deflate") return inflateSync(body);
  throw new Error(`Unsupported content encoding: ${encoding}`);
}

export function extractResponsesArtifacts(payload) {
  const artifacts = [];

  addTextValue(artifacts, payload.instructions, {
    artifactType: "SYSTEM_PROMPT",
    artifactName: "instructions",
    artifactId: "SYSTEM_PROMPT:instructions"
  });

  for (const [index, tool] of asArray(payload.tools).entries()) {
    const name = tool?.name ?? tool?.function?.name ?? tool?.type ?? `tool_${index}`;
    artifacts.push({
      artifactType: "SYSTEM_PROMPT",
      artifactName: `tool-definition:${name}`,
      artifactId: `SYSTEM_PROMPT:tool-definition:${name}`,
      content: JSON.stringify(tool)
    });
  }

  const inputs = asArray(payload.input);
  const calls = new Map();
  for (const item of inputs) {
    if (item?.type === "function_call" && item.call_id) calls.set(item.call_id, item);
  }

  for (const [index, item] of inputs.entries()) {
    if (typeof item === "string") {
      addTextValue(artifacts, item, messageDescriptor("user", index, 0));
      continue;
    }
    if (!item || typeof item !== "object") continue;

    if (item.type === "function_call") {
      const toolName = item.name ?? "unknown";
      const toolMetadata = describeFunctionCall({ toolName, callId: item.call_id, input: item.arguments });
      addTextValue(artifacts, { name: toolName, arguments: item.arguments }, {
        artifactType: "SUMMARY",
        artifactName: toolMetadata.artifactName,
        artifactId: `SUMMARY:tool-call:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "function_call_output") {
      const call = calls.get(item.call_id);
      const toolName = call?.name ?? "unknown";
      const toolMetadata = describeToolOutput({
        toolName,
        callId: item.call_id,
        output: item.output
      });
      addTextValue(artifacts, item.output, {
        artifactType: classifyToolOutput(toolName),
        artifactName: toolMetadata.artifactName,
        artifactId: `TOOL_OUTPUT:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "custom_tool_call") {
      const toolName = item.name ?? "custom";
      const toolMetadata = describeCustomToolCall({
        toolName,
        callId: item.call_id,
        input: item.input
      });
      addTextValue(artifacts, item, {
        artifactType: "SUMMARY",
        artifactName: toolMetadata.artifactName,
        artifactId: `SUMMARY:custom-tool-call:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "custom_tool_call_output") {
      const toolMetadata = describeToolOutput({
        toolName: "custom_tool",
        callId: item.call_id,
        output: item.output
      });
      addTextValue(artifacts, item.output, {
        artifactType: "SUMMARY",
        artifactName: toolMetadata.artifactName,
        artifactId: `SUMMARY:custom-tool-call-output:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "message" || item.role) {
      const role = item.role ?? "unknown";
      const parts = asArray(item.content);
      for (const [partIndex, part] of parts.entries()) {
        const text = typeof part === "string" ? part : part?.text;
        addTextValue(artifacts, text, messageDescriptor(role, index, partIndex));
      }
      continue;
    }

    addTextValue(artifacts, item, {
      artifactType: "SUMMARY",
      artifactName: `input:${item.type ?? "unknown"}:${index}`,
      artifactId: `SUMMARY:input:${item.type ?? "unknown"}:${index}`
    });
  }

  return artifacts;
}

export function buildUpstreamUrl(upstream, incomingPath) {
  const target = new URL(upstream);
  const incoming = new URL(incomingPath, "http://localhost");
  const basePath = target.pathname.replace(/\/$/, "");
  target.pathname = basePath && incoming.pathname.startsWith(`${basePath}/`)
    ? incoming.pathname
    : `${basePath}${incoming.pathname.startsWith("/") ? "" : "/"}${incoming.pathname}`;
  target.search = incoming.search;
  return target;
}

function messageDescriptor(role, index, partIndex) {
  const artifactType = role === "system" || role === "developer"
    ? "SYSTEM_PROMPT"
    : role === "user"
      ? "USER_MESSAGE"
      : "SUMMARY";

  return {
    artifactType,
    artifactName: `message:${role}:${index}:${partIndex}`,
    artifactId: `${artifactType}:message:${role}:${index}:${partIndex}`
  };
}

function classifyToolOutput(toolName) {
  const name = String(toolName).toLowerCase();
  if (name.includes("search")) return "SEARCH_RESULT";
  if (name.includes("exec")) return "TOOL_OUTPUT";
  if (name.includes("test")) return "TEST_OUTPUT";
  return "TOOL_OUTPUT";
}

function addTextValue(artifacts, value, descriptor) {
  if (value === undefined || value === null) return;
  const content = typeof value === "string" ? value : JSON.stringify(value);
  if (content.length > 0) artifacts.push({ ...descriptor, content });
}

function describeFunctionCall({ toolName, callId, input }) {
  const parsed = parseJsonValue(input);
  const command = typeof parsed?.cmd === "string" ? parsed.cmd : undefined;
  const label = command
    ? `${toolName}: ${truncateMiddle(command, 80)}`
    : `tool-call:${toolName}:${callId ?? "unknown"}`;
  return {
    artifactName: label,
    metadata: compactObject({
      tool_name: toolName,
      call_id: callId,
      display_name: label,
      command,
      workdir: typeof parsed?.workdir === "string" ? parsed.workdir : undefined,
      content_kind: command ? "command" : "tool_call"
    })
  };
}

function describeCustomToolCall({ toolName, callId, input }) {
  const text = String(input ?? "");
  const patch = toolName === "apply_patch" || text.startsWith("*** Begin Patch")
    ? summarizePatch(text)
    : null;
  const embeddedCommand = extractExecCommand(text);
  const contentKind = patch ? "patch" : embeddedCommand ? "command" : "custom_tool_call";
  const label = patch
    ? `${toolName}: ${patch.summary}`
    : embeddedCommand
      ? `${toolName}: ${truncateMiddle(embeddedCommand.command, 80)}`
      : `${toolName}:${callId ?? "unknown"}`;

  return {
    artifactName: label,
    metadata: compactObject({
      tool_name: toolName,
      call_id: callId,
      display_name: label,
      content_kind: contentKind,
      command: embeddedCommand?.command,
      workdir: embeddedCommand?.workdir,
      touched_files: patch?.files,
      patch_adds: patch?.adds,
      patch_updates: patch?.updates,
      patch_deletes: patch?.deletes,
      patch_file_count: patch?.files.length
    })
  };
}

function describeToolOutput({ toolName, callId, output }) {
  const text = normalizeToolOutput(output);
  const exitCode = text.match(/(?:Exit code|Process exited with code):\s*(-?\d+)/i)?.[1];
  const tokenCount = text.match(/Original token count:\s*([0-9,]+)/i)?.[1];
  const label = `tool:${toolName}:${callId ?? "unknown"}`;
  return {
    artifactName: label,
    metadata: compactObject({
      tool_name: toolName,
      call_id: callId,
      display_name: label,
      content_kind: "tool_output",
      exit_code: exitCode === undefined ? undefined : Number(exitCode),
      original_token_count: tokenCount === undefined ? undefined : Number(tokenCount.replaceAll(",", "")),
      output_preview: firstContentLine(text)
    })
  };
}

function summarizePatch(text) {
  const files = [];
  let adds = 0;
  let updates = 0;
  let deletes = 0;

  for (const line of text.split("\n")) {
    let match = line.match(/^\*\*\* Add File: (.+)$/);
    if (match) {
      adds += 1;
      files.push(match[1]);
      continue;
    }
    match = line.match(/^\*\*\* Update File: (.+)$/);
    if (match) {
      updates += 1;
      files.push(match[1]);
      continue;
    }
    match = line.match(/^\*\*\* Delete File: (.+)$/);
    if (match) {
      deletes += 1;
      files.push(match[1]);
    }
  }

  const action = adds && !updates && !deletes
    ? "add"
    : updates && !adds && !deletes
      ? "update"
      : deletes && !adds && !updates
        ? "delete"
        : "modify";
  const firstFile = files[0] ?? "patch";
  const suffix = files.length > 1 ? ` (+${files.length - 1} files)` : "";
  return {
    files,
    adds,
    updates,
    deletes,
    summary: `${action} ${truncatePath(firstFile, 56)}${suffix}`
  };
}

function extractExecCommand(text) {
  const command = extractQuotedField(text, "cmd");
  if (!command) return null;
  const workdir = extractQuotedField(text, "workdir");
  return {
    command,
    workdir
  };
}

function extractQuotedField(text, key) {
  const candidates = [
    findQuotedField(text, `${key}:`),
    findQuotedField(text, `"${key}":`)
  ].filter(Boolean).sort((a, b) => a.index - b.index);
  return candidates[0]?.value;
}

function findQuotedField(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return null;
  let index = markerIndex + marker.length;
  while (/\s/.test(text[index])) index += 1;
  const quote = text[index];
  if (quote !== "\"" && quote !== "'") return null;
  index += 1;
  let value = "";
  for (; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\") {
      value += char;
      if (index + 1 < text.length) {
        value += text[index + 1];
        index += 1;
      }
      continue;
    }
    if (char === quote) {
      return {
        index: markerIndex,
        value: unescapeQuoted(value, quote)
      };
    }
    value += char;
  }
  return null;
}

function normalizeToolOutput(output) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    return output.map((part) => part?.text ?? JSON.stringify(part)).join("");
  }
  return JSON.stringify(output ?? "");
}

function firstContentLine(text) {
  const lines = String(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const outputIndex = lines.findIndex((line) => line === "Output:");
  const candidate = outputIndex >= 0 ? lines.slice(outputIndex + 1).find(Boolean) : lines.at(-1);
  return candidate ? truncateMiddle(candidate, 120) : undefined;
}

function parseJsonValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  );
}

function unescapeQuoted(value, quote) {
  if (quote === "\"") return parseJsonValue(`"${value}"`) ?? value;
  return value.replaceAll("\\'", "'").replaceAll("\\\\", "\\");
}

function truncateMiddle(value, width) {
  const text = String(value);
  if (text.length <= width) return text;
  const head = Math.max(1, Math.floor((width - 3) * 0.65));
  const tail = Math.max(1, width - 3 - head);
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function truncatePath(value, width) {
  const text = String(value);
  if (text.length <= width) return text;
  const parts = text.split(/[\\/]/);
  if (parts.length <= 1) return truncateMiddle(text, width);
  const basename = parts.at(-1);
  const dirname = parts.slice(0, -1).join("/");
  const remaining = width - basename.length - 4;
  return remaining > 4
    ? `${truncateMiddle(dirname, remaining)}/.../${basename}`
    : truncateMiddle(text, width);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function readRequestBody(request, maxBodyBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        const error = new Error(`Request body exceeds ${maxBodyBytes} bytes.`);
        error.code = "BODY_TOO_LARGE";
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function forwardRequest({ request, response, body, upstreamUrl, logger, onCompleted }) {
  const target = buildUpstreamUrl(upstreamUrl, request.url);
  const transport = target.protocol === "https:" ? https : http;
  const headers = filterHeaders(request.headers);
  headers.host = target.host;
  headers["content-length"] = String(body.length);

  const upstreamRequest = transport.request(target, {
    method: request.method,
    headers
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, filterHeaders(upstreamResponse.headers));
    const observer = createResponseObserver(upstreamResponse.headers, onCompleted);
    upstreamResponse.on("data", (chunk) => {
      observer?.push(chunk);
      response.write(chunk);
    });
    upstreamResponse.on("end", () => {
      Promise.resolve(observer?.finish()).then(
        () => response.end(),
        (error) => response.destroy(error)
      );
    });
    upstreamResponse.on("error", (error) => response.destroy(error));
  });

  upstreamRequest.on("error", (error) => {
    logger.error(`Upstream request failed: ${error.message}`);
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  response.on("close", () => {
    if (!response.writableEnded) upstreamRequest.destroy();
  });
  upstreamRequest.end(body);
}

function createResponseObserver(headers, onCompleted) {
  if (!onCompleted) return null;

  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  const completions = [];
  const seenResponses = new Set();
  const inspectEvent = (event) => {
    const completed = event?.type === "response.completed"
      ? event.response
      : event?.status === "completed" && event?.usage
        ? event
        : event?.response?.status === "completed" && event.response.usage
          ? event.response
          : null;
    if (!completed || seenResponses.has(completed.id)) return;
    seenResponses.add(completed.id);
    completions.push(onCompleted({ responseId: completed.id, usage: completed.usage }));
  };
  const consume = () => {
    let boundary;
    while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, boundary);
      const delimiter = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
      buffer = buffer.slice(boundary + delimiter.length);
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data || data === "[DONE]") continue;

      try {
        inspectEvent(JSON.parse(data));
      } catch {
        // Non-JSON SSE events are forwarded unchanged and ignored by the profiler.
      }
    }
  };

  return {
    push(chunk) {
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;
      if (raw.length < 10 * 1024 * 1024) raw += text;
      consume();
    },
    finish() {
      const tail = decoder.decode();
      buffer += tail;
      raw += tail;
      buffer += "\n\n";
      consume();
      try {
        inspectEvent(JSON.parse(raw));
      } catch {
        for (const line of raw.split(/\r?\n/)) {
          const candidate = line.trim().replace(/^data:\s*/, "");
          if (!candidate.startsWith("{")) continue;
          try {
            inspectEvent(JSON.parse(candidate));
          } catch {
            // Ignore non-JSON stream lines.
          }
        }
      }
      return Promise.all(completions);
    }
  };
}

function queueObservation(pending, task) {
  const promise = Promise.resolve().then(task).finally(() => pending.delete(promise));
  pending.add(promise);
  return promise;
}

function filterHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase()))
  );
}
