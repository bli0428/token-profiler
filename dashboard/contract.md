# Dashboard API Client Contract

The dashboard package consumes the local dashboard API over HTTP. Frontend code
should use the client and types listed here rather than importing root `src/`
modules.

## Client APIs

Import from `dashboard/src/api/client.ts`.

```ts
type DashboardApiClient = {
  baseUrl: string;
  getStatus(): Promise<StatusResponse>;
  getSessions(limit?: number): Promise<SessionsResponse>;
  getRun(runId: string): Promise<RunResponse>;
  getArtifactDetail(
    runId: string,
    artifactId: string
  ): Promise<ArtifactDetailResponse>;
};

function getConfiguredApiBaseUrl(): string;
function createDashboardApiClient(baseUrl?: string): DashboardApiClient;
```

`getConfiguredApiBaseUrl` reads `VITE_DASHBOARD_API_BASE_URL` and defaults to
same-origin requests.

Import from `dashboard/src/api/errors.ts`.

```ts
type DashboardClientErrorKind =
  | "offline"
  | "api"
  | "version-mismatch"
  | "not-found"
  | "unknown";

class DashboardClientError extends Error {
  readonly kind: DashboardClientErrorKind;
  readonly status?: number;
  readonly attemptedUrl?: string;
  readonly code?: string;
  constructor(
    kind: DashboardClientErrorKind,
    message: string,
    options?: { status?: number; attemptedUrl?: string; code?: string }
  );
}

function isDashboardClientError(error: unknown): error is DashboardClientError;
```

## Client Types

Import from `dashboard/src/api/types.ts`.

- Response envelopes: `ApiEnvelope`, `StatusResponse`, `SessionsResponse`,
  `RunResponse`, and `ArtifactDetailResponse`.
- Top-level data types: `DashboardStatus`, `DashboardSession`,
  `DashboardRun`, and `DashboardArtifactDetail`.
- Request accounting types: `DashboardRequestAccounting`,
  `DashboardRequestAccountingRow`, and `DashboardRequestArtifactInclusion`.
- Turn drilldown types: `DashboardTurnGroup`, `DashboardTurnRequest`,
  `TurnGroupingSource`, `TurnTitleSource`, `TurnConfidence`, and
  `TurnRequestTitleSource`.
- Shared support types: `DashboardCaveat`, `DashboardPrivacyState`,
  `AvailabilityState`, `RequestUsageAvailability`, and
  `ProviderRequestUsage`.

## Invariants

- Dashboard inputs come from the dashboard API over HTTP JSON.
- Client types mirror the HTTP contract owned by
  `src/surfaces/dashboard-api/types.ts`.
- Dashboard components may transform API data for presentation, but they must
  not infer new domain facts.
- Frontend code must not import root `src/` modules, local JSONL data, or
  adapter/analyzer internals.
