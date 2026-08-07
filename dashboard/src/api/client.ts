import { DashboardClientError } from "./errors";
import type {
  ApiEnvelope,
  ArtifactDetailResponse,
  DashboardApiErrorBody,
  RunResponse,
  LargeRunArtifactPage,
  LargeRunPage,
  LargeRunResponse,
  SessionsResponse,
  StatusResponse
} from "./types";

const SUPPORTED_SCHEMA_VERSION = 1;
const DEFAULT_API_BASE_URL = "";

export type DashboardApiClient = {
  baseUrl: string;
  getStatus(): Promise<StatusResponse>;
  getSessions(limit?: number, cursor?: string): Promise<SessionsResponse>;
  getRun(runId: string): Promise<RunResponse>;
  getArtifactDetail(runId: string, artifactId: string): Promise<ArtifactDetailResponse>;
  getLargeRun?(runId: string, cursor?: string): Promise<ApiEnvelope<LargeRunResponse>>;
  getLargeRunRequests?(runId: string, cursor?: string): Promise<ApiEnvelope<LargeRunPage>>;
  getLargeRunArtifacts?(runId: string, requestId: string, cursor?: string): Promise<ApiEnvelope<LargeRunArtifactPage>>;
};

export function getConfiguredApiBaseUrl(): string {
  return import.meta.env.VITE_DASHBOARD_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export function createDashboardApiClient(baseUrl = getConfiguredApiBaseUrl()): DashboardApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string): Promise<ApiEnvelope<T>> {
    const url = `${normalizedBaseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, { headers: { accept: "application/json" } });
    } catch {
      throw new DashboardClientError("offline", `Unable to reach dashboard API at ${normalizedBaseUrl}.`, {
        attemptedUrl: url
      });
    }

    const body = await readJson(response);
    if (!response.ok) {
      const structured = body as Partial<DashboardApiErrorBody>;
      throw new DashboardClientError(response.status === 404 ? "not-found" : "api", structured.message ?? response.statusText, {
        status: response.status,
        attemptedUrl: url,
        code: structured.error
      });
    }

    const envelope = body as Partial<ApiEnvelope<T>>;
    if (envelope.schema_version !== SUPPORTED_SCHEMA_VERSION) {
      throw new DashboardClientError(
        "version-mismatch",
        `Unsupported dashboard API schema version: ${String(envelope.schema_version ?? "missing")}.`,
        { attemptedUrl: url, code: "unsupported_schema_version" }
      );
    }
    if (!envelope.data || !Array.isArray(envelope.caveats) || !envelope.generated_at) {
      throw new DashboardClientError("api", "Dashboard API response is missing required envelope fields.", {
        attemptedUrl: url,
        code: "invalid_envelope"
      });
    }
    return envelope as ApiEnvelope<T>;
  }

  return {
    baseUrl: normalizedBaseUrl,
    getStatus: () => request("/api/status"),
    getSessions: (limit = 20, cursor) => request(`/api/sessions?limit=${encodeURIComponent(String(limit))}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
    getRun: (runId) => request(`/api/runs/${encodeURIComponent(runId)}`),
    getArtifactDetail: (runId, artifactId) =>
      request(`/api/runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}`),
    getLargeRun: (runId, cursor) => request<LargeRunResponse>(`/api/runs/${encodeURIComponent(runId)}/large${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    getLargeRunRequests: (runId, cursor) => request<LargeRunPage>(`/api/runs/${encodeURIComponent(runId)}/large/requests${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    getLargeRunArtifacts: (runId, requestId, cursor) => request<LargeRunArtifactPage>(`/api/runs/${encodeURIComponent(runId)}/large/requests/${encodeURIComponent(requestId)}/artifacts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`)
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
