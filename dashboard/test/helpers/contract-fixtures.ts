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
import status from "../fixtures/api-real/status.json";
import sessions from "../fixtures/api-real/sessions.json";
import run from "../fixtures/api-real/run.json";
import artifactDetail from "../fixtures/api-real/artifact-detail.json";

export const apiRealFixtures = {
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
}

export function assertSessionsData(data: DashboardSessionsData) {
  expect(Array.isArray(data.sessions)).toBe(true);
  for (const session of data.sessions) {
    expect(session.run_id).toBeTruthy();
    expect(session.label ?? session.run_id).toBeTruthy();
    expect(session.canonical_run_id).not.toBe(session.run_id);
    expect(Array.isArray(session.caveats)).toBe(true);
  }
}

export function assertRunData(data: DashboardRun) {
  expect(data.run_id).toBeTruthy();
  expect(Array.isArray(data.task_groups)).toBe(true);
  expect(Array.isArray(data.artifacts)).toBe(true);
  expect(Array.isArray(data.filters.categories)).toBe(true);
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
