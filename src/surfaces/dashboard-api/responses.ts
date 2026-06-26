import { stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { analyzeEvents } from "../../analysis/pipeline.ts";
import { readEventsFromRunDir } from "../../core/store/index.ts";
import { createDashboardViewModel } from "../dashboard/model.ts";
import { createDashboardSessionIndex } from "../dashboard/sessions.ts";
import { DashboardApiRouteError } from "./errors.ts";
import {
  DASHBOARD_API_SCHEMA_VERSION,
  type DashboardApiArtifactDetail,
  type DashboardApiRun,
  type DashboardApiSession,
  type DashboardApiStatus
} from "./types.ts";

export function createStatusResponse(rootDir: string): DashboardApiStatus {
  return {
    service: "token-profiler-dashboard-api",
    ready: true,
    read_only: true,
    local_only: true,
    data_root_label: basename(resolve(rootDir)) || "token-profiler",
    schema_version: DASHBOARD_API_SCHEMA_VERSION,
    capabilities: {
      sessions: true,
      run_view: true,
      artifact_detail: true,
      refresh: "request"
    }
  };
}

export async function createSessionsResponse(
  rootDir: string,
  options: { limit?: number } = {}
): Promise<{ sessions: DashboardApiSession[] }> {
  const index = await createDashboardSessionIndex(rootDir, options);
  return {
    sessions: index.sessions.map(toApiSession)
  };
}

export async function createRunResponse(rootDir: string, runId: string): Promise<DashboardApiRun> {
  const runDir = resolveRunDir(rootDir, runId);

  try {
    await stat(join(runDir, "events.jsonl"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DashboardApiRouteError("not_found", 404, "Run not found.");
    }
    throw error;
  }

  try {
    const summary = analyzeEvents(await readEventsFromRunDir(runDir));
    const view = createDashboardViewModel(summary);
    return {
      run_id: runId,
      ...(view.run_id && view.run_id !== runId ? { canonical_run_id: view.run_id } : {}),
      overview: view.overview,
      artifacts: view.artifacts,
      artifact_details: view.artifact_details,
      task_groups: view.task_groups,
      filters: view.filters,
      privacy: view.privacy,
      caveats: view.caveats
    };
  } catch (error) {
    throw new DashboardApiRouteError(
      "run_unreadable",
      422,
      "Run data could not be interpreted as supported canonical data.",
      [{
        code: "run_unreadable",
        severity: "warning",
        message: "The selected run could not be read."
      }]
    );
  }
}

export async function createArtifactDetailResponse(
  rootDir: string,
  runId: string,
  artifactId: string
): Promise<DashboardApiArtifactDetail> {
  const run = await createRunResponse(rootDir, runId);
  const detail = findArtifactDetail(run.artifact_details, artifactId);
  if (!detail) {
    throw new DashboardApiRouteError("artifact_not_found", 404, "Artifact not found.");
  }
  return detail;
}

type DashboardSessionSource = Awaited<ReturnType<typeof createDashboardSessionIndex>>["sessions"][number];

function toApiSession(session: DashboardSessionSource): DashboardApiSession {
  const routableRunId = basename(session.run_dir);
  return {
    run_id: routableRunId,
    ...(session.run_id !== routableRunId ? { canonical_run_id: session.run_id } : {}),
    ...(session.label !== undefined ? { label: session.label } : {}),
    ...(session.updated_at !== undefined ? { updated_at: session.updated_at } : {}),
    ...(session.request_count !== undefined ? { request_count: session.request_count } : {}),
    ...(session.artifact_count !== undefined ? { artifact_count: session.artifact_count } : {}),
    ...(session.input_tokens !== undefined ? { input_tokens: session.input_tokens } : {}),
    ...(session.cached_input_tokens !== undefined ? { cached_input_tokens: session.cached_input_tokens } : {}),
    ...(session.uncached_input_tokens !== undefined ? { uncached_input_tokens: session.uncached_input_tokens } : {}),
    ...(session.output_tokens !== undefined ? { output_tokens: session.output_tokens } : {}),
    availability: session.availability.status === "unavailable"
      ? { status: "unavailable", reason: "Run data is unreadable." }
      : session.availability,
    caveats: session.caveats
  };
}

function findArtifactDetail(
  details: Record<string, DashboardApiArtifactDetail>,
  artifactId: string
): DashboardApiArtifactDetail | undefined {
  if (details[artifactId]) return details[artifactId];

  const shortMatches = Object.values(details).filter((detail) => detail.identity.stable_short_id === artifactId);
  return shortMatches.length === 1 ? shortMatches[0] : undefined;
}

function resolveRunDir(rootDir: string, runId: string): string {
  if (!runId || runId.includes("/") || runId.includes("\\") || runId === "." || runId === "..") {
    throw new DashboardApiRouteError("invalid_request", 400, "Invalid run identifier.");
  }

  const runsDir = resolve(rootDir, "runs");
  const runDir = resolve(runsDir, runId);
  if (runDir !== runsDir && runDir.startsWith(`${runsDir}/`)) return runDir;

  throw new DashboardApiRouteError("invalid_request", 400, "Invalid run identifier.");
}
