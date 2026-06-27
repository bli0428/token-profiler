export type DashboardClientErrorKind =
  | "offline"
  | "api"
  | "version-mismatch"
  | "not-found"
  | "unknown";

export class DashboardClientError extends Error {
  readonly kind: DashboardClientErrorKind;
  readonly status?: number;
  readonly attemptedUrl?: string;
  readonly code?: string;

  constructor(
    kind: DashboardClientErrorKind,
    message: string,
    options: { status?: number; attemptedUrl?: string; code?: string } = {}
  ) {
    super(message);
    this.name = "DashboardClientError";
    this.kind = kind;
    this.status = options.status;
    this.attemptedUrl = options.attemptedUrl;
    this.code = options.code;
  }
}

export function isDashboardClientError(error: unknown): error is DashboardClientError {
  return error instanceof DashboardClientError;
}
