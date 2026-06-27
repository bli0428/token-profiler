# Data Model: Dashboard Contract Drift Guards

## DashboardContractBaselineFixtureSet

Represents API-real successful responses generated from the completed local dashboard API.

**Fields**:

- `status`: Response from `GET /api/status`.
- `sessions`: Response from `GET /api/sessions?limit=20` or documented fixture limit.
- `run`: Response from `GET /api/runs/:runId`.
- `artifactDetail`: Response from `GET /api/runs/:runId/artifacts/:artifactId`.
- `source`: Safe fixture run identifier, generated timestamp policy, API version, and generation command metadata.

**Validation rules**:

- Every successful response includes supported `schema_version`.
- `run.data.run_id` matches the routable run ID used for generation.
- `artifactDetail` belongs to the generated run fixture.
- Hidden raw content is absent from all generated baseline files.
- Volatile fields are normalized or documented.

## DashboardContractEdgeFixtureSet

Represents curated edge responses used by dashboard contract tests.

**Fields**:

- `emptySessions`: Successful sessions response with no sessions.
- `runNotFound`: Structured unknown-run error.
- `artifactNotFound`: Structured unknown-artifact error.
- `runUnreadable`: Structured unreadable-run error.
- `partialRun`: Successful run response with partial-data caveats.
- `staleRun`: Successful run response with stale-data caveats.
- `metadataOnlyRun`: Successful run response with metadata-only privacy states.
- `hiddenContentDetail`: Artifact detail response that distinguishes hidden, unavailable, and uncaptured content.
- `unsupportedVersion`: Successful response envelope with unsupported `schema_version`.
- `largeRunShape`: Large run response or generator output with at least 1,000 artifact rows.

**Validation rules**:

- Edge fixtures use the same public envelope and error shapes as spec 007 unless intentionally testing unsupported versions.
- Privacy fixtures include no raw prompt, command output, patch, file content, or message body values.
- Structured error fixtures preserve `error`, `message`, `status`, `generated_at`, `schema_version`, and `caveats`.

## DashboardContractFixtureCaptureScript

Represents the dashboard-owned HTTP capture script that creates baseline fixtures.

**Fields / inputs**:

- `apiBaseUrl`: Local dashboard API origin.
- `runId`: Routable run ID to request.
- `artifactId`: Artifact ID to request.
- `outputDirectory`: Dashboard-readable fixture output path.
- `normalizationPolicy`: Rules for generated timestamps and local-only labels.

**Relationships**:

- Requests the real dashboard API from spec 007.
- Writes `DashboardContractBaselineFixtureSet` files for dashboard tests.

**Validation rules**:

- Fails if the API is unavailable, not ready, or reports an unsupported schema version.
- Fails if sessions are empty and no explicit run ID is provided.
- Fails if selected fixture output contains hidden raw content.
- Does not import root code or read local JSONL files directly.

## DashboardContractFixtureConsumer

Represents dashboard-owned tests that load fixtures and validate duplicated API expectations.

**Fields / behavior**:

- Loads baseline and edge fixture JSON.
- Parses fixtures through dashboard API client/type guards or validation helpers.
- Renders key UI states where needed.
- Reuses the spec 008 import-boundary check.

**Validation rules**:

- Reads fixture files or in-package fixture modules only.
- Does not import root `src/`.
- Keeps fixture helpers under `dashboard/test/helpers/` and out of production `dashboard/src/**` imports.
- Fails on missing required fields, unsupported versions, unexpected raw-content fields, and incompatible structured error shapes.

## DashboardContractDriftReport

Represents the observable result of drift checks.

**Fields**:

- `endpoint`: Status, sessions, run, artifact detail, or edge case.
- `fixture`: Fixture file path.
- `result`: Pass or fail.
- `reason`: Missing field, version mismatch, privacy leak, parse failure, render failure, or import-boundary failure.

**Validation rules**:

- Failures identify the fixture and endpoint involved.
- Privacy failures identify the unsafe field category without printing hidden raw content.
