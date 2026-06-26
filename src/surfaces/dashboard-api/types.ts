import type {
  DashboardArtifactDetail,
  DashboardCaveat,
  DashboardRunOverview,
  DashboardSession,
  DashboardTaskGroup,
  DashboardViewModel
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

export type DashboardApiSession = Omit<DashboardSession, "run_dir">;

export type DashboardApiRun = Omit<DashboardViewModel, "schema_version" | "generated_at" | "session"> & {
  run_id: string;
  overview: DashboardRunOverview;
  artifact_details: Record<string, DashboardArtifactDetail>;
  task_groups: DashboardTaskGroup[];
};

export type DashboardApiResponse =
  | { status: number; body: DashboardApiEnvelope<unknown> | DashboardApiError; headers?: Record<string, string> };
