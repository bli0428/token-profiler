import http from "node:http";
import { randomUUID } from "node:crypto";
import { parseRequestPayload, recordPayloadArtifacts, recordUsageEvent } from "./recording.js";
import { forwardRequest, readRequestBody } from "./transport.js";

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

function queueObservation(pending, task) {
  const promise = Promise.resolve().then(task).finally(() => pending.delete(promise));
  pending.add(promise);
  return promise;
}
