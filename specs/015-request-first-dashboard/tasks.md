# Tasks: Request-First Dashboard

**Input**: Design documents from `/specs/015-request-first-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/request-first-dashboard.md, quickstart.md

**Tests**: Included because the feature specification and quickstart require independent validation for request rendering, privacy behavior, keyboard expansion, and responsive readability.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify active feature context and baseline dashboard contracts before implementation.

- [X] T001 Verify active Spec Kit feature and prerequisites using `.specify/scripts/bash/check-prerequisites.sh`
- [X] T002 [P] Review dashboard request accounting API types in `dashboard/src/api/types.ts`
- [X] T003 [P] Review existing dashboard fixture request accounting data in `dashboard/test/fixtures/api-real/run.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared state and helpers that all request-first stories depend on.

- [X] T004 Extend request-first view state in `dashboard/src/state/view-state.ts`
- [X] T005 Update refresh reconciliation for expanded request and selected artifact state in `dashboard/src/state/reconcile.ts`
- [X] T006 [P] Add token/date/availability formatting helpers in `dashboard/src/run-explorer/request-format.ts`
- [X] T007 [P] Add request-first state reconciliation tests in `dashboard/src/test/refresh-state.test.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - See Token-Heavy Sessions First (Priority: P1) MVP

**Goal**: Keep the left session list as primary navigation while showing token totals, Codex-facing identity, and mapping/availability limitations.

**Independent Test**: Open/render the session list with multiple sessions and verify token totals, Codex identity, availability, and selected-session behavior.

### Tests for User Story 1

- [X] T008 [P] [US1] Add session list token and identity rendering tests in `dashboard/src/test/session-list.test.tsx`

### Implementation for User Story 1

- [X] T009 [US1] Render session token totals and Codex identity diagnostics in `dashboard/src/sessions/SessionList.tsx`
- [X] T010 [US1] Add session token and identity styles in `dashboard/src/styles/sessions.css`

**Checkpoint**: User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Inspect Requests Chronologically (Priority: P1)

**Goal**: Replace the artifact-first center pane with chronological request rows that display provider-reported cached, uncached, input, output, total, and unavailable states.

**Independent Test**: Render a selected run with several requests and verify request rows appear in contract order with provider metrics visible before any expansion.

### Tests for User Story 2

- [X] T011 [P] [US2] Add request-first center pane rendering tests in `dashboard/src/test/request-first-dashboard.test.tsx`

### Implementation for User Story 2

- [X] T012 [US2] Add chronological request list component in `dashboard/src/run-explorer/RequestList.tsx`
- [X] T013 [US2] Add provider metric request row component in `dashboard/src/run-explorer/RequestRow.tsx`
- [X] T014 [US2] Make `RunExplorer` default to request-first rendering in `dashboard/src/run-explorer/RunExplorer.tsx`
- [X] T015 [US2] Add request list and metric layout styles in `dashboard/src/styles/run-explorer.css`

**Checkpoint**: User Story 2 should be fully functional and testable independently.

---

## Phase 5: User Story 3 - Expand A Request To Explain Contributors (Priority: P2)

**Goal**: Let users expand a request to see request-scoped artifact inclusions with local estimated token counts, caveats, privacy state, and keyboard-accessible controls.

**Independent Test**: Expand a request with multiple artifacts and verify nested rows show request-scoped estimates, caveats, privacy state, and no hidden raw content.

### Tests for User Story 3

- [X] T016 [P] [US3] Add request expansion and keyboard interaction tests in `dashboard/src/test/request-first-dashboard.test.tsx`
- [X] T017 [P] [US3] Add request expansion privacy rendering test in `dashboard/src/test/privacy-rendering.test.tsx`

### Implementation for User Story 3

- [X] T018 [US3] Add request-scoped artifact inclusion component in `dashboard/src/run-explorer/RequestArtifacts.tsx`
- [X] T019 [US3] Wire request expansion state and accessible controls in `dashboard/src/run-explorer/RequestRow.tsx`
- [X] T020 [US3] Add nested artifact and estimate styles in `dashboard/src/styles/run-explorer.css`

**Checkpoint**: User Story 3 should be fully functional and testable independently.

---

## Phase 6: User Story 4 - Preserve Artifact Detail As Secondary Diagnosis (Priority: P3)

**Goal**: Keep artifact detail available from request inclusions while preventing aggregate artifact tables from driving the default center pane.

**Independent Test**: Select an artifact from a request expansion and verify artifact detail opens, stale detail clears on session/run changes, and the request-first pane remains the default.

### Tests for User Story 4

- [X] T021 [P] [US4] Update run explorer artifact detail tests in `dashboard/src/test/run-explorer.test.tsx`

### Implementation for User Story 4

- [X] T022 [US4] Wire request artifact selection to existing detail panel in `dashboard/src/run-explorer/RunExplorer.tsx`
- [X] T023 [US4] Ensure refresh/session reconciliation clears stale detail and expansion state in `dashboard/src/state/reconcile.ts`

**Checkpoint**: User Story 4 should be fully functional and testable independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete request-first dashboard flow and update task status.

- [X] T024 [P] Update contract fixture assertions for request accounting display assumptions in `dashboard/test/helpers/contract-fixtures.ts`
- [X] T025 [P] Verify unsupported/empty request accounting behavior in `dashboard/src/test/request-first-dashboard.test.tsx`
- [X] T026 Run root validation command `npm test`
- [X] T027 Run dashboard validation commands `npm run typecheck`, `npm test`, `npm run test:contracts`, and `npm run test:styles` in `dashboard/`
- [X] T028 Mark all completed tasks in `specs/015-request-first-dashboard/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational.
- **User Story 2 (P1)**: Can start after Foundational; required before US3 and US4 are meaningful.
- **User Story 3 (P2)**: Depends on US2 request rows.
- **User Story 4 (P3)**: Depends on US2 request rows and US3 request artifact inclusions.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T006 and T007 can run in parallel after state shape is understood.
- T008 can be authored before T009/T010.
- T011 can be authored before T012-T015.
- T016 and T017 can be authored in parallel before T018-T020.
- T021 can be authored before T022/T023.
- T024 and T025 can run in parallel before final validation.

---

## Parallel Example: User Story 2

```bash
Task: "Add request-first center pane rendering tests in dashboard/src/test/request-first-dashboard.test.tsx"
Task: "Add chronological request list component in dashboard/src/run-explorer/RequestList.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational tasks.
2. Complete User Story 1 for enriched session navigation.
3. Complete User Story 2 for the request-first center pane.
4. Validate with targeted dashboard tests before adding expansion/detail polish.

### Incremental Delivery

1. Add shared state and formatting.
2. Enrich sessions.
3. Replace artifact-first center pane with request rows.
4. Add request expansion with privacy-safe artifact inclusions.
5. Reconnect artifact detail as a secondary drilldown.
6. Run full root and dashboard validation.

### Notes

- Browser code renders contract data only; it must not recompute request totals, chronology, attribution, or identity confidence.
- Missing provider usage is unavailable or partial, never zero.
- Request-scoped artifact estimates must remain visibly separate from provider-reported request totals.
