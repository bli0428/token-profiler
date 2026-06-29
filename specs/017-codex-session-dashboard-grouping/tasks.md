# Tasks: Codex Session Dashboard Grouping

**Input**: Design documents from `/specs/017-codex-session-dashboard-grouping/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/session-dashboard-grouping.md, quickstart.md

**Tests**: Included because each user story has explicit independent test criteria.

**Organization**: Tasks are grouped by user story so each story can be validated independently.

## Phase 1: Setup

**Purpose**: Confirm active feature docs and dashboard-only boundary.

- [X] T001 Verify 017 is the active Spec Kit feature in `.specify/feature.json`
- [X] T002 Verify `AGENTS.md` points to `specs/017-codex-session-dashboard-grouping/plan.md`

---

## Phase 2: Foundational

**Purpose**: Establish explicit dashboard grouping label semantics before story work.

- [X] T003 [P] Document dashboard interpretation of session identity in `specs/017-codex-session-dashboard-grouping/contracts/session-dashboard-grouping.md`
- [X] T004 [P] Verify dashboard session identity types include mapping confidence/source in `dashboard/src/api/types.ts`

---

## Phase 3: User Story 1 - See One Row Per New Codex Session (Priority: P1)

**Goal**: The session list visibly presents Codex-session grouped rows as Codex-session grouped.

**Independent Test**: Render direct Codex-session rows and verify they display as distinct rows with Codex-session grouping labels.

### Tests for User Story 1

- [X] T005 [P] [US1] Add dashboard session-list tests for direct Codex-session grouping labels and separate direct rows in `dashboard/src/test/session-list.test.tsx`

### Implementation for User Story 1

- [X] T006 [US1] Render an explicit grouping badge for direct Codex-session rows in `dashboard/src/sessions/SessionList.tsx`
- [X] T007 [US1] Style grouping badges without disrupting dense dashboard layout in `dashboard/src/styles/sessions.css`

**Checkpoint**: Direct Codex-session rows are visibly labeled and independently selectable.

---

## Phase 4: User Story 2 - Drill Into Requests Within The Grouped Session (Priority: P1)

**Goal**: Selecting a grouped session fetches and renders only that session's run detail by the row's `run_id`.

**Independent Test**: Select two direct Codex-session rows with overlapping labels/cache hints and verify each selection requests its own `/api/runs/{run_id}`.

### Tests for User Story 2

- [X] T008 [P] [US2] Add dashboard controller test for selecting distinct direct Codex-session rows by `run_id` in `dashboard/src/test/shell-controller.test.tsx`
- [X] T009 [P] [US2] Add root dashboard API test proving direct Codex sessions stay separate even when local hints overlap in `test/dashboard-api-request-accounting.test.js`

### Implementation for User Story 2

- [X] T010 [US2] Verify existing selection path uses session `run_id` and no browser-side grouping changes are needed in `dashboard/src/shell/DashboardController.tsx`

**Checkpoint**: Request drilldown remains scoped to the selected dashboard session row.

---

## Phase 5: User Story 3 - Surface Grouping Limitations For Non-Codex Fallbacks (Priority: P2)

**Goal**: Fallback/cache rows remain visible and are clearly not labeled as true Codex-session grouped rows.

**Independent Test**: Render mixed direct and fallback sessions and verify their labels differ while fallback limitations remain visible.

### Tests for User Story 3

- [X] T011 [P] [US3] Add dashboard session-list tests for fallback/cache grouping labels and limitations in `dashboard/src/test/session-list.test.tsx`

### Implementation for User Story 3

- [X] T012 [US3] Render fallback/cache/unavailable grouping labels from normalized identity fields in `dashboard/src/sessions/SessionList.tsx`

**Checkpoint**: Users can distinguish true Codex-session rows from fallback rows.

---

## Phase 6: Polish & Validation

**Purpose**: Confirm the implementation matches the spec and does not regress existing dashboard behavior.

- [X] T013 Run root typecheck with `npm run typecheck`
- [X] T014 Run targeted root tests with `node --import tsx --test test/codex-sessions.test.js test/dashboard-api-request-accounting.test.js`
- [X] T015 Run dashboard typecheck with `npm run typecheck` from `dashboard/`
- [X] T016 Run targeted dashboard tests with `npm test -- --run src/test/session-list.test.tsx src/test/shell-controller.test.tsx` from `dashboard/`
- [X] T017 Review 017 spec, plan, tasks, and quickstart for consistency with dashboard-only scope

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Stories (Phase 3-5)**: Depend on Foundational completion.
- **Polish (Phase 6)**: Depends on implemented stories.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational.
- **US2 (P1)**: Can start after Foundational; uses existing selection path and can be validated independently.
- **US3 (P2)**: Can start after Foundational; shares the session-list label helper with US1.

### Parallel Opportunities

- T003 and T004 can run in parallel.
- T005, T008, T009, and T011 are independent test edits but should be merged carefully by file.
- T013-T016 can run after implementation; root and dashboard commands are independent.

## Implementation Strategy

1. Complete Setup and Foundational checks.
2. Implement US1 and US3 together in `SessionList` because they share label rendering.
3. Validate US2 through tests against the existing selection path.
4. Run targeted validation from quickstart.
