#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 8787);
const upstream = new URL(process.env.UPSTREAM ?? "https://chatgpt.com/backend-api/codex");
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES ?? 100 * 1024 * 1024);

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/_dump_raw_request/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  try {
    const body = await readBody(request);
    printRequest({ request, body });
    forwardRequest({ request, response, body });
  } catch (error) {
    const status = error?.code === "BODY_TOO_LARGE" ? 413 : 502;
    console.error(`debug proxy error: ${error.message}`);
    if (!response.headersSent) response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "debug_proxy_error", message: error.message }));
  }
});

server.listen(port, host, () => {
  console.log(`Raw Codex request dump proxy listening on http://${host}:${port}`);
  console.log(`Forwarding to ${upstream.toString()}`);
  console.log("Decoded JSON request bodies will print below. Treat this output as sensitive.");
});

function printRequest({ request, body }) {
  const decoded = decodeBody(body, request.headers["content-encoding"]);
  const text = decoded.toString("utf8");
  const headers = redactHeaders(request.headers);

  console.log("\n=== RAW CODEX REQUEST ===");
  console.log(`${request.method} ${request.url}`);
  console.log(JSON.stringify({ headers }, null, 2));

  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
  console.log("=== END RAW CODEX REQUEST ===\n");
}

function forwardRequest({ request, response, body }) {
  const target = buildUpstreamUrl(request.url ?? "/");
  const transport = target.protocol === "https:" ? https : http;
  const headers = filterHeaders(request.headers);
  headers.host = target.host;
  headers["content-length"] = String(body.length);

  const upstreamRequest = transport.request(target, { method: request.method, headers }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, filterHeaders(upstreamResponse.headers));
    upstreamResponse.pipe(response);
  });

  upstreamRequest.on("error", (error) => {
    console.error(`upstream request failed: ${error.message}`);
    if (!response.headersSent) response.writeHead(502);
    response.end();
  });
  response.on("close", () => {
    if (!response.writableEnded) upstreamRequest.destroy();
  });
  upstreamRequest.end(body);
}

function buildUpstreamUrl(incomingPath) {
  const target = new URL(upstream.toString());
  const incoming = new URL(incomingPath, "http://localhost");
  const basePath = target.pathname.replace(/\/$/, "");
  target.pathname = basePath && incoming.pathname.startsWith(`${basePath}/`)
    ? incoming.pathname
    : `${basePath}${incoming.pathname.startsWith("/") ? "" : "/"}${incoming.pathname}`;
  target.search = incoming.search;
  return target;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        const error = new Error(`request body exceeds ${maxBodyBytes} bytes`);
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

function decodeBody(body, contentEncoding) {
  const encoding = String(contentEncoding ?? "identity").toLowerCase().trim();
  if (!encoding || encoding === "identity") return body;
  if (encoding === "gzip") return gunzipSync(body);
  if (encoding === "br") return brotliDecompressSync(body);
  if (encoding === "deflate") return inflateSync(body);
  throw new Error(`unsupported content encoding: ${encoding}`);
}

function filterHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !hopByHopHeaders.has(name.toLowerCase()))
  );
}

function redactHeaders(headers) {
  const redacted = filterHeaders(headers);
  for (const name of Object.keys(redacted)) {
    if (["authorization", "cookie", "set-cookie"].includes(name.toLowerCase())) {
      redacted[name] = "[redacted]";
    }
  }
  return redacted;
}
