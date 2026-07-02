# Dashboard API Contract

This surface owns the HTTP API that the dashboard frontend consumes. Clients
should rely only on the response types and route behavior documented here.

## Server And Route APIs

```ts
type DashboardApiServerOptions = {
  rootDir?: string;
  host?: string;
  port?: number;
  origin?: string;
  staticDir?: string;
  sessionTitleLookup?: DashboardSessionTitleLookup;
  log?: (message: string) => void;
};

function startDashboardApiServer(
  options?: DashboardApiServerOptions
): Promise<{
  server: import("node:http").Server;
  rootDir: string;
  host: string;
  port: number;
}>;

type DashboardApiRouteOptions = {
  rootDir: string;
  origin?: string;
  sessionTitleLookup?: DashboardSessionTitleLookup;
  staticDir?: string;
};

function handleDashboardApiRequest(
  method: string,
  requestUrl: string,
  options: DashboardApiRouteOptions
): Promise<DashboardApiResponse>;

class DashboardApiRouteError extends Error {
  constructor(
    code: DashboardApiErrorCode,
    status: number,
    message: string,
    caveats?: DashboardApiCaveat[]
  );
  code: DashboardApiErrorCode;
  status: number;
  caveats: DashboardApiCaveat[];
}

function envelope<T>(
  data: T,
  caveats?: DashboardApiCaveat[]
): DashboardApiEnvelope<T>;
function apiError(
  code: DashboardApiErrorCode,
  status: number,
  message: string,
  caveats?: DashboardApiCaveat[]
): DashboardApiError;
function errorResponse(error: unknown): { status: number; body: DashboardApiError };
```

## Response Builder APIs

Import from `src/surfaces/dashboard-api/responses.ts`.

```ts
function createStatusResponse(rootDir: string): Promise<DashboardApiStatus>;

function createSessionsResponse(
  rootDir: string,
  options?: {
    limit?: number;
    sessionTitleLookup?: DashboardSessionTitleLookup;
  }
): Promise<{ sessions: DashboardApiSession[] }>;

function createRunResponse(
  rootDir: string,
  runId: string
): Promise<DashboardApiRun>;

function createArtifactDetailResponse(
  rootDir: string,
  runId: string,
  artifactId: string
): Promise<DashboardApiArtifactDetail>;
```

## View Model APIs

```ts
function createDashboardViewModel(
  analysis: RunAnalysisSummary,
  options?: { session?: DashboardViewSession; runDir?: string }
): DashboardViewModel;

function dashboardOverview(
  summary: RunAnalysisSummary,
  artifacts: DashboardViewArtifactRow[],
  caveats: DashboardViewCaveat[],
  taskGroup?: DashboardViewTaskGroup
): DashboardViewRunOverview;

function uniqueCaveats(caveats: AnalysisCaveat[]): AnalysisCaveat[];

type DashboardSessionTitleLookup = (
  sessions: Array<{ run_id: string; updated_at: Date }>
) => Promise<Map<string, string>>;

function createDashboardSessionIndex(
  rootDir: string,
  options?: { limit?: number; sessionTitleLookup?: DashboardSessionTitleLookup }
): Promise<DashboardViewSessionIndex>;

function dashboardPrivacyState(input: {
  storageMode?: string;
  previewState?: PreviewState;
  hiddenFields?: string[];
  unavailableFields?: string[];
  caveats?: AnalysisCaveat[];
  rawRevealed?: boolean;
}): DashboardViewPrivacyState;

function safeDisplayText(
  value: unknown,
  privacy: DashboardViewPrivacyState,
  field?: string
): string | undefined;
function safeSearchText(values: unknown[], privacy: DashboardViewPrivacyState): string;
function metadataRow(
  label: string,
  value: unknown,
  privacy: DashboardViewPrivacyState,
  field?: string
): { label: string; value: string; visibility: "visible" | "hidden" | "unavailable" };
```

## Public Types

Import HTTP-facing types from `src/surfaces/dashboard-api/types.ts`.

- `DASHBOARD_API_SCHEMA_VERSION`
- `DashboardApiEnvelope`, `DashboardApiError`, and `DashboardApiResponse`
- `DashboardApiStatus`, `DashboardApiSession`, `DashboardApiRun`, and
  `DashboardApiArtifactDetail`
- `DashboardApiRequestAccounting`, `DashboardApiRequestAccountingRow`, and
  `DashboardApiRequestArtifactInclusion`
- `DashboardApiTurnGroup` and `DashboardApiTurnRequest`
- `DashboardApiPrivacyState`, `DashboardApiCaveat`, and related row/detail
  types

Artifact rows expose `unique_exposure`, `total_exposure`, `repeated_exposure`,
and `inclusion_count`. `unique_exposure` is the local token exposure from the
first observed appearance of an artifact's content in the run.

Artifact rows and request artifact inclusions expose
`normalized_estimated_input_tokens` when request usage and artifact offsets
allow normalized artifact-level attribution. This field is the normalized total
input-token contribution for the artifact in provider token coordinates; it is
estimated and caveated alongside `estimated_cached_input_tokens` and
`estimated_uncached_input_tokens`.

Artifact rows may expose `normalized_first_occurrence_estimated_input_tokens`, the
normalized provider-coordinate contribution from the artifact's first observed
content-hash appearance in the run.

Import internal view-model types from
`src/surfaces/dashboard-api/view-model-types.ts` only within this surface.
Dashboard clients should depend on HTTP-facing types, not view-model internals.

## Invariants

- Inputs must be analyzer outputs and store/context data needed to shape a
  response.
- Outputs must be explicit HTTP JSON response objects.
- Contract changes here must be reflected in dashboard client types and API
  fixtures.
- The dashboard frontend must not reconstruct analyzer behavior or depend on
  undocumented response fields.
