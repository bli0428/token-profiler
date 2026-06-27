# Research: Isolated Dashboard Frontend App

## Decision: Use a top-level self-contained frontend package

**Rationale**: The user explicitly wants the dashboard in a top-level folder with its own package metadata and no `src/` coupling. A separate package makes dependency boundaries visible, keeps frontend tooling away from the root CLI/analyzer package, and lets the app be removed without touching capture, store, analyzer, adapter, or CLI code.

**Alternatives considered**:

- Place the app under `src/surfaces/dashboard/`: rejected because it couples the app to existing static dashboard internals and violates the self-contained requirement.
- Add frontend scripts to the root package: rejected because it blurs package ownership and installs frontend dependencies into the main tool.

## Decision: Use Vite with React for the first dashboard app

**Rationale**: Vite provides a small local dev server, browser build pipeline, and straightforward TypeScript integration. React is appropriate for an interactive stateful explorer with session selection, filtering, sorting, detail panels, refresh state, and component-level tests.

**Alternatives considered**:

- Plain HTML with hand-written DOM updates: fewer dependencies, but the run explorer has enough state and reusable views that this would become harder to test and maintain.
- Next.js or a server-rendered app: unnecessary for a local-only browser client with no remote deployment requirement.

## Decision: Duplicate public client contract types in the dashboard package

**Rationale**: The frontend must behave like an external HTTP client. Duplicating small public response types in `dashboard/src/api/types.ts` enforces the boundary and keeps imports honest. Contract drift is handled through fixture tests and schema-version handling rather than direct type imports.

**Alternatives considered**:

- Import API types from `src/surfaces/dashboard-api`: convenient, but directly violates the app isolation requirement.
- Generate types from a shared schema package now: cleaner long-term, but it creates a shared package before the HTTP contract has stabilized.

## Decision: Guard duplicated contract types with API-real baseline fixtures from day one

**Rationale**: Duplicated client types preserve isolation only if they are checked against real API responses. API-real fixtures for status, sessions, run view, and artifact detail prevent the dashboard from drifting into a fake client-only product shape.

**Alternatives considered**:

- Hand-authored fixtures only: useful for edge states, but too easy to make prettier than real API responses.
- Live API-only tests: realistic, but brittle and slow for normal frontend development.
- Shared TypeScript imports from the API: rejected because it weakens the HTTP boundary.

## Decision: Use fixture-backed tests for API states

**Rationale**: The app should be testable without live profiler data or an API process. Fixtures can cover normal, empty, large, metadata-only, partial, not-found, offline, and unsupported-version scenarios deterministically.

**Alternatives considered**:

- Test only against a live API: realistic but brittle and dependent on local run data.
- Snapshot only static screens: insufficient for refresh, filtering, privacy, and error behavior.

## Decision: Build shell/controller/state boundaries before feature views expand

**Rationale**: A top-level app component or all-purpose data hook would become the default pattern for future work. Creating `DashboardShell`, a controller layer, small hooks, pure utilities, and a run explorer boundary first makes separation of concerns the model's starting point.

**Alternatives considered**:

- Start with `App.tsx` and refactor later: faster at first, but it teaches the wrong structure and makes later cleanup harder.
- Introduce a full routing framework immediately: unnecessary for the current local app surface.

## Decision: Centralize privacy display policy immediately

**Rationale**: Hidden, metadata-only, unavailable, preview, and raw-available states are product behavior, not component-level copy choices. A policy module keeps privacy display consistent and testable.

**Alternatives considered**:

- Let each component render privacy labels independently: faster locally, but likely to drift and leak inconsistent behavior.

## Decision: Split dashboard styles by responsibility from the initial app

**Rationale**: The dashboard is an operational UI with dense tables, task groups, panels, privacy states, caveats, and error states. Starting with style modules and tokens avoids making `app.css` the place every future visual rule accumulates.

**Alternatives considered**:

- One global stylesheet for MVP: simplest, but the first implementation would normalize catch-all styling.
- CSS-in-JS: unnecessary dependency for the first isolated app.

## Decision: Dashboard owns validation, root only orchestrates

**Rationale**: The dashboard is an isolated package. Its build, typecheck, tests, import boundaries, style boundaries, and contract fixtures should be owned by `dashboard/package.json`. Root commands may call those scripts, but root source and root TypeScript configuration must not include dashboard app source.

**Alternatives considered**:

- Root-owned dashboard validation: convenient for a single command, but creates package-boundary ambiguity.

## Decision: Polling and manual refresh for first live-update behavior

**Rationale**: Spec 007 exposes request-time freshness. Polling and manual refresh give users up-to-date local data without introducing streaming protocol complexity.

**Alternatives considered**:

- WebSocket or server-sent events: useful later, but not required by the current API contract.
- Static rebuild workflow: rejected because the user needs a live app that stays open while sessions change.

## Decision: Enforce the import boundary with tests

**Rationale**: The main risk in an isolated app is accidental convenience imports from `src/`. A test that scans dashboard source imports gives immediate feedback and protects the architectural contract.

**Alternatives considered**:

- Rely on code review only: easy to miss over time.
- Configure path aliases to block imports: helpful but incomplete because relative imports can still cross directory boundaries.
