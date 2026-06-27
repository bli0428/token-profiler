# Implementation Plan: Dashboard Shell State Architecture

> Superseded by expanded spec 008. Retained as an audit/reference artifact; do not implement as a separate feature unless spec 008 is later split again.

**Branch**: `011-dashboard-shell-state-architecture` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-dashboard-shell-state-architecture/spec.md`

## Summary

Audit the post-008 dashboard frontend architecture so `App.tsx` or any broad dashboard data hook do not become integration sinks. Verify explicit shell, controller, run explorer, hook, utility, privacy policy, and reconciliation boundaries under `dashboard/`. Preserve the isolated dashboard app contract from spec 008 and keep `canonical_run_id` out of all routing and selection state.

This work is explicitly deferred until spec 008 is complete.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+ with browser-targeted React from the spec 008 dashboard app.

**Primary Dependencies**: Existing `dashboard/package.json` dependencies from spec 008. No new root package dependencies.

**Storage**: Browser URL/query state and lightweight app view state only. Captured run data remains behind the local dashboard API.

**Testing**: Dashboard-owned typecheck and unit/component tests. Add focused tests for controller actions, reconciliation, pure utilities, privacy policy, and `run_id` routing.

**Target Platform**: Local developer browser served by the spec 008 Vite dashboard app.

**Project Type**: Audit reference for architecture boundaries inside the self-contained top-level dashboard app.

**Performance Goals**: Preserve spec 008 responsiveness for 1,000 artifact fixtures. Pure filter/sort utilities should update visible rows within one second on a typical local developer machine.

**Constraints**: Do not start implementation until spec 008 is complete. Keep all dashboard source changes under `dashboard/`. Do not import root `src/`. Do not recompute analyzer facts. Do not use `canonical_run_id` for routing.

**Scale/Scope**: Split app shell, controller, hooks, run explorer boundary, utilities, privacy display policy, and state reconciliation. Do not add new API endpoints, mutate captured data, migrate legacy static dashboard code, or modify root source.

## Constitution Check

- **Local-first observability**: Pass. The app remains local and read-only.
- **Privacy modes**: Pass if privacy rendering decisions are centralized and tested.
- **Provider-agnostic insight**: Pass. The dashboard consumes API records and does not touch provider payloads.
- **Architecture boundaries**: Pass if dashboard source remains under `dashboard/` and imports no root `src/`.
- **Explainability over raw numbers**: Pass. Any audit fixes preserve run overview, artifact detail, caveats, and privacy states.
- **Documentation separation**: Pass. Architecture contract lives in [contracts/dashboard-app-architecture.md](./contracts/dashboard-app-architecture.md).
- **Code organization**: Pass if shell, controller, hooks, utilities, policies, and components have owned responsibilities.

## Project Structure

### Documentation (this feature)

```text
specs/011-dashboard-shell-state-architecture/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-app-architecture.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root, future implementation)

```text
dashboard/src/
├── App.tsx
├── shell/
│   └── DashboardShell.tsx
├── controllers/
│   ├── DashboardController.tsx
│   └── dashboard-actions.ts
├── explorer/
│   ├── RunExplorer.tsx
│   └── run-explorer-types.ts
├── hooks/
│   ├── useArtifactDetail.ts
│   ├── useDashboardStatus.ts
│   ├── useRefreshLifecycle.ts
│   ├── useRunData.ts
│   ├── useSessions.ts
│   └── useUrlRunState.ts
├── policy/
│   └── privacy-display-policy.ts
├── state/
│   ├── dashboard-state.ts
│   └── reconcile-dashboard-state.ts
├── utils/
│   └── run-view-utils.ts
└── test/
    ├── dashboard-controller.test.tsx
    ├── privacy-display-policy.test.ts
    ├── reconcile-dashboard-state.test.ts
    ├── run-id-routing.test.tsx
    └── run-view-utils.test.ts
```

**Structure Decision**: Keep feature code inside the existing dashboard package. Use explicit view-model and action types at shell/controller/run-explorer boundaries. Keep pure state and view utilities free of React and API client concerns.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not make `App.tsx` the owner of data loading, route transitions, filters, detail selection, refresh reconciliation, or privacy decisions.
- Do not replace one large hook with another large hook.
- Do not let `RunExplorer` know about app-wide status, offline/version states, API base URL setup, or browser route parsing.
- Do not use `canonical_run_id` in URLs, API paths, selected-run state, or route tests.
- Do not scatter privacy labels or hidden-content fallback text across components.
- Do not compute analyzer metrics, task grouping, attribution caveats, or privacy decisions in frontend utilities.
- Do not move dashboard code into root `src/`.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-app-architecture.md](./contracts/dashboard-app-architecture.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. No remote services or root package coupling are introduced.
- **Privacy modes**: Pass. Central policy and tests are required.
- **Provider-agnostic insight**: Pass. Any audit fixes keep API records as the frontend input.
- **Architecture boundaries**: Pass. Source remains under `dashboard/` with app-owned contracts.
- **Explainability over raw numbers**: Pass. Existing explanatory UI remains intact.
- **Documentation separation**: Pass. Architecture and state contracts are captured separately from user-facing spec text.
- **Code organization**: Pass. Boundaries are explicit and testable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
