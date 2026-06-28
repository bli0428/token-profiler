import type { ArtifactDetailResponse, RunResponse, SessionsResponse, StatusResponse } from "../../src/api/types";
import apiRealArtifactDetail from "./api-real/artifact-detail.json";
import apiRealRun from "./api-real/run.json";

export const emptySessionsFixture: SessionsResponse = {
  schema_version: 1,
  generated_at: "2026-06-26T12:05:00.000Z",
  data: { sessions: [] },
  caveats: []
};

export const offlineErrorFixture = {
  error: "offline",
  message: "Dashboard API is unreachable."
};

export const notFoundErrorFixture = {
  error: "not_found",
  message: "The requested dashboard record was not found.",
  status: 404
};

export const versionMismatchFixture = {
  schema_version: 999,
  generated_at: "2026-06-26T12:05:00.000Z",
  data: {},
  caveats: []
};

export const statusNotReadyFixture: StatusResponse = {
  schema_version: 1,
  generated_at: "2026-06-26T12:05:00.000Z",
  data: {
    service: "token-profiler-dashboard-api",
    ready: false,
    read_only: true,
    local_only: true,
    data_root_label: ".token-profiler",
    schema_version: 1,
    capabilities: {
      sessions: true,
      run_view: true,
      artifact_detail: true,
      request_accounting: true,
      refresh: "request"
    }
  },
  caveats: []
};

export const partialRunFixture: RunResponse = {
  ...(apiRealRun as RunResponse),
  data: {
    ...(apiRealRun as RunResponse).data,
    overview: {
      ...(apiRealRun as RunResponse).data.overview,
      availability: { status: "partial", reason: "Some artifacts are still being indexed." }
    },
    caveats: [
      {
        code: "partial_data",
        message: "Some artifacts are still being indexed.",
        severity: "warning"
      }
    ]
  }
};

export const staleRunFixture: RunResponse = {
  ...partialRunFixture,
  data: {
    ...partialRunFixture.data,
    overview: {
      ...partialRunFixture.data.overview,
      availability: { status: "partial", reason: "The selected run may be stale." }
    }
  }
};

export const metadataOnlyArtifactDetailFixture: ArtifactDetailResponse = {
  ...(apiRealArtifactDetail as ArtifactDetailResponse),
  data: {
    ...(apiRealArtifactDetail as ArtifactDetailResponse).data,
    artifact_id: "metadata-only-artifact",
    title: "Metadata-only prompt",
    privacy: {
      ...(apiRealArtifactDetail as ArtifactDetailResponse).data.privacy,
      raw_content_available: false,
      raw_content_revealed: false,
      hidden_fields: ["content.raw"]
    },
    content: undefined,
    caveats: [{ code: "metadata_only", message: "Raw content is not captured.", severity: "info" }]
  }
};

export const hiddenArtifactDetailFixture: ArtifactDetailResponse = {
  ...metadataOnlyArtifactDetailFixture,
  data: {
    ...metadataOnlyArtifactDetailFixture.data,
    artifact_id: "hidden-artifact",
    title: "Hidden command output",
    caveats: [{ code: "hidden_content", message: "Raw content is hidden.", severity: "warning" }]
  }
};
