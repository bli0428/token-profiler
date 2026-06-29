/**
 * Local HTTP proxy server that records Codex request artifacts and usage events.
 *
 * This adapter observes provider-specific request and response shapes, converts
 * them into canonical profiler records, and forwards traffic to the upstream
 * Responses API endpoint.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import { parseRequestPayload, recordPayloadArtifacts, recordUsageEvent } from "./recording.ts";
import { forwardRequest, readRequestBody } from "./transport.ts";

/**
 * Creates the live profiler proxy server and lifecycle controls.
 *
 * @param profiler - Optional single-run profiler used when no session router is supplied or resolved.
 * @param sessionRouter - Optional router that maps Codex requests and responses to per-session profilers.
 * @param upstream - Upstream HTTP or HTTPS base URL that receives proxied requests.
 * @param host - Host interface for the local proxy listener.
 * @param port - TCP port for the local proxy listener.
 * @param maxBodyBytes - Maximum encoded or decoded request body size accepted for profiling.
 * @param logger - Logger used for proxy and upstream failures.
 * @returns Object containing the raw `server`, host/port, and async `listen` and `close` lifecycle methods.
 * @throws When neither `profiler` nor `sessionRouter` is provided, or when `upstream` is not HTTP(S).
 */
export function createProfilerProxy({
  profiler,
  sessionRouter,
  upstream,
  host = "127.0.0.1",
  port = 8787,
  maxBodyBytes = 100 * 1024 * 1024,
  logger = console
}: any) {
  if (!profiler && !sessionRouter) {
    throw new Error("createProfilerProxy requires a profiler or sessionRouter.");
  }

  const upstreamUrl = new URL(upstream);
  const pendingObservations = new Set<Promise<void>>();
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
            sessionSource: session?.source,
            turnIdentity: session?.turnIdentity
          });
        }
      }

      forwardRequest({
        request,
        response,
        body,
        upstreamUrl,
        logger,
        onCompleted: (completed: any) => queueObservation(pendingObservations, async () => {
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
      const caught = error as Error & { code?: string };
      const status = caught.code === "BODY_TOO_LARGE" ? 413 : 502;
      logger.error(`Proxy request failed: ${caught.message}`);
      if (!response.headersSent) {
        response.writeHead(status, { "content-type": "application/json" });
      }
      response.end(JSON.stringify({ error: "token_profiler_proxy_error", message: caught.message }));
    }
  });

  return {
    server,
    host,
    port,
    async listen() {
      await new Promise<void>((resolve, reject) => {
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
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

/**
 * Tracks an asynchronous observation task until it settles.
 *
 * @param pending - Set that owns outstanding observation promises for shutdown coordination.
 * @param task - Async profiler observation to run.
 * @returns The promise produced for the observation task.
 */
function queueObservation(pending: Set<Promise<void>>, task: () => Promise<void>) {
  const promise = Promise.resolve().then(task).finally(() => pending.delete(promise));
  pending.add(promise);
  return promise;
}
