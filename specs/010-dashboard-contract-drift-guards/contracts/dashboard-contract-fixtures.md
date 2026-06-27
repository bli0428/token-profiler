# Contract: Dashboard Contract Fixtures

## Purpose

Dashboard contract fixtures protect the intentional duplication between the real spec 007 dashboard API contract and the isolated spec 008 dashboard frontend API types. The dashboard must consume these fixtures as an external client and must not import root implementation code.

## Fixture Classes

### API-Real Baseline Fixtures

Generated from actual local API responses:

- `GET /api/status`
- `GET /api/sessions?limit=20`
- `GET /api/runs/:runId`
- `GET /api/runs/:runId/artifacts/:artifactId`

Required files:

```text
dashboard/scripts/capture-api-fixtures.ts
dashboard/test/fixtures/api-real/status.json
dashboard/test/fixtures/api-real/sessions.json
dashboard/test/fixtures/api-real/run.json
dashboard/test/fixtures/api-real/artifact-detail.json
dashboard/test/fixtures/api-real/source.json
dashboard/test/helpers/contract-fixtures.ts
```

Rules:

- Every successful response must use the spec 007 `ApiEnvelope<T>` shape.
- Every successful fixture must include supported `schema_version`.
- `run.json` must use the same routable `run_id` requested from `/api/runs/:runId`.
- `artifact-detail.json` must describe an artifact from the generated run fixture.
- Fixtures must exclude provider-specific payloads and hidden raw content.
- Generation metadata belongs in `source.json`, not inside API response payloads unless the API itself returns it.

### Edge Fixtures

Curated fixtures cover non-happy-path behavior:

- Empty sessions.
- Unknown run structured error.
- Unknown artifact structured error.
- Unreadable run structured error.
- Partial run with caveats.
- Stale run with caveats.
- Metadata-only run.
- Hidden, unavailable, and uncaptured artifact detail states.
- Unsupported successful response version.
- Large run shape with at least 1,000 artifact rows.

Rules:

- Edge fixtures should live under dashboard-owned test fixture paths such as `dashboard/test/fixtures/edge-fixtures.ts`.
- Edge fixtures must use public API envelope or error shapes, except unsupported-version fixtures that intentionally violate supported version expectations.
- Privacy fixtures must contain no hidden raw prompt, command output, patch, file-content, or message body values.

## Generator Contract

The fixture capture script lives in the dashboard package and calls the real API over HTTP. It must not import root API implementation modules or read local JSONL files directly.

Required inputs:

```text
--api <local-api-origin>
--run-id <safe-routable-run-id>
--artifact-id <safe-artifact-id>
--output <fixture-output-directory>
```

Default output may be the dashboard API-real fixture directory under `dashboard/test/fixtures/api-real/`.

Generator requirements:

- Request all four baseline endpoints from the real API.
- Use only documented HTTP requests against the configured local API origin.
- Fail if the API is not ready, not local-only, or not read-only.
- Fail if any successful response is missing `schema_version`.
- Fail if hidden raw content appears in generated fixture files.
- Normalize or document volatile fields such as `generated_at`.
- Produce deterministic JSON formatting for review.

## Dashboard Consumer Contract

Dashboard tests must consume fixtures like external API data:

- Load JSON fixture files.
- Parse or validate them using dashboard-owned API client/type guards.
- Render UI states where behavior is user-visible.
- Keep import-boundary checks active.
- Keep fixture loading helpers under `dashboard/test/helpers/`; production `dashboard/src/**` code must not import fixture files or helpers.

Forbidden dashboard dependencies:

```text
src/*
../src/*
../../src/*
@/../src/*
/Users/*/TokenEfficiencyTracker/src/*
```

Equivalent relative traversal into root `src/` is also forbidden.

Production dashboard source must also not import:

```text
dashboard/test/*
../test/*
../../test/*
```

## Required Validation Scenarios

- Status fixture gates readiness, local-only mode, read-only mode, capabilities, and schema version.
- Sessions fixture validates routable `run_id`, optional `canonical_run_id`, ordering assumptions, availability, caveats, and empty-state compatibility.
- Run fixture validates overview metrics, artifact rows, task groups, filter options, privacy state, and caveats.
- Artifact detail fixture validates identity, metrics, metadata sections, relationships, privacy state, and caveats.
- Structured error fixtures validate error code, message, status, schema version, generated time, and caveats.
- Unsupported-version fixture prevents rendering as valid dashboard data.
- Privacy fixtures validate zero hidden raw content.
- Import-boundary validation proves fixture tests do not couple dashboard source to root `src/`.
