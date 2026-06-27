# Tasks: Current Dashboard Surface Cleanup

**Input**: Design documents from `/specs/009-dashboard-surface-cleanup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-surface-cleanup.md, quickstart.md, completed specs 007 and 008

**Tests**: Included because cleanup must prove static renderer paths are gone while API/model privacy and non-dashboard workflows remain intact.

**Organization**: Tasks are grouped by user story so each cleanup slice is independently testable.

## Phase 1: Setup

**Purpose**: Inventory the static dashboard surface and confirm replacement dashboard path exists.

- [X] T001 Verify spec 008 dashboard package exists with dashboard/src, dashboard/package.json, and dashboard/README.md
- [X] T002 Inventory live static dashboard imports in src/, test/, and README.md
- [X] T003 Confirm dashboard API imports dashboard-safe model/session code from API-owned modules

---

## Phase 2: Foundational Guardrails

**Purpose**: Add cleanup tests before removing old static renderer paths.

- [X] T004 Add CLI/help cleanup assertions in test/cli-dashboard-cleanup.test.js
- [X] T005 Update test/architecture-boundaries.test.js to treat embedded static dashboard renderer modules as retired
- [X] T006 Update dashboard privacy coverage so retained API/model behavior is tested without renderDashboardHtml in test/dashboard-privacy.test.js

---

## Phase 3: User Story 1 - Retire Static String-Based Dashboard Rendering (Priority: P1)

**Goal**: Remove embedded browser HTML/CSS/JS dashboard rendering from supported root workflows.

**Independent Test**: Static renderer files and commands are gone; root tests fail if static renderer markers reappear.

### Tests for User Story 1

- [X] T007 [P] [US1] Remove static renderer-only tests in test/dashboard-render.test.js

### Implementation for User Story 1

- [X] T008 [US1] Remove static dashboard renderer modules src/surfaces/dashboard/assets.ts and src/surfaces/dashboard/render.ts
- [X] T009 [US1] Remove static HTML report surface src/surfaces/html-report.ts
- [X] T010 [US1] Remove createHtmlReport export from src/index.js

---

## Phase 4: User Story 2 - Preserve Useful Shared View-Model Behavior (Priority: P1)

**Goal**: Keep API-safe model/session behavior while deleting only obsolete rendering code.

**Independent Test**: Dashboard API/model/session tests continue to pass and metadata-only data still does not leak hidden raw content.

### Tests for User Story 2

- [X] T011 [P] [US2] Keep dashboard model and session tests focused on src/surfaces/dashboard-api/view-model.ts, privacy.ts, sessions.ts, and view-model-types.ts
- [X] T012 [P] [US2] Keep dashboard API privacy tests proving hidden raw content is excluded from API responses

### Implementation for User Story 2

- [X] T013 [US2] Remove static html/dashboard imports and command handlers from src/surfaces/cli/report-commands.ts
- [X] T014 [US2] Remove old html/dashboard command dispatch from src/surfaces/cli/index.ts

---

## Phase 5: User Story 3 - Keep Removal Safe And Reversible (Priority: P2)

**Goal**: Command help and docs point users at the supported API/app dashboard workflow.

**Independent Test**: CLI help and README no longer advertise old static dashboard files and do explain the new local dashboard workflow.

### Tests for User Story 3

- [X] T015 [P] [US3] Add assertions that CLI help lists dashboard-api serve and omits static html/dashboard commands in test/cli-dashboard-cleanup.test.js

### Implementation for User Story 3

- [X] T016 [US3] Update CLI help text in src/surfaces/cli/utils.ts for the supported dashboard API workflow
- [X] T017 [US3] Update README.md to remove static dashboard generation guidance and document API/app dashboard workflow

---

## Phase 6: Polish & Validation

**Purpose**: Validate cleanup and mark tasks complete.

- [X] T018 Run stale static dashboard reference scan across src/, test/, and README.md
- [X] T019 Run npm test
- [X] T020 Run npm run typecheck
- [X] T021 Run dashboard package validation commands if needed to confirm replacement app remains intact
- [X] T022 Mark all completed 009 tasks in specs/009-dashboard-surface-cleanup/tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational Guardrails (Phase 2)**: Depends on Setup.
- **US1 (Phase 3)**: Depends on cleanup tests.
- **US2 (Phase 4)**: Depends on renderer removal and retained model/API tests.
- **US3 (Phase 5)**: Can proceed after command removal decisions are implemented.
- **Polish (Phase 6)**: Depends on all selected stories.

### Parallel Opportunities

- T001-T003 can be inspected in parallel.
- T004-T006 can be edited in parallel if they touch separate test files.
- T011-T012 are validation-preservation tasks and can run in parallel.
- T015 can be done while README/help text is updated after command decisions are clear.

## Implementation Strategy

1. Add tests/guardrails for cleanup expectations.
2. Remove static renderer files and exports.
3. Remove old static CLI dispatch and update help/docs.
4. Run root validation and stale-reference scans.
5. Keep dashboard-safe model/API behavior untouched unless tests show a necessary narrow fix.
