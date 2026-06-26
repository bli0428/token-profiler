import type { AnalyzerAvailability } from "../../analysis/types.ts";
import type {
  DashboardArtifactDetail,
  DashboardArtifactRow,
  DashboardCaveat,
  DashboardFilterOptions,
  DashboardPrivacyState,
  DashboardRunOverview,
  DashboardTaskGroup,
} from "../dashboard/types.ts";

export const DASHBOARD_API_SCHEMA_VERSION = 1 as const;

export type DashboardApiEnvelope<T> = {
  schema_version: typeof DASHBOARD_API_SCHEMA_VERSION;
  generated_at: string;
  data: T;
  caveats: DashboardCaveat[];
};

export type DashboardApiErrorCode =
  | "not_found"
  | "run_unreadable"
  | "artifact_not_found"
  | "invalid_request"
  | "internal_error";

export type DashboardApiError = {
  schema_version: typeof DASHBOARD_API_SCHEMA_VERSION;
  generated_at: string;
  error: DashboardApiErrorCode;
  message: string;
  status: number;
  caveats: DashboardCaveat[];
};

export type DashboardApiStatus = {
  service: "token-profiler-dashboard-api";
  ready: boolean;
  read_only: true;
  local_only: true;
  data_root_label: string;
  schema_version: typeof DASHBOARD_API_SCHEMA_VERSION;
  capabilities: {
    sessions: true;
    run_view: true;
    artifact_detail: true;
    refresh: "request";
  };
};

export type DashboardApiSession = {
  run_id: string;
  canonical_run_id?: string | undefined;
  label?: string | undefined;
  updated_at?: string | undefined;
  request_count?: number | undefined;
  artifact_count?: number | undefined;
  input_tokens?: number | undefined;
  cached_input_tokens?: number | undefined;
  uncached_input_tokens?: number | undefined;
  output_tokens?: number | undefined;
  availability: AnalyzerAvailability;
  caveats: DashboardCaveat[];
};

export type DashboardApiRun = {
  run_id: string;
  canonical_run_id?: string | undefined;
  overview: DashboardRunOverview;
  artifacts: DashboardArtifactRow[];
  artifact_details: Record<string, DashboardArtifactDetail>;
  task_groups: DashboardTaskGroup[];
  filters: DashboardFilterOptions;
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};

export type DashboardApiResponse =
  | { status: number; body: DashboardApiEnvelope<unknown> | DashboardApiError; headers?: Record<string, string> };
