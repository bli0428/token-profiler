# Tasks: Dashboard Shell State Architecture

> Superseded by expanded spec 008. Retained as an audit/reference checklist; do not execute as a separate implementation queue unless spec 008 is later split again.

**Input**: Design documents from `/specs/011-dashboard-shell-state-architecture/`

**Prerequisites**: Completion of `/specs/008-dashboard-frontend-app/tasks.md`, plan.md, spec.md, research.md, data-model.md, contracts/dashboard-app-architecture.md, quickstart.md

**Tests**: Included because the specification requires architecture boundary checks, privacy policy validation, pure utility tests, `run_id` routing checks, and refresh reconciliation validation.

**Organization**: Tasks are grouped by dependency phase and user story to enable independent validation.

## Phase 1: Setup (Post-008 Baseline)

**Purpose**: Confirm spec 008 is complete and audit current dashboard behavior before any corrective changes.

- [ ] T001 Verify `/specs/008-dashboard-frontend-app/tasks.md` is complete before changing dashboard source
- [ ] T002 Inspect current dashboard architecture in `dashboard/src/App.tsx`, `dashboard/src/shell/`, `dashboard/src/hooks/`, and `dashboard/src/state/view-state.ts`
- [ ] T003 Run the existing dashboard validation commands from `dashboard/package.json`
- [ ] T004 Add architecture baseline notes to `dashboard/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add pure app-owned types, utility seams, privacy policy, and reconciliation rules before moving UI orchestration.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Define dashboard shell, controller, action, run explorer, filter, sort, and reconciliation types in `dashboard/src/state/dashboard-state.ts`
- [ ] T006 Implement privacy display policy in `dashboard/src/policy/privacy-display-policy.ts`
- [ ] T007 Implement pure run filtering, search, sort, and option utilities in `dashboard/src/utils/run-view-utils.ts`
- [ ] T008 Implement refresh reconciliation rules in `dashboard/src/state/reconcile-dashboard-state.ts`
- [ ] T009 [P] Add privacy display policy tests in `dashboard/src/test/privacy-display-policy.test.ts`
- [ ] T010 [P] Add run view utility tests in `dashboard/src/test/run-view-utils.test.ts`
- [ ] T011 [P] Add refresh reconciliation tests in `dashboard/src/test/reconcile-dashboard-state.test.ts`
- [ ] T012 [P] Add `run_id` routing guard tests in `dashboard/src/test/run-id-routing.test.tsx`

**Checkpoint**: Pure rules and policy modules are tested before any shell/controller corrective work begins.

---

## Phase 3: User Story 1 - Keep The Dashboard Shell Small (Priority: P1)

**Goal**: A maintainer can add dashboard views without turning `App.tsx` into the owner of routing, data loading, filter behavior, privacy display, and rendering decisions.

**Independent Test**: Verify `App.tsx` mounts the shell and contains no run loading, artifact detail loading, filtering, sorting, reconciliation, or privacy display logic.

### Tests for User Story 1

- [ ] T013 [P] [US1] Add shell mount and app responsibility tests in `dashboard/src/test/dashboard-controller.test.tsx`
- [ ] T014 [P] [US1] Add route action tests for selected `run_id`, task, artifact, filters, and sort in `dashboard/src/test/dashboard-controller.test.tsx`

### Implementation for User Story 1

- [ ] T015 [US1] Create `DashboardShell` layout boundary in `dashboard/src/shell/DashboardShell.tsx`
- [ ] T016 [US1] Create `DashboardController` composition boundary in `dashboard/src/controllers/DashboardController.tsx`
- [ ] T017 [US1] Define explicit controller action helpers in `dashboard/src/controllers/dashboard-actions.ts`
- [ ] T018 [US1] Refactor `dashboard/src/App.tsx` to mount `DashboardShell` and remove run exploration orchestration
- [ ] T019 [US1] Update shell-related styles in `dashboard/src/styles/app.css`

**Checkpoint**: `App.tsx` is a small mount point and dashboard-wide orchestration lives behind the shell/controller boundary.

---

## Phase 4: User Story 2 - Protect The Run Explorer Boundary (Priority: P1)

**Goal**: A maintainer can evolve run exploration without mixing run-scoped UI with app-wide routing, API setup, or status handling.

**Independent Test**: Verify the run explorer receives explicit run-scoped props and uses pure utilities for visible artifact rows.

### Tests for User Story 2

- [ ] T020 [P] [US2] Add run explorer boundary tests in `dashboard/src/test/run-explorer.test.tsx`
- [ ] T021 [P] [US2] Add artifact filter and sort integration tests in `dashboard/src/test/run-explorer.test.tsx`
- [ ] T022 [P] [US2] Add artifact detail action tests in `dashboard/src/test/run-explorer.test.tsx`

### Implementation for User Story 2

- [ ] T023 [US2] Define run explorer prop and view-model types in `dashboard/src/explorer/run-explorer-types.ts`
- [ ] T024 [US2] Create `RunExplorer` boundary in `dashboard/src/explorer/RunExplorer.tsx`
- [ ] T025 [US2] Move run overview, task groups, filters, artifact table, caveats, and detail panel wiring from `dashboard/src/App.tsx` into `dashboard/src/explorer/RunExplorer.tsx`
- [ ] T026 [US2] Replace inline artifact filtering and sorting with `dashboard/src/utils/run-view-utils.ts`
- [ ] T027 [US2] Update run explorer styles in `dashboard/src/styles/app.css`

**Checkpoint**: Run exploration is isolated behind an explicit boundary and remains independently testable.

---

## Phase 5: User Story 3 - Make Privacy And Refresh Rules Consistent (Priority: P2)

**Goal**: A user sees consistent privacy labels and stable navigation across refreshes while Codex sessions change.

**Independent Test**: Verify privacy display comes from one policy and refresh reconciliation preserves only valid selections.

### Tests for User Story 3

- [ ] T028 [P] [US3] Add centralized privacy rendering integration tests in `dashboard/src/test/privacy-rendering.test.tsx`
- [ ] T029 [P] [US3] Add refresh state preservation tests in `dashboard/src/test/refresh-state.test.tsx`
- [ ] T030 [P] [US3] Add removed session, task, and artifact reconciliation tests in `dashboard/src/test/refresh-state.test.tsx`

### Implementation for User Story 3

- [ ] T031 [US3] Replace component-specific privacy labels with `dashboard/src/policy/privacy-display-policy.ts`
- [ ] T032 [US3] Split status loading into `dashboard/src/hooks/useDashboardStatus.ts`
- [ ] T033 [US3] Split session loading into `dashboard/src/hooks/useSessions.ts`
- [ ] T034 [US3] Split selected run loading into `dashboard/src/hooks/useRunData.ts`
- [ ] T035 [US3] Split artifact detail loading into `dashboard/src/hooks/useArtifactDetail.ts`
- [ ] T036 [US3] Split refresh lifecycle behavior into `dashboard/src/hooks/useRefreshLifecycle.ts`
- [ ] T037 [US3] Split browser URL state into `dashboard/src/hooks/useUrlRunState.ts`
- [ ] T038 [US3] Wire refresh reconciliation through `dashboard/src/state/reconcile-dashboard-state.ts`
- [ ] T039 [US3] Remove or shrink any obsolete broad data hook logic if implementation drift introduced one

**Checkpoint**: Privacy display and refresh reconciliation are centralized and hook responsibilities are narrow.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate architecture, isolation, and documentation.

- [ ] T040 [P] Document final shell/controller/run explorer responsibilities in `dashboard/README.md`
- [ ] T041 [P] Update architecture notes in `dashboard/README.md` with the `run_id` routing rule
- [ ] T042 Run dashboard typecheck from `dashboard/package.json`
- [ ] T043 Run dashboard tests from `dashboard/package.json`
- [ ] T044 Run dashboard build from `dashboard/package.json`
- [ ] T045 Verify implementation changes are limited to `dashboard/`
- [ ] T046 Verify `dashboard/src/App.tsx` contains no run filtering, artifact detail fetching, refresh reconciliation, or privacy policy logic
- [ ] T047 Verify dashboard source still imports no root `src/` modules

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Depends on spec 008 completion.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and integrates after shell/controller shape is established.
- **User Story 3 (Phase 5)**: Depends on US1 and US2 boundaries.
- **Polish (Phase 6)**: Depends on selected stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational.
- **User Story 2 (P1)**: Can start after Foundational but should integrate with the shell/controller boundary from US1.
- **User Story 3 (P2)**: Depends on controller and run explorer boundaries from US1 and US2.

### Parallel Opportunities

- T009-T012 can run in parallel after T005-T008 are drafted.
- T013-T014 can run in parallel.
- T020-T022 can run in parallel.
- T028-T030 can run in parallel.
- T032-T037 can run in parallel after controller interfaces are stable.
- T040-T041 can run in parallel with final validation.

## Parallel Example: Foundational Tests

```text
Task: "Add privacy display policy tests in dashboard/src/test/privacy-display-policy.test.ts"
Task: "Add run view utility tests in dashboard/src/test/run-view-utils.test.ts"
Task: "Add refresh reconciliation tests in dashboard/src/test/reconcile-dashboard-state.test.ts"
Task: "Add run_id routing guard tests in dashboard/src/test/run-id-routing.test.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Confirm spec 008 is complete.
2. Add pure foundational modules and tests.
3. Add shell/controller boundaries.
4. Reduce `App.tsx` to a minimal mount point.
5. Validate existing dashboard behavior still works.

### Incremental Delivery

1. Add shell/controller boundaries to stop `App.tsx` growth.
2. Add run explorer boundary to isolate run-scoped UI.
3. Centralize privacy and refresh reconciliation.
4. Split broad hooks by responsibility.
5. Finish with dashboard-local validation and isolation checks.

### Isolation Strategy

1. Keep all implementation files under `dashboard/`.
2. Use app-owned types and view models at boundaries.
3. Use `run_id` for all routing and selection state.
4. Keep pure utilities free of React and API client concerns.
5. Preserve the spec 008 import-boundary test.
