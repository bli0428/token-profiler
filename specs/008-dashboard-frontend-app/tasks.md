# Tasks: Isolated Dashboard Frontend App

**Input**: Design documents from `/specs/008-dashboard-frontend-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-app-contract.md, quickstart.md

**Tests**: Included because this feature must establish clean architecture from the first implementation: API-real contract fixtures, edge fixtures, import/package/style boundaries, privacy no-leak checks, pure utilities, state reconciliation, refresh behavior, and responsive large-run behavior.

**Organization**: Tasks are grouped by user story where user value is delivered, with architecture guardrails front-loaded as setup/foundational work.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the isolated dashboard package, owned scripts, and file layout without touching root `src/`.

- [X] T001 Create top-level dashboard app directory structure in dashboard/
- [X] T002 Initialize dashboard/package.json with dev, build, preview, typecheck, test, test:contracts, test:boundaries, test:styles, and fixtures:capture scripts
- [X] T003 Add dashboard/package-lock.json through dashboard-owned dependency installation
- [X] T004 Add dashboard TypeScript, Vite, Vitest, and React Testing Library configuration in dashboard/tsconfig.json, dashboard/vite.config.ts, and dashboard/vitest.config.ts
- [X] T005 [P] Create dashboard/index.html and dashboard/src/main.tsx app entrypoint
- [X] T006 [P] Create dashboard/src/App.tsx as a mount point for DashboardShell only
- [X] T007 [P] Create dashboard/README.md with dashboard-owned commands, VITE_DASHBOARD_API_BASE_URL, API origin setup, and isolation rules

---

## Phase 2: Foundational Guardrails (Blocking Prerequisites)

**Purpose**: Establish package boundaries, duplicated contract types, API-real fixtures, small architecture seams, privacy policy, pure utilities, and style modules before feature UI work begins.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T008 Define dashboard API response, error, caveat, session, run, task, artifact row, artifact detail, routable run_id, and optional canonical_run_id types in dashboard/src/api/types.ts
- [X] T009 Implement normalized API and network error types in dashboard/src/api/errors.ts
- [X] T010 Implement version-checked HTTP client methods using VITE_DASHBOARD_API_BASE_URL in dashboard/src/api/client.ts
- [X] T011 [P] Add HTTP-only API fixture capture script and API-real baseline fixture JSON in dashboard/scripts/capture-api-fixtures.ts, dashboard/test/fixtures/api-real/status.json, dashboard/test/fixtures/api-real/sessions.json, dashboard/test/fixtures/api-real/run.json, and dashboard/test/fixtures/api-real/artifact-detail.json
- [X] T012 [P] Add edge fixtures for empty, partial, metadata-only, hidden-content, not-found, offline, unreadable, and version-mismatch cases in dashboard/test/fixtures/edge-fixtures.ts
- [X] T013 [P] Add 1,000-artifact run fixture generator in dashboard/test/fixtures/large-run-fixture.ts
- [X] T014 [P] Implement test-only contract fixture loading and validation helpers in dashboard/test/helpers/contract-fixtures.ts
- [X] T015 [P] Implement import-boundary test that fails on dashboard/src imports from root src/ or dashboard/test/ in dashboard/src/test/import-boundary.test.ts
- [X] T016 [P] Implement package-boundary test that fails if root source or root tsconfig includes dashboard/src in dashboard/src/test/package-boundary.test.ts
- [X] T017 [P] Implement API-real contract fixture tests in dashboard/src/test/contract-fixtures.test.ts
- [X] T018 [P] Implement API client tests for success, structured errors, offline failures, and unsupported schema versions in dashboard/src/test/api-client.test.ts
- [X] T019 Create dashboard shell and controller files in dashboard/src/shell/DashboardShell.tsx and dashboard/src/shell/DashboardController.tsx
- [X] T020 Create run explorer boundary files in dashboard/src/run-explorer/RunExplorer.tsx, dashboard/src/run-explorer/RunOverview.tsx, dashboard/src/run-explorer/TaskGroups.tsx, dashboard/src/run-explorer/FiltersBar.tsx, dashboard/src/run-explorer/ArtifactTable.tsx, and dashboard/src/run-explorer/ArtifactDetailPanel.tsx
- [X] T021 Create session list and shared state components in dashboard/src/sessions/SessionList.tsx, dashboard/src/components/CaveatList.tsx, dashboard/src/components/EmptyState.tsx, and dashboard/src/components/ErrorState.tsx
- [X] T022 Create small data hooks in dashboard/src/hooks/useApiStatus.ts, dashboard/src/hooks/useSessions.ts, dashboard/src/hooks/useSelectedRun.ts, dashboard/src/hooks/useArtifactDetail.ts, dashboard/src/hooks/useRefresh.ts, and dashboard/src/hooks/useUrlState.ts
- [X] T023 Implement view state and refresh reconciliation primitives in dashboard/src/state/view-state.ts and dashboard/src/state/reconcile.ts
- [X] T024 Implement pure run filter, search, and sort utilities in dashboard/src/utils/run-filters.ts
- [X] T025 Implement centralized privacy display policy in dashboard/src/policy/privacy-display.ts
- [X] T026 [P] Add unit tests for run filter/search/sort utilities in dashboard/src/test/run-filters.test.ts
- [X] T027 [P] Add unit tests for privacy display policy in dashboard/src/test/privacy-display.test.ts
- [X] T028 [P] Add shell/controller boundary tests in dashboard/src/test/shell-controller.test.tsx
- [X] T029 Create dashboard style modules in dashboard/src/styles/app.css, dashboard/src/styles/tokens.css, dashboard/src/styles/layout.css, dashboard/src/styles/states.css, dashboard/src/styles/sessions.css, dashboard/src/styles/run-explorer.css, dashboard/src/styles/tables.css, and dashboard/src/styles/detail.css
- [X] T030 [P] Add style-boundary tests for root style imports and catch-all stylesheet growth in dashboard/src/test/style-boundary.test.ts

**Checkpoint**: Foundation ready. The dashboard has package-owned validation, API-real contract guards, app architecture seams, pure utilities, privacy policy, and style modules before feature behavior is implemented.

---

## Phase 3: User Story 1 - Run The Dashboard As A Separate App (Priority: P1) MVP

**Goal**: A user can run the isolated app, verify API readiness/version compatibility, and see recent sessions or clear offline/version states through the shell/controller architecture.

**Independent Test**: Start the dashboard app against API-real and edge fixtures and verify status gating, session rendering, offline handling, version mismatch handling, package boundaries, and import isolation.

### Tests for User Story 1

- [X] T031 [P] [US1] Add app readiness and session-list tests in dashboard/src/test/app-offline.test.tsx
- [X] T032 [P] [US1] Add unsupported schema-version UI test in dashboard/src/test/app-offline.test.tsx
- [X] T033 [P] [US1] Add session empty-state test in dashboard/src/test/app-offline.test.tsx
- [X] T034 [P] [US1] Add session selection test proving getRun uses session.run_id instead of canonical_run_id in dashboard/src/test/app-offline.test.tsx

### Implementation for User Story 1

- [X] T035 [US1] Implement status loading behavior in dashboard/src/hooks/useApiStatus.ts
- [X] T036 [US1] Implement sessions loading behavior in dashboard/src/hooks/useSessions.ts
- [X] T037 [US1] Implement URL state persistence by routable run_id in dashboard/src/hooks/useUrlState.ts and dashboard/src/state/view-state.ts
- [X] T038 [US1] Implement DashboardController status, session, retry, offline, and version-mismatch wiring in dashboard/src/shell/DashboardController.tsx
- [X] T039 [US1] Implement DashboardShell app layout, top-level states, and controller output rendering in dashboard/src/shell/DashboardShell.tsx
- [X] T040 [US1] Implement session list rendering in dashboard/src/sessions/SessionList.tsx
- [X] T041 [US1] Wire App mount point to DashboardShell in dashboard/src/App.tsx
- [X] T042 [US1] Style shell, sessions, empty, offline, retry, and version states using dashboard/src/styles/layout.css, dashboard/src/styles/sessions.css, and dashboard/src/styles/states.css

**Checkpoint**: User Story 1 is independently usable as the MVP without creating a top-level integration sink.

---

## Phase 4: User Story 2 - Explore A Session In The App (Priority: P1)

**Goal**: A user can select a session, inspect run overview/task/artifact data, filter and sort artifacts, and open artifact details through the run explorer boundary.

**Independent Test**: Use API-real and edge fixture responses and verify run selection, task filtering, category filtering, text search, sorting, empty filter state, privacy/caveat display, and artifact detail drilldown.

### Tests for User Story 2

- [X] T043 [P] [US2] Add run explorer rendering and session selection tests in dashboard/src/test/run-explorer.test.tsx
- [X] T044 [P] [US2] Add task, category, search, and sort tests in dashboard/src/test/run-explorer.test.tsx
- [X] T045 [P] [US2] Add artifact detail drilldown tests in dashboard/src/test/run-explorer.test.tsx
- [X] T046 [P] [US2] Add metadata-only privacy no-leak rendering tests in dashboard/src/test/privacy-rendering.test.tsx
- [X] T047 [P] [US2] Add large fixture filtering/sorting responsiveness test in dashboard/src/test/run-explorer.test.tsx

### Implementation for User Story 2

- [X] T048 [US2] Implement selected run loading in dashboard/src/hooks/useSelectedRun.ts
- [X] T049 [US2] Implement artifact detail loading in dashboard/src/hooks/useArtifactDetail.ts
- [X] T050 [US2] Integrate selected run and artifact actions into DashboardController in dashboard/src/shell/DashboardController.tsx
- [X] T051 [P] [US2] Implement run overview component in dashboard/src/run-explorer/RunOverview.tsx
- [X] T052 [P] [US2] Implement task group navigation component in dashboard/src/run-explorer/TaskGroups.tsx
- [X] T053 [P] [US2] Implement filters and sort controls in dashboard/src/run-explorer/FiltersBar.tsx
- [X] T054 [P] [US2] Implement artifact table component in dashboard/src/run-explorer/ArtifactTable.tsx
- [X] T055 [P] [US2] Implement artifact detail panel in dashboard/src/run-explorer/ArtifactDetailPanel.tsx
- [X] T056 [US2] Implement run explorer composition with explicit props and callbacks in dashboard/src/run-explorer/RunExplorer.tsx
- [X] T057 [US2] Apply centralized privacy display policy to run explorer and artifact detail components in dashboard/src/policy/privacy-display.ts and dashboard/src/run-explorer/ArtifactDetailPanel.tsx
- [X] T058 [US2] Style run overview, filters, task groups, artifact table, privacy states, caveats, and detail panel in dashboard/src/styles/run-explorer.css, dashboard/src/styles/tables.css, dashboard/src/styles/detail.css, and dashboard/src/styles/states.css

**Checkpoint**: User Story 2 is independently testable and delivers the core dashboard exploration workflow without recomputing analyzer facts.

---

## Phase 5: User Story 3 - Stay Current While Codex Runs (Priority: P2)

**Goal**: A user can keep the app open and refresh session/run data while preserving valid navigation state.

**Independent Test**: Simulate updated API fixture data and verify manual/interval refresh, stale or not-found states, partial-data caveats, and state preservation through pure reconciliation.

### Tests for User Story 3

- [X] T059 [P] [US3] Add manual refresh and interval refresh tests in dashboard/src/test/refresh-state.test.tsx
- [X] T060 [P] [US3] Add selected session, task, artifact, filter, and sort preservation tests in dashboard/src/test/refresh-state.test.tsx
- [X] T061 [P] [US3] Add stale, partial, and not-found refresh tests in dashboard/src/test/refresh-state.test.tsx

### Implementation for User Story 3

- [X] T062 [US3] Implement manual refresh and optional interval refresh behavior in dashboard/src/hooks/useRefresh.ts
- [X] T063 [US3] Implement refresh-state reconciliation for missing sessions, tasks, and artifacts in dashboard/src/state/reconcile.ts
- [X] T064 [US3] Integrate refresh lifecycle and reconciliation into dashboard/src/shell/DashboardController.tsx
- [X] T065 [US3] Surface stale, partial, not-found, and last-updated states in dashboard/src/shell/DashboardShell.tsx and dashboard/src/run-explorer/RunOverview.tsx
- [X] T066 [US3] Style refresh state, stale banners, partial-data caveats, and last-updated display in dashboard/src/styles/states.css and dashboard/src/styles/run-explorer.css

**Checkpoint**: User Story 3 keeps the app useful during active local work while preserving valid state only.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and integration hygiene across the self-contained app.

- [X] T067 [P] Document API origin configuration, API-real fixtures, edge fixtures, package-owned commands, style modules, and isolation rules in dashboard/README.md
- [X] T068 [P] Update specs/008-dashboard-frontend-app/quickstart.md if implementation commands differ from the plan
- [X] T069 Run dashboard typecheck, tests, contract tests, boundary tests, style tests, and build commands defined in dashboard/package.json
- [X] T070 Run repository typecheck and test commands defined in package.json without compiling dashboard/src
- [X] T071 Verify dashboard/ can be removed without modifying src/, src/core/, src/analysis/, src/adapters/, src/surfaces/cli/, or src/surfaces/dashboard/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational Guardrails (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational Guardrails and is the MVP.
- **User Story 2 (Phase 4)**: Depends on US1 shell/controller and foundational utilities.
- **User Story 3 (Phase 5)**: Depends on US1 and US2 state/data paths.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational Guardrails; no dependency on US2 or US3.
- **User Story 2 (P1)**: Depends on US1 shell/controller conventions and foundational pure utilities.
- **User Story 3 (P2)**: Depends on selected run, detail, filter, and controller state created for US1 and US2.

### Parallel Opportunities

- T005-T007 can run in parallel after T001-T004.
- T011-T018 can run in parallel after API types are drafted.
- T026-T030 can run in parallel after utility/policy/style skeletons exist.
- US1 tests T031-T034 can run in parallel.
- US2 tests T043-T047 can run in parallel.
- US2 component tasks T051-T055 can run in parallel after selected run types and callbacks are defined.
- US3 tests T059-T061 can run in parallel.
- Documentation tasks T067-T068 can run in parallel with final validation.

## Parallel Example: Foundational Guardrails

```text
Task: "Add HTTP-only API fixture capture script and API-real baseline fixture JSON for status, sessions, run, and artifact detail in dashboard/scripts/capture-api-fixtures.ts and dashboard/test/fixtures/api-real/"
Task: "Implement import-boundary test that fails on dashboard/src imports from root src/ or dashboard/test/ in dashboard/src/test/import-boundary.test.ts"
Task: "Implement package-boundary test that fails if root source or root tsconfig includes dashboard/src in dashboard/src/test/package-boundary.test.ts"
Task: "Implement pure run filter, search, and sort utilities in dashboard/src/utils/run-filters.ts"
Task: "Implement centralized privacy display policy in dashboard/src/policy/privacy-display.ts"
Task: "Create dashboard style modules in dashboard/src/styles/"
```

## Implementation Strategy

### Architecture-First MVP

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational guardrails.
3. Complete Phase 3 status, sessions, offline/version handling, and app shell.
4. Stop and validate package boundaries, contract fixtures, style boundaries, and import isolation before expanding the run explorer.

### Incremental Delivery

1. Establish package/contract/shell/state/style foundations.
2. Add US1 to prove the isolated app boundary and API connectivity.
3. Add US2 to deliver the core run exploration workflow.
4. Add US3 to support ongoing local work and refresh behavior.
5. Finish with full validation across dashboard and root checks.

### Isolation Strategy

1. Keep all app source, tests, fixtures, package metadata, and style modules under `dashboard/`.
2. Duplicate public contract types in the app package, guarded by API-real fixtures.
3. Use hand-authored fixtures only for edge states, not as the sole product truth.
4. Enforce no root-`src/` imports, no production imports from `dashboard/test/`, and no root `tsconfig` inclusion with automated tests.
5. Treat root changes as optional orchestration/documentation only, never as app implementation dependencies.
