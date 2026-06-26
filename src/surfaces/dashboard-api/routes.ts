import { envelope, errorResponse, DashboardApiRouteError } from "./errors.ts";
import {
  createArtifactDetailResponse,
  createRunResponse,
  createSessionsResponse,
  createStatusResponse
} from "./responses.ts";
import type { DashboardApiResponse } from "./types.ts";

export type DashboardApiRouteOptions = {
  rootDir: string;
  origin?: string | undefined;
};

export async function handleDashboardApiRequest(
  method: string,
  requestUrl: string,
  options: DashboardApiRouteOptions
): Promise<DashboardApiResponse> {
  const headers = responseHeaders(options.origin);

  if (method === "OPTIONS") {
    return { status: 204, body: envelope({}), headers };
  }

  if (method !== "GET") {
    return {
      status: 405,
      body: errorResponse(new DashboardApiRouteError("invalid_request", 405, "Only GET requests are supported.")).body,
      headers
    };
  }

  try {
    const url = new URL(requestUrl, "http://127.0.0.1");
    const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "status") {
      return { status: 200, body: envelope(createStatusResponse(options.rootDir)), headers };
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "sessions") {
      const limit = parseLimit(url.searchParams.get("limit"));
      return {
        status: 200,
        body: envelope(await createSessionsResponse(options.rootDir, limit === undefined ? {} : { limit })),
        headers
      };
    }

    if (parts.length === 3 && parts[0] === "api" && parts[1] === "runs") {
      const run = await createRunResponse(options.rootDir, parts[2] ?? "");
      return { status: 200, body: envelope(run, run.caveats), headers };
    }

    if (parts.length === 5 && parts[0] === "api" && parts[1] === "runs" && parts[3] === "artifacts") {
      const detail = await createArtifactDetailResponse(options.rootDir, parts[2] ?? "", parts[4] ?? "");
      return {
        status: 200,
        body: envelope(detail, detail.caveats),
        headers
      };
    }

    throw new DashboardApiRouteError("not_found", 404, "Dashboard API resource not found.");
  } catch (error) {
    const response = errorResponse(error);
    return { ...response, headers };
  }
}

function parseLimit(value: string | null): number | undefined {
  if (value === null) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new DashboardApiRouteError("invalid_request", 400, "Invalid sessions limit.");
  }
  return limit;
}

function responseHeaders(origin: string | undefined): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin ?? "http://127.0.0.1",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}
