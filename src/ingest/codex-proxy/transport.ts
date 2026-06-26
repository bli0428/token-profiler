import http from "node:http";
import https from "node:https";

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

export function buildUpstreamUrl(upstream: string | URL, incomingPath: string): URL {
  const target = new URL(upstream);
  const incoming = new URL(incomingPath, "http://localhost");
  const basePath = target.pathname.replace(/\/$/, "");
  target.pathname = basePath && incoming.pathname.startsWith(`${basePath}/`)
    ? incoming.pathname
    : `${basePath}${incoming.pathname.startsWith("/") ? "" : "/"}${incoming.pathname}`;
  target.search = incoming.search;
  return target;
}


export function readRequestBody(request: any, maxBodyBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        const error = new Error(`Request body exceeds ${maxBodyBytes} bytes.`);
        (error as any).code = "BODY_TOO_LARGE";
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

export function forwardRequest({ request, response, body, upstreamUrl, logger, onCompleted }: any) {
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

function createResponseObserver(headers: any, onCompleted: any) {
  if (!onCompleted) return null;

  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  const completions: Promise<unknown>[] = [];
  const seenResponses = new Set();
  const inspectEvent = (event: any) => {
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
    push(chunk: Buffer) {
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

function filterHeaders(headers: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase()))
  );
}
