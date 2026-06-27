# Tasks: Dashboard Package Boundaries

> Superseded by expanded spec 008. Retained as an audit/reference checklist; do not execute as a separate implementation queue unless spec 008 is later split again.

**Input**: Design documents from `/specs/013-dashboard-package-boundaries/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-package-boundary.md, quickstart.md, and completed spec 008 implementation

**Tests**: Included because the specification requires package-boundary validation, root source independence checks, dashboard-owned import validation, and Vite environment-name verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing after spec 008 is complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm spec 008 is complete and inventory the implemented dashboard package before changing boundary validation.

- [ ] T001 Confirm spec 008 implementation is complete by reviewing dashboard/package.json, dashboard/tsconfig.json, dashboard/vite.config.ts, and dashboard/src
- [ ] T002 Inspect root package scripts in package.json for existing dashboard orchestration
- [ ] T003 Inspect root TypeScript configuration in tsconfig.json for includes, excludes, references, and path aliases related to dashboard/src
- [ ] T004 Inspect dashboard validation documentation in dashboard/README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish package ownership and validation helpers needed by every story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Ensure dashboard/package.json defines dashboard-owned build, typecheck, test, preview, and import-boundary scripts
- [ ] T006 Ensure dashboard/package.json owns dashboard frontend dependencies and dev dependencies
- [ ] T007 Add or update dashboard import-boundary validation command in dashboard/package.json
- [ ] T008 [P] Add dashboard import-boundary validation implementation in dashboard/src/test/import-boundary.test.ts
- [ ] T009 [P] Add root source independence validation for forbidden dashboard/src imports in test/architecture-boundaries.test.js
- [ ] T010 Document root-only validation versus all-package validation in dashboard/README.md

**Checkpoint**: Dashboard package ownership is explicit and validation paths exist for both directions of the boundary.

---

## Phase 3: User Story 1 - Validate Dashboard Package Ownership (Priority: P1) MVP

**Goal**: Dashboard contributors can rely on dashboard/package.json as the authoritative source for dashboard build, typecheck, tests, dependencies, and import-boundary validation.

**Independent Test**: Run dashboard-owned validation commands from dashboard/package.json without invoking root-owned dashboard logic.

### Tests for User Story 1

- [ ] T011 [P] [US1] Add validation that dashboard/package.json contains the required dashboard-owned scripts in dashboard/src/test/package-boundary.test.ts
- [ ] T012 [P] [US1] Add validation that dashboard frontend dependencies are declared in dashboard/package.json instead of package.json in dashboard/src/test/package-boundary.test.ts

### Implementation for User Story 1

- [ ] T013 [US1] Update dashboard/package.json scripts so build, typecheck, test, preview, and import-boundary commands are dashboard-owned
- [ ] T014 [US1] Move any dashboard-only frontend dependency declarations from package.json to dashboard/package.json if spec 008 left ambiguity
- [ ] T015 [US1] Update dashboard/README.md with dashboard-owned validation commands

**Checkpoint**: Dashboard package ownership can be validated without reading root source.

---

## Phase 4: User Story 2 - Keep Root Source Independent (Priority: P1)

**Goal**: Root source checks do not compile or import dashboard app source, while optional root orchestration delegates to dashboard-owned scripts.

**Independent Test**: Run root source typecheck and boundary validation, then verify no root source dependency on dashboard/src exists.

### Tests for User Story 2

- [ ] T016 [P] [US2] Add validation that tsconfig.json does not include or reference dashboard/src in test/architecture-boundaries.test.js
- [ ] T017 [P] [US2] Add validation that root source files do not import dashboard/src in test/architecture-boundaries.test.js
- [ ] T018 [P] [US2] Add validation that optional root dashboard scripts delegate to dashboard/package.json scripts in test/architecture-boundaries.test.js

### Implementation for User Story 2

- [ ] T019 [US2] Update tsconfig.json only if needed so root typecheck excludes dashboard/src
- [ ] T020 [US2] Update package.json only if needed so optional root orchestration invokes dashboard-owned scripts
- [ ] T021 [US2] Remove any root source dependency on dashboard app code if discovered in src
- [ ] T022 [US2] Document root orchestration expectations in dashboard/README.md

**Checkpoint**: Root source remains independent from the dashboard app.

---

## Phase 5: User Story 3 - Configure Browser API Origin Clearly (Priority: P2)

**Goal**: Dashboard browser API origin configuration consistently uses `VITE_DASHBOARD_API_BASE_URL`.

**Independent Test**: Set `VITE_DASHBOARD_API_BASE_URL`, run dashboard validation, and verify the dashboard API client uses that origin.

### Tests for User Story 3

- [ ] T023 [P] [US3] Add dashboard API client test for VITE_DASHBOARD_API_BASE_URL in dashboard/src/test/api-client.test.ts
- [ ] T024 [P] [US3] Add documentation validation that unsupported API base URL env names are not documented as browser config in dashboard/src/test/package-boundary.test.ts

### Implementation for User Story 3

- [ ] T025 [US3] Update dashboard browser API client configuration to read VITE_DASHBOARD_API_BASE_URL
- [ ] T026 [US3] Update dashboard/vite.config.ts only if needed to preserve Vite-compatible environment behavior
- [ ] T027 [US3] Update dashboard/README.md to document VITE_DASHBOARD_API_BASE_URL as the browser API base URL override

**Checkpoint**: Dashboard browser API origin naming is unambiguous.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation review across dashboard and root package boundaries.

- [ ] T028 Run dashboard typecheck, tests, import-boundary validation, and build from dashboard/package.json
- [ ] T029 Run root source typecheck without compiling dashboard/src
- [ ] T030 Run optional root all-package orchestration if it exists
- [ ] T031 Verify dashboard/ can be removed without root source import or typecheck failures
- [ ] T032 Review package.json and dashboard/package.json to confirm dependency ownership is clear
- [ ] T033 Review dashboard/README.md to confirm command ownership, root orchestration, and VITE_DASHBOARD_API_BASE_URL are documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Depends on completed spec 008.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and can proceed after ownership scripts are known.
- **User Story 3 (Phase 5)**: Depends on Foundational and can proceed in parallel with US2.
- **Polish (Phase 6)**: Depends on selected stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; no dependency on US2 or US3.
- **User Story 2 (P1)**: Can start after Foundational; benefits from US1 script naming but does not require browser env work.
- **User Story 3 (P2)**: Can start after Foundational; independent of root source validation.

### Parallel Opportunities

- T002-T004 can run in parallel after T001.
- T008-T010 can run in parallel after T005-T007.
- US1 tests T011-T012 can run in parallel.
- US2 tests T016-T018 can run in parallel.
- US3 tests T023-T024 can run in parallel.
- Final reviews T032-T033 can run in parallel after validation commands complete.

## Parallel Example: User Story 2

```text
Task: "Add validation that tsconfig.json does not include or reference dashboard/src"
Task: "Add validation that root source files do not import dashboard/src"
Task: "Add validation that optional root dashboard scripts delegate to dashboard/package.json scripts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Confirm spec 008 is complete.
2. Complete Setup and Foundational phases.
3. Complete US1 script and dependency ownership validation.
4. Stop and validate dashboard package ownership before changing root orchestration.

### Incremental Delivery

1. Lock dashboard-owned scripts and dependency ownership.
2. Add root independence validation.
3. Standardize browser env naming.
4. Finish with full root and dashboard validation.

### Boundary Strategy

1. Keep dashboard app concerns inside `dashboard/`.
2. Let root scripts orchestrate only by invoking dashboard scripts.
3. Validate imports in both directions.
4. Keep root TypeScript configuration independent from `dashboard/src`.
5. Use `VITE_DASHBOARD_API_BASE_URL` as the only browser API origin override.
