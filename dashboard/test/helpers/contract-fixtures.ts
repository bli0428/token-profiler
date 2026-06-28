import type {
  ArtifactDetailResponse,
  DashboardArtifactDetail,
  DashboardRun,
  DashboardSessionsData,
  DashboardStatus,
  RunResponse,
  SessionsResponse,
  StatusResponse
} from "../../src/api/types";
import source from "../fixtures/api-real/source.json";
import status from "../fixtures/api-real/status.json";
import sessions from "../fixtures/api-real/sessions.json";
import run from "../fixtures/api-real/run.json";
import artifactDetail from "../fixtures/api-real/artifact-detail.json";

export type ApiRealFixtureSource = {
  api_origin: string;
  captured_at: string;
  capture_tool: string;
  endpoints: Record<string, { method: string; path: string; file: string }>;
  normalization: {
    json: string;
    volatile_fields: string[];
  };
  requested: {
    sessions_limit: number;
    run_id: string | null;
    artifact_id: string | null;
  };
  selected: {
    run_id: string;
    run_selection: string;
    artifact_id: string;
    artifact_selection: string;
  };
  validation: {
    api_ready: boolean;
    local_only: boolean;
    read_only: boolean;
    supported_schema_version: number;
    hidden_raw_content_scan: string;
  };
};

export const apiRealFixtures = {
  source: source as ApiRealFixtureSource,
  status: status as unknown as StatusResponse,
  sessions: sessions as unknown as SessionsResponse,
  run: run as unknown as RunResponse,
  artifactDetail: artifactDetail as unknown as ArtifactDetailResponse
};

export function assertEnvelope<T>(value: { schema_version?: unknown; generated_at?: unknown; data?: T; caveats?: unknown[] }): asserts value is {
  schema_version: 1;
  generated_at: string;
  data: T;
  caveats: unknown[];
} {
  expect(value.schema_version).toBe(1);
  expect(typeof value.generated_at).toBe("string");
  expect(value.data).toBeTruthy();
  expect(Array.isArray(value.caveats)).toBe(true);
}

export function assertStatusData(data: DashboardStatus) {
  expect(data.service).toBe("token-profiler-dashboard-api");
  expect(typeof data.ready).toBe("boolean");
  expect(data.read_only).toBe(true);
  expect(data.local_only).toBe(true);
  expect(data.schema_version).toBe(1);
  expect(data.capabilities.request_accounting).toBe(true);
}

export function assertSessionsData(data: DashboardSessionsData) {
  expect(Array.isArray(data.sessions)).toBe(true);
  for (const session of data.sessions) {
    expect(session.run_id).toBeTruthy();
    expect(session.label ?? session.run_id).toBeTruthy();
    expect(session.canonical_run_id).not.toBe(session.run_id);
    expect(session.identity.route_run_id).toBe(session.run_id);
    expect(session.identity.mapping_confidence).toBeTruthy();
    expect(Array.isArray(session.identity.limitations)).toBe(true);
    expect(Array.isArray(session.caveats)).toBe(true);
  }
}

export function assertRunData(data: DashboardRun) {
  expect(data.run_id).toBeTruthy();
  expect(Array.isArray(data.task_groups)).toBe(true);
  expect(Array.isArray(data.artifacts)).toBe(true);
  expect(Array.isArray(data.requests.rows)).toBe(true);
  expect(typeof data.requests.summary.request_count).toBe("number");
  expect(data.requests.summary.request_count).toBeGreaterThanOrEqual(data.requests.rows.length);
  expect(Array.isArray(data.filters.categories)).toBe(true);
  for (const [index, request] of data.requests.rows.entries()) {
    expect(request.request_id).toBeTruthy();
    expect(request.chronology_index).toBe(index);
    expect(request.availability.status).toMatch(/complete|partial|unavailable/);
    expect(request.usage?.source ?? "missing").toMatch(/provider_reported|missing/);
    if (request.usage) {
      expect(typeof request.usage.cached_input_tokens).toBe("number");
      expect(typeof request.usage.uncached_input_tokens).toBe("number");
      expect(typeof request.usage.total_tokens).toBe("number");
    }
    for (const inclusion of request.artifact_inclusions) {
      expect(inclusion.artifact_id).toBeTruthy();
      expect(inclusion.display_name).toBeTruthy();
      expect(typeof inclusion.local_token_count).toBe("number");
      expect(inclusion.privacy.raw_content_revealed).toBe(false);
      expect("raw" in inclusion).toBe(false);
    }
  }
  for (const artifact of data.artifacts) {
    expect(artifact.artifact_id).toBeTruthy();
    expect(artifact.search_text).toBeTruthy();
  }
}

export function assertArtifactDetailData(data: DashboardArtifactDetail) {
  expect(data.artifact_id).toBeTruthy();
  expect(data.title).toBeTruthy();
  expect(data.identity.stable_short_id).toBeTruthy();
  expect(Array.isArray(data.metadata_sections)).toBe(true);
  if (!data.privacy.raw_content_available) {
    expect(data.content?.raw).toBeUndefined();
  }
}

export function assertSourceMetadata(sourceMetadata: ApiRealFixtureSource) {
  expect(sourceMetadata.capture_tool).toBe("dashboard/scripts/capture-api-fixtures.ts");
  expect(sourceMetadata.api_origin).toMatch(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/);
  expect(Date.parse(sourceMetadata.captured_at)).not.toBeNaN();
  expect(sourceMetadata.requested.sessions_limit).toBe(20);
  expect(sourceMetadata.validation).toEqual(
    expect.objectContaining({
      api_ready: true,
      local_only: true,
      read_only: true,
      supported_schema_version: 1
    })
  );
  expect(sourceMetadata.normalization.volatile_fields).toEqual(expect.arrayContaining([expect.stringContaining("generated_at")]));
  expect(sourceMetadata.endpoints).toEqual(
    expect.objectContaining({
      status: expect.objectContaining({ method: "GET", path: "/api/status", file: "status.json" }),
      sessions: expect.objectContaining({ method: "GET", path: "/api/sessions?limit=20", file: "sessions.json" }),
      run: expect.objectContaining({ method: "GET", file: "run.json" }),
      artifact_detail: expect.objectContaining({ method: "GET", file: "artifact-detail.json" })
    })
  );
}

export function assertBaselineRelationships(fixtures = apiRealFixtures) {
  expect(fixtures.run.data.run_id).toBe(fixtures.source.selected.run_id);
  expect(fixtures.artifactDetail.data.artifact_id).toBe(fixtures.source.selected.artifact_id);
  expect(fixtures.run.data.artifacts.some((artifact) => artifact.artifact_id === fixtures.artifactDetail.data.artifact_id)).toBe(true);
  expect(fixtures.source.endpoints.run.path).toBe(`/api/runs/${encodeURIComponent(fixtures.source.selected.run_id)}`);
  expect(fixtures.source.endpoints.artifact_detail.path).toBe(
    `/api/runs/${encodeURIComponent(fixtures.source.selected.run_id)}/artifacts/${encodeURIComponent(fixtures.source.selected.artifact_id)}`
  );
}

export function assertNoGeneratedRawContent(value: unknown) {
  const offenders: string[] = [];
  collectRawContentStrings(value, "$", offenders);
  expect(offenders).toEqual([]);
}

function collectRawContentStrings(value: unknown, path: string, offenders: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectRawContentStrings(item, `${path}[${index}]`, offenders));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (key === "raw" && typeof nested === "string" && nested.length > 0) offenders.push(nestedPath);
    collectRawContentStrings(nested, nestedPath, offenders);
  }
}
