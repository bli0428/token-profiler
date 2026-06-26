# Contract: Dashboard API Surface

## Purpose

The dashboard API is the only supported data boundary for the isolated dashboard frontend. It adapts local canonical run data and analyzer-derived dashboard records into versioned JSON. Browser clients must not read JSONL files directly or import project internals.

## Base Rules

- Bind locally by default.
- Read-only: no endpoint mutates captured run data.
- All successful responses include `schema_version`.
- All responses exclude provider-specific payloads and hidden raw content.
- Metrics, labels, task groups, details, privacy states, and caveats come from analyzers or dashboard-safe view-model mapping.
- Unknown resources return structured errors.

## Response Envelope

```ts
type ApiEnvelope<T> = {
  schema_version: 1;
  generated_at: string;
  data: T;
  caveats: DashboardCaveat[];
};
```

## Error Shape

```ts
type ApiError = {
  schema_version: 1;
  generated_at: string;
  error:
    | "not_found"
    | "run_unreadable"
    | "artifact_not_found"
    | "invalid_request"
    | "internal_error";
  message: string;
  status: number;
  caveats: DashboardCaveat[];
};
```

## Endpoints

### `GET /api/status`

Returns service readiness and contract information.

```ts
type StatusResponse = ApiEnvelope<{
  service: "token-profiler-dashboard-api";
  ready: boolean;
  read_only: true;
  local_only: true;
  data_root_label: string;
  schema_version: 1;
  capabilities: {
    sessions: true;
    run_view: true;
    artifact_detail: true;
    refresh: "request";
  };
}>;
```

Expected status:

- `200` when the service can respond.

### `GET /api/sessions?limit=20`

Returns recent local sessions.

```ts
type SessionsResponse = ApiEnvelope<{
  sessions: DashboardApiSession[];
}>;
```

Rules:

- Default limit is 20.
- Sessions sort by update time descending, then run ID ascending.
- Unreadable sessions may appear with `availability.status = "unavailable"` and a caveat.
- Session payloads should avoid absolute paths unless explicitly retained as a local-only diagnostic field.

Expected status:

- `200` for success, including empty session lists.

### `GET /api/runs/:runId`

Returns the full dashboard-safe run view.

```ts
type RunResponse = ApiEnvelope<DashboardApiRun>;
```

Rules:

- `runId` is resolved under the configured local profiler runs directory.
- Responses are generated from current local data on request.
- Malformed or unsupported run data returns a structured error.
- Hidden raw content is excluded from the entire response, including embedded detail records and search fields.

Expected status:

- `200` for success.
- `404` when the run does not exist.
- `422` when the run exists but cannot be interpreted as supported canonical data.

### `GET /api/runs/:runId/artifacts/:artifactId`

Returns one artifact detail from a selected run.

```ts
type ArtifactDetailResponse = ApiEnvelope<DashboardApiArtifactDetail>;
```

Rules:

- `artifactId` may be the stable artifact ID or stable short ID when unambiguous.
- Detail payloads include identity, metrics, metadata sections, tool links, task membership, privacy state, and caveats.
- Missing detail returns a structured artifact-not-found response.

Expected status:

- `200` for success.
- `404` for unknown run or artifact.
- `422` when the run cannot be interpreted.

## Cross-Origin And Client Access

For the local dashboard app, the API should allow browser access from the configured local dashboard origin. If the implementation uses a separate frontend dev server during development, document the allowed origin in the plan or quickstart.

## Contract Validation

Required validation scenarios:

- Status response includes readiness, read-only/local-only flags, and schema version.
- Sessions response updates after a new fixture run appears.
- Run response matches analyzer totals for fixture data.
- Artifact detail response finds a known artifact by stable identity.
- Unknown run and artifact responses use structured errors.
- Metadata-only fixture responses do not contain hidden raw content.
- Large fixture run returns within the success criterion.
- Import-boundary checks confirm dashboard frontend does not import main project internals.
