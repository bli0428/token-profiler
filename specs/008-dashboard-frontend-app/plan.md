# Implementation Plan: Isolated Dashboard Frontend App

**Branch**: `008-dashboard-frontend-app` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-dashboard-frontend-app/spec.md`

## Summary

Add a top-level, self-contained dashboard web app under `dashboard/` with its own package metadata, build/test commands, API client, contract fixtures, shell/controller boundaries, run explorer, styling system, and UI tests. The app consumes only the local dashboard API contract from spec 007 over HTTP. It must not import `src/`, analyzer/store/dashboard internals, CLI modules, or generated static dashboard code.

This feature sets the architecture correctly from the first implementation. It does not start with a temporary all-in-one `App.tsx`, mega data hook, catch-all stylesheet, or hand-authored-only fixture layer. API-real contract fixtures, small hooks, pure utilities, centralized privacy display policy, package-owned validation, and responsibility-focused styles are foundational 008 work.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+ with browser-targeted frontend TypeScript.

**Primary Dependencies**: Top-level `dashboard/package.json` owns frontend dependencies. Use Vite with React for the app shell and Vitest/Testing Library for app tests. Keep dependencies isolated from the root package.

**Storage**: No app-owned persistence beyond browser URL/query state or lightweight local view preferences if needed. Captured run data remains behind the local dashboard API. API-real baseline fixture JSON is stored under `dashboard/test/fixtures/api-real/` or an equivalent dashboard-owned fixture path.

**Testing**: Dashboard-owned `npm` scripts for typecheck, unit/component tests, build, import-boundary validation, and contract fixture validation. Tests include API client behavior, API-real baseline fixtures from spec 007 responses, edge fixtures, privacy no-leak rendering, pure filter/sort utilities, state reconciliation, package boundaries, and responsive large-run behavior. Root scripts may optionally invoke dashboard-owned scripts but must not own dashboard validation logic or include `dashboard/src` in root `tsconfig`.

**Target Platform**: Local developer browser served from a local Vite dev server or built static assets; API target is the local dashboard API from spec 007.

**Project Type**: Separate top-level frontend application in a repository that also contains the local CLI/proxy/analyzer project.

**Performance Goals**: The app should render initial session data within 10 seconds when the local API is available, and filtering/sorting a 1,000-artifact fixture should visibly update within one second on a typical local developer machine.

**Constraints**: `dashboard/` must be self-contained, have its own package metadata, and avoid all imports from root `src/`. The app consumes HTTP JSON only, treats `schema_version` as required, does not recompute analyzer outputs, does not expose hidden raw content, uses `VITE_DASHBOARD_API_BASE_URL` for browser API configuration, and remains removable without source-tree changes outside optional root orchestration.

**Scale/Scope**: Implement package boundary validation, API contract/client types, API-real and edge fixtures, app shell/controller/state boundaries, privacy display policy, pure filter/sort utilities, responsibility-focused styles, status/session/run/detail workflows, refresh behavior, tests, and documentation. Do not build API server endpoints in this feature. Do not migrate or delete `src/surfaces/dashboard/`; cleanup belongs to spec 009.

## Constitution Check

- **Local-first observability**: Pass. The app targets a local API and does not require remote services.
- **Privacy modes**: Pass if UI tests prove metadata-only and hidden content states never render hidden raw content, and privacy display policy is centralized before feature views proliferate.
- **Provider-agnostic insight**: Pass. The app renders API-provided analyzer/dashboard-safe records rather than provider internals.
- **Architecture boundaries**: Pass if `dashboard/` imports no `src/` modules, consumes only HTTP/fixture JSON contract data, and root source does not include dashboard app code.
- **Explainability over raw numbers**: Pass. The UI includes task groups, artifact details, caveats, privacy states, and attribution notes.
- **Documentation separation**: Pass. Endpoint/client schemas live in contracts and plan artifacts, not product-only prose.
- **Code organization**: Pass if app concerns are split across API client, contract types, fixtures, shell/controller, small hooks, pure utilities, components, privacy policy, styles, and tests.

## Project Structure

### Documentation (this feature)

```text
specs/008-dashboard-frontend-app/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-app-contract.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
dashboard/
├── package.json
├── package-lock.json
├── index.html
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── scripts/
│   └── capture-api-fixtures.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # mount point only
│   ├── api/
│   │   ├── client.ts
│   │   ├── errors.ts
│   │   └── types.ts
│   ├── shell/
│   │   ├── DashboardShell.tsx
│   │   └── DashboardController.tsx
│   ├── run-explorer/
│   │   ├── RunExplorer.tsx
│   │   ├── RunOverview.tsx
│   │   ├── TaskGroups.tsx
│   │   ├── FiltersBar.tsx
│   │   ├── ArtifactTable.tsx
│   │   └── ArtifactDetailPanel.tsx
│   ├── sessions/
│   │   └── SessionList.tsx
│   ├── components/
│   │   ├── CaveatList.tsx
│   │   ├── EmptyState.tsx
│   │   └── ErrorState.tsx
│   ├── hooks/
│   │   ├── useApiStatus.ts
│   │   ├── useSessions.ts
│   │   ├── useSelectedRun.ts
│   │   ├── useArtifactDetail.ts
│   │   ├── useRefresh.ts
│   │   └── useUrlState.ts
│   ├── policy/
│   │   └── privacy-display.ts
│   ├── state/
│   │   ├── view-state.ts
│   │   └── reconcile.ts
│   ├── utils/
│   │   └── run-filters.ts
│   ├── styles/
│   │   ├── app.css
│   │   ├── tokens.css
│   │   ├── layout.css
│   │   ├── states.css
│   │   ├── sessions.css
│   │   ├── run-explorer.css
│   │   ├── tables.css
│   │   └── detail.css
│   └── test/
│       ├── api-client.test.ts
│       ├── contract-fixtures.test.ts
│       ├── import-boundary.test.ts
│       ├── package-boundary.test.ts
│       ├── privacy-display.test.ts
│       ├── privacy-rendering.test.tsx
│       ├── refresh-state.test.tsx
│       ├── run-explorer.test.tsx
│       ├── run-filters.test.ts
│       ├── shell-controller.test.tsx
│       └── style-boundary.test.ts
├── test/
│   ├── fixtures/
│   │   ├── api-real/
│   │   │   ├── status.json
│   │   │   ├── sessions.json
│   │   │   ├── run.json
│   │   │   └── artifact-detail.json
│   │   ├── edge-fixtures.ts
│   │   └── large-run-fixture.ts
│   └── helpers/
│       └── contract-fixtures.ts
└── README.md
```

**Structure Decision**: Add one self-contained `dashboard/` package. The app duplicates contract-facing TypeScript types in `dashboard/src/api/types.ts` from the public HTTP contract rather than importing root types, and immediately guards that duplication with API-real baseline fixtures captured over HTTP from spec 007 responses. Test fixtures and fixture-loading helpers live under `dashboard/test/` so production source cannot import or bundle fixture data. The top-level `App.tsx` remains a mount point. Shell/controller, run explorer, hooks, utilities, privacy policy, and style modules are separate from the first implementation.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not import any file from `src/`, including `src/surfaces/dashboard/*`.
- Do not import `dashboard/test/**` from `dashboard/src/**`; API-real fixtures and fixture helpers are test-only.
- Do not read `~/.token-profiler/runs/` or local JSONL files from the browser app.
- Do not rely only on hand-authored fixtures; keep at least one API-real baseline fixture set from the completed 007 API.
- Do not recompute analyzer metrics, task grouping, privacy state, readable labels, or attribution caveats in the frontend.
- Do not treat missing metrics as zero unless the API reports zero.
- Do not render hidden raw prompt, command output, file content, patch, or message body values from fixtures or responses.
- Do not use `canonical_run_id` for routing, selected-run state, API route construction, or URL state.
- Do not let `App.tsx` own dashboard orchestration.
- Do not create a single hook that owns API transport, URL state, refresh state, filter/sort logic, detail loading, and reconciliation.
- Do not grow `dashboard/src/styles/app.css` into a catch-all stylesheet.
- Do not require the root package to install frontend dependencies.
- Do not include `dashboard/src` in root `tsconfig`.
- Do not make the frontend dev server a prerequisite for the dashboard API feature.
- Do not delete or migrate static dashboard code in this feature.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-app-contract.md](./contracts/dashboard-app-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. The app runs locally and depends only on local HTTP data.
- **Privacy modes**: Pass. Data model and contract require privacy state rendering, centralized privacy display policy, and metadata-only no-leak tests.
- **Provider-agnostic insight**: Pass. The UI is driven by dashboard API records, not provider payloads.
- **Architecture boundaries**: Pass. Planned source tree keeps the frontend under `dashboard/`, with explicit import/package-boundary tests and no root source inclusion.
- **Explainability over raw numbers**: Pass. Overview metrics are paired with task groups, artifact drilldown, caveats, and attribution states.
- **Documentation separation**: Pass. Technical client, fixture, package, state, and style details are in planning artifacts.
- **Code organization**: Pass. Planned app modules separate API access, fixtures, shell/controller, state, filters, privacy policy, components, styles, and tests.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
