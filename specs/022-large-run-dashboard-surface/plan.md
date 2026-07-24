# Implementation Plan: Large Run Dashboard Surface

**Branch**: `main` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-large-run-dashboard-surface/spec.md`

## Summary

Render the existing large-run API contract as a dedicated, paged dashboard
experience. The controller selects it only for sessions marked
`large_run_paged`; `LargeRunExplorer` requests an initial overview and follows
API-owned request/artifact cursors only on user action. It stores the returned
pages for rendering and never reads JSONL, aggregates artifacts, decodes
cursors, or derives privacy/grouping facts.

## Technical Context

**Language/Version**: TypeScript, React 19, Vite, Node.js 18+ for tooling.

**Primary Dependencies**: Existing React hooks, dashboard HTTP client/types, Vitest, and Testing Library; no new runtime dependency.

**Storage**: Browser component state contains only the current API responses and returned opaque cursors; canonical JSONL remains server-owned.

**Testing**: Dashboard Vitest/Testing Library, dashboard TypeScript check, and existing dashboard API contract tests.

**Target Platform**: Local browser dashboard served by the local dashboard API.

**Project Type**: Local observability dashboard web application.

**Performance Goals**: Initial selection fetches only the API's bounded overview/request page; subsequent requests and artifacts are fetched only when activated. No browser response or component state contains run-wide artifacts.

**Constraints**: Preserve Adapters -> Canonical Store -> Analyzers -> Surfaces. Consume only the dashboard HTTP contract, forward opaque cursors unchanged, preserve API-supplied privacy state, and retain the normal-run explorer path.

**Scale/Scope**: Large sessions of 1 GB+ / million events. This feature is the dashboard surface for the bounded API seams from features 019--021; API pagination design, artifact detail/reveal, filtering, and browser-side reconstruction are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-first observability**: Pass. The browser calls the existing local read-only dashboard API only.
- **Privacy modes are product behavior**: Pass. The UI renders the API's `preview_state` as availability information and never requests or reconstructs content.
- **Provider-agnostic insight**: Pass. It displays canonical dashboard fields only; it introduces no provider payload dependency.
- **Architecture boundaries**: Pass. This is exclusively a surface consuming HTTP transport types; it does not access store or analyzer code.
- **Explainability over raw numbers**: Pass. Overview, request usage, artifact counts, artifact identity/type, token contribution, and privacy availability explain the paged data.
- **Documentation separation**: Pass. UI/client mechanics and validation reside in this plan and design artifacts; the feature spec remains outcome-focused.
- **Code organization**: Pass. The existing focused large-run explorer and dashboard API client/types own the changes; dashboard README/contract are updated for the changed public surface.

## Project Structure

### Documentation (this feature)

```text
specs/022-large-run-dashboard-surface/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── large-run-dashboard-ui.md
```

### Source Code (repository root)

```text
dashboard/
├── README.md                              # Dashboard usage, including paged large-run behavior
├── contract.md                            # Client/surface boundary and cursor invariants
└── src/
    ├── api/
    │   ├── client.ts                      # Typed initial/request/artifact page methods
    │   └── types.ts                       # Mirrored large-run transport types
    ├── run-explorer/
    │   └── LargeRunExplorer.tsx           # Dedicated large-run fetch/state/render flow
    ├── shell/
    │   └── DashboardController.tsx        # Selects normal or paged explorer from session caveat
    ├── styles/
    │   ├── app.css                        # Imports page styling
    │   └── tables.css                     # Reusable bounded-table presentation rules
    └── test/
        └── large-run-explorer.test.tsx    # Rendering and opaque-cursor interactions

src/surfaces/dashboard-api/
├── contract.md                            # Existing transport source of truth (prerequisite)
└── types.ts                               # Existing large-run HTTP types (prerequisite)
```

**Structure Decision**: Feature 022 consumes the completed API seams from 019--021 solely in the dashboard package. The controller owns route selection, the API client owns HTTP/cursor forwarding, and `LargeRunExplorer` owns view state and rendering. No server, adapter, canonical-store, or analyzer module changes are required.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/large-run-dashboard-ui.md](./contracts/large-run-dashboard-ui.md), and [quickstart.md](./quickstart.md).

## Workstream Boundaries

1. **Dashboard controller**: Detects the API-provided `large_run_paged` caveat and renders the dedicated explorer instead of the normal full-run explorer. It does not infer large-run state from file size or artifact count.
2. **Dashboard API client/types**: Mirror the server contract, URL-encode route identifiers, and forward an optional opaque cursor. They do not validate, decode, or construct cursor values.
3. **Large-run explorer**: Holds the returned overview/request/artifact pages, supports explicit continuation actions, and renders only declared fields. It does not merge pages by inference, access JSONL, or derive grouping/privacy facts.
4. **Dashboard documentation/tests**: Describe the HTTP-only boundary and prove initial, continuation, selected-request, privacy-state, and normal-path behavior with API-shaped fixtures.

## Post-Design Constitution Check

- **Local-first observability**: Pass. The quickstart validates against local API-shaped fixtures and local dashboard tooling.
- **Privacy modes are product behavior**: Pass. Artifacts render a returned availability state only; preview/raw bodies remain outside the component contract.
- **Provider-agnostic insight**: Pass. UI labels and types use canonical API field names.
- **Architecture boundaries**: Pass. The surface consumes transport data without reaching into upstream layers.
- **Explainability over raw numbers**: Pass. The UI makes page limits and data scope visible through a dedicated paged-run state and request/artifact controls.
- **Code organization**: Pass. Public dashboard client/surface behavior is documented in both `dashboard/README.md` and `dashboard/contract.md`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
