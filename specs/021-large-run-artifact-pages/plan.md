# Implementation Plan: Large Run Artifact Pages

**Branch**: `main` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-large-run-artifact-pages/spec.md`

## Summary

Add a local, read-only cursor-paginated artifact page for one selected request in a large captured run. The canonical store continues streaming JSONL; the analyzer selects only that request's artifacts and retains at most a page plus one look-ahead record; the dashboard API validates a run-, request-, and source-version-bound opaque cursor and maps canonical artifact facts through the privacy-safe display policy. The React explorer forwards cursors unchanged and pages the selected request without downloading run-wide artifact history or invoking the full-detail analyzer.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+.

**Primary Dependencies**: Node stream support, TypeScript, existing Zod-backed canonical events and dashboard API; no new runtime dependency.

**Storage**: Existing local canonical `events.jsonl`; no migration, database, or large-run artifact cache.

**Testing**: Node test runner with `tsx`; root TypeScript check; dashboard Vitest/typecheck for client and explorer changes.

**Target Platform**: Local dashboard API and local browser dashboard.

**Project Type**: Local observability CLI/proxy with a dashboard web application.

**Performance Goals**: Return no more than the accepted page size (maximum 500). Each artifact-page request streams the JSONL file and retains no more than the returned artifacts plus one matching look-ahead record; it does not allocate run-wide artifact history or read the file as one string.

**Constraints**: Preserve Adapters -> Canonical Store -> Analyzers -> Surfaces. Cursors are API-owned, opaque, and bound to the run ID, request ID, and source version. Provider payloads and stored artifact content never cross the adapter boundary; page fields follow existing privacy-safe display behavior.

**Scale/Scope**: 1 GB+ / million-event captures; artifact rows for exactly one selected request. Full artifact detail aggregation, run-wide artifact lists, browser-side reconstruction, and content reveal are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-first observability**: Pass. The endpoint reads only local canonical capture data and has no remote dependency.
- **Privacy modes are product behavior**: Pass. Metadata-only, preview, and raw storage modes are represented by the established privacy state; no page returns raw/preview content.
- **Provider-agnostic insight**: Pass. The analyzer consumes canonical artifact records only; provider payloads remain in adapters.
- **Architecture boundaries**: Pass. Store streams, analysis selects a bounded canonical page, the API validates/maps transport data, and the dashboard renders the declared response.
- **Explainability over raw numbers**: Pass. Rows identify the artifact's canonical type, privacy-safe display identity, request order, and local token contribution.
- **Documentation separation**: Pass. Pagination, cursor, privacy, and performance decisions are recorded in this plan and its design artifacts, not the feature spec.
- **Code organization**: Pass. The concern remains a focused large-run analyzer function plus dashboard API/client surface mapping.

## Project Structure

### Documentation (this feature)

```text
specs/021-large-run-artifact-pages/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── large-run-artifact-pages-api.md
```

### Source Code (repository root)

```text
src/
├── core/store/index.ts                    # Existing incremental canonical JSONL reader
├── analysis/
│   ├── large-run.ts                       # Bounded selected-request artifact selection/page primitive
│   ├── index.ts                           # Public analyzer export, if signature/export changes
│   ├── README.md                          # Analyzer usage boundary
│   └── contract.md                        # Analyzer public API/invariants
└── surfaces/dashboard-api/
    ├── large-runs.ts                      # Artifact cursor validation and explicit privacy-safe mapping
    ├── routes.ts                          # GET /api/runs/{run_id}/large/requests/{request_id}/artifacts
    ├── types.ts                           # HTTP artifact-page response type
    ├── README.md                          # Dashboard API usage boundary
    └── contract.md                        # HTTP/API public contract

dashboard/src/
├── api/client.ts                          # Typed artifact-page client request
├── api/types.ts                           # Mirrored transport types
└── run-explorer/LargeRunExplorer.tsx      # Selected-request artifact paging UI

test/
└── large-run-dashboard-api.test.js        # Isolation, cursor, ordering, privacy, and bounded-path coverage

dashboard/src/test/
└── large-run-explorer.test.tsx            # Artifact selection and next-page interaction
```

**Structure Decision**: Feature 019 provides the streaming store and large-run boundary; feature 020 provides source-bound request pagination. This feature extends the same analyzer/API/client seam only for selected-request artifact pages. It must not route through the normal full-detail response builders, because those retain run-wide artifact detail.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/large-run-artifact-pages-api.md](./contracts/large-run-artifact-pages-api.md), and [quickstart.md](./quickstart.md).

## Workstream Boundaries

1. **Canonical store (existing prerequisite)**: Streams complete canonical JSONL records and reports malformed complete records. It knows neither artifact pagination nor HTTP.
2. **Analyzer**: Filters canonical artifact records to one request, preserves canonical artifact order, and returns a bounded page plus a next offset. It must not decode/encode cursors, inspect provider payloads, or construct HTTP/privacy response shapes.
3. **Dashboard API**: Stats the source, validates limit and opaque cursor binding, maps analyzer rows explicitly through the privacy-safe display policy, and translates unreadable runs to documented errors.
4. **Dashboard client/surface**: Requests a first or continuation page, retains the selected request/page state, and renders only declared fields. It must not parse JSONL, decode cursors, construct artifact rows, or expose stored content.

## Post-Design Constitution Check

- **Local-first observability**: Pass. Validation uses local temporary JSONL fixtures and local API handlers.
- **Privacy modes are product behavior**: Pass. Contract rows carry canonical metadata plus `preview_state`; they exclude preview and raw content in every storage mode.
- **Provider-agnostic insight**: Pass. Artifact fields have canonical names and privacy-safe display mapping; no provider-specific payload leaks into analysis or transport.
- **Architecture boundaries**: Pass. Cursor ownership and privacy/HTTP mapping remain in the surface; selected-request scanning remains in analysis.
- **Explainability over raw numbers**: Pass. The contract exposes artifact identity/type, inclusion order, local tokens, and privacy availability.
- **Code organization**: Pass. Existing analysis and dashboard API README/contract pairs will be updated with their changed boundary; no new mixed-responsibility module is needed.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
