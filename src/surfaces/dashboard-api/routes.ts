import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { envelope, errorResponse, DashboardApiRouteError } from "./errors.ts";
import {
  createArtifactDetailResponse,
  createRunResponse,
  createSessionsResponse,
  createStatusResponse
} from "./responses.ts";
import type { DashboardApiResponse } from "./types.ts";
import type { DashboardSessionTitleLookup } from "./sessions.ts";

export type DashboardApiRouteOptions = {
  rootDir: string;
  origin?: string | undefined;
  sessionTitleLookup?: DashboardSessionTitleLookup | undefined;
  staticDir?: string | undefined;
};

const DEFAULT_STATIC_DIR = fileURLToPath(new URL("../../../dashboard/dist", import.meta.url));

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

    if (parts[0] !== "api") {
      return await staticDashboardResponse(url.pathname, options.staticDir ?? DEFAULT_STATIC_DIR, headers);
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "status") {
      return { status: 200, body: envelope(await createStatusResponse(options.rootDir)), headers };
    }

    if (parts.length === 2 && parts[0] === "api" && parts[1] === "sessions") {
      const limit = parseLimit(url.searchParams.get("limit"));
      return {
        status: 200,
        body: envelope(await createSessionsResponse(options.rootDir, {
          ...(limit === undefined ? {} : { limit }),
          ...(options.sessionTitleLookup === undefined ? {} : { sessionTitleLookup: options.sessionTitleLookup })
        })),
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

async function staticDashboardResponse(
  pathname: string,
  staticDir: string,
  baseHeaders: Record<string, string>
): Promise<DashboardApiResponse> {
  const root = resolve(staticDir);
  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const normalized = normalize(requestedPath);

  if (normalized.startsWith("..") || normalized.includes(`${sep}..${sep}`)) {
    return {
      status: 403,
      body: "Forbidden",
      raw: true,
      headers: htmlHeaders(baseHeaders, "text/plain; charset=utf-8")
    };
  }

  const assetPath = resolve(root, normalized);
  if (!assetPath.startsWith(`${root}${sep}`) && assetPath !== root) {
    return {
      status: 403,
      body: "Forbidden",
      raw: true,
      headers: htmlHeaders(baseHeaders, "text/plain; charset=utf-8")
    };
  }

  const filePath = await existingFilePath(assetPath, root);
  if (!filePath) {
    return {
      status: 503,
      body: missingDashboardHtml(),
      raw: true,
      headers: htmlHeaders(baseHeaders, "text/html; charset=utf-8")
    };
  }

  return {
    status: 200,
    body: await readFile(filePath),
    raw: true,
    headers: htmlHeaders(baseHeaders, contentType(filePath))
  };
}

async function existingFilePath(assetPath: string, root: string): Promise<string | undefined> {
  if (await isFile(assetPath)) return assetPath;

  const indexPath = join(root, "index.html");
  if (await isFile(indexPath)) return indexPath;

  return undefined;
}

async function isFile(pathname: string): Promise<boolean> {
  try {
    return (await stat(pathname)).isFile();
  } catch {
    return false;
  }
}

function htmlHeaders(baseHeaders: Record<string, string>, contentTypeValue: string): Record<string, string> {
  return {
    ...baseHeaders,
    "content-type": contentTypeValue,
    "cache-control": "no-store"
  };
}

function contentType(pathname: string): string {
  switch (extname(pathname)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function missingDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Token Profiler Dashboard</title>
  </head>
  <body>
    <h1>Dashboard bundle not found</h1>
    <p>Run <code>cd dashboard && npm run build</code>, then restart the dashboard API.</p>
  </body>
</html>
`;
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
    "access-control-allow-origin": origin ?? "http://127.0.0.1:5173",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}
