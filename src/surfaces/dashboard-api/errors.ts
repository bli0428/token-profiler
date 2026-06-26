import type { DashboardCaveat } from "../dashboard/types.ts";
import {
  DASHBOARD_API_SCHEMA_VERSION,
  type DashboardApiEnvelope,
  type DashboardApiError,
  type DashboardApiErrorCode
} from "./types.ts";

export class DashboardApiRouteError extends Error {
  code: DashboardApiErrorCode;
  status: number;
  caveats: DashboardCaveat[];

  constructor(code: DashboardApiErrorCode, status: number, message: string, caveats: DashboardCaveat[] = []) {
    super(message);
    this.name = "DashboardApiRouteError";
    this.code = code;
    this.status = status;
    this.caveats = caveats;
  }
}

export function envelope<T>(data: T, caveats: DashboardCaveat[] = []): DashboardApiEnvelope<T> {
  return {
    schema_version: DASHBOARD_API_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    data,
    caveats
  };
}

export function apiError(
  code: DashboardApiErrorCode,
  status: number,
  message: string,
  caveats: DashboardCaveat[] = []
): DashboardApiError {
  return {
    schema_version: DASHBOARD_API_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    error: code,
    message,
    status,
    caveats
  };
}

export function errorResponse(error: unknown): { status: number; body: DashboardApiError } {
  if (error instanceof DashboardApiRouteError) {
    return {
      status: error.status,
      body: apiError(error.code, error.status, error.message, error.caveats)
    };
  }

  return {
    status: 500,
    body: apiError("internal_error", 500, "The dashboard API could not complete the request.")
  };
}
