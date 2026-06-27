# Tasks: Dashboard Style System

> Superseded by expanded spec 008. Retained as an audit/reference checklist; do not execute as a separate implementation queue unless spec 008 is later split again.

**Input**: Design documents from `/specs/012-dashboard-style-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dashboard-style-contract.md, quickstart.md

**Tests**: Included because the specification requires style-boundary validation, state/privacy coverage, responsive layout confidence, and screenshot or visual-regression checks when practical.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing after spec 008 is complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm spec 008 is complete and audit dashboard-owned style-system scaffolding without touching root source or other spec directories.

- [ ] T001 Verify spec 008 dashboard app baseline exists at dashboard/package.json, dashboard/src/App.tsx, dashboard/src/styles/app.css, and dashboard/src/test/
- [ ] T002 Run baseline dashboard checks from dashboard/package.json before style audit
- [ ] T003 Verify dashboard/src/styles/tokens.css exists for dashboard-owned CSS custom properties
- [ ] T004 Verify dashboard/src/styles/layout.css exists for app shell, split panes, panels, grids, toolbars, and scroll regions
- [ ] T005 Verify dashboard/src/styles/states.css exists for loading, empty, offline, version mismatch, stale, partial, not-found, retry, selected, focus, disabled, privacy, and caveat styles
- [ ] T006 Verify dashboard/src/styles/app.css acts as the ordered entrypoint or minimal app-shell file for responsibility-focused modules
- [ ] T007 Document dashboard style file ownership and import order in dashboard/README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared state/privacy styling and validation that all component style ownership depends on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T008 Verify shared state styling covers loading, empty, offline, version mismatch, stale, partial, not-found, retry, selected, focus, disabled, privacy, and caveat states
- [ ] T009 Verify privacy styling for hidden, metadata-only, unavailable, uncaptured, raw-available, partial, stale, attribution caveat, and estimated value states lives in states.css or another documented dashboard-owned module
- [ ] T010 Add dashboard/src/test/style-boundary.test.ts to fail on CSS imports outside dashboard/ or into root src/
- [ ] T011 Add selector discipline checks to dashboard/src/test/style-boundary.test.ts for broad unowned global selectors in dashboard/src/styles/
- [ ] T012 Add dashboard/src/test/style-states.test.tsx coverage for shared loading, empty, offline, version mismatch, privacy, and caveat state classes
- [ ] T013 Add or update dashboard/package.json scripts for dashboard-owned style validation commands
- [ ] T014 Run dashboard style-boundary and style-states checks from dashboard/package.json

**Checkpoint**: Shared style primitives and validation are ready. Corrective style work can proceed without expanding unowned global CSS.

---

## Phase 3: User Story 1 - Maintain Dashboard Styles By Responsibility (Priority: P1) MVP

**Goal**: A maintainer can locate and update dashboard styling by responsibility instead of editing one global stylesheet.

**Independent Test**: Inspect dashboard/src/styles/ and run style-boundary checks proving the entrypoint imports responsibility-focused dashboard-local modules.

### Tests for User Story 1

- [ ] T015 [P] [US1] Extend dashboard/src/test/style-boundary.test.ts to verify dashboard/src/styles/app.css imports required responsibility modules in order
- [ ] T016 [P] [US1] Extend dashboard/src/test/style-boundary.test.ts to fail when dashboard/src/styles/app.css contains component-specific table, detail, sessions, or filter rule groups
- [ ] T017 [P] [US1] Add README ownership assertion coverage in dashboard/src/test/style-boundary.test.ts for every dashboard/src/styles/*.css file

### Implementation for User Story 1

- [ ] T018 [P] [US1] Verify dashboard/src/styles/sessions.css owns session list styling
- [ ] T019 [P] [US1] Verify dashboard/src/styles/run-explorer.css owns run overview, task group, filters, refresh, toolbar, and explorer workspace styling
- [ ] T020 [P] [US1] Verify dashboard/src/styles/tables.css owns artifact table, row, metric, sort header, and empty-result styling
- [ ] T021 [P] [US1] Verify dashboard/src/styles/detail.css owns artifact detail panel, metadata section, relationship, and detail caveat styling
- [ ] T022 [P] [US1] Verify dashboard/src/styles/states.css owns shared privacy, caveat, loading, empty, stale, partial, focus, selected, and disabled states
- [ ] T023 [US1] Verify dashboard/src/styles/app.css imports or references sessions, run explorer, tables, detail, states, layout, and token modules according to the implemented convention
- [ ] T024 [US1] Remove any component-specific rules from dashboard/src/styles/app.css while keeping the entrypoint and minimal app-shell globals
- [ ] T025 [US1] Update dashboard/README.md with style ownership examples for sessions, run explorer, tables, detail, shared states, and privacy styles

**Checkpoint**: User Story 1 is independently usable. Styling has clear ownership and `app.css` is no longer a catch-all file.

---

## Phase 4: User Story 2 - Preserve Visual Consistency Across Dashboard Views (Priority: P1)

**Goal**: Users see consistent dashboard density, state treatment, privacy/caveat visibility, and responsive behavior across sessions, run explorer, tables, and details.

**Independent Test**: Render representative fixture states and verify shared tokens, state classes, privacy classes, and responsive layouts remain stable.

### Tests for User Story 2

- [ ] T026 [P] [US2] Add normal sessions and selected run style coverage in dashboard/src/test/style-states.test.tsx
- [ ] T027 [P] [US2] Add metadata-only, hidden, unavailable, uncaptured, partial, stale, and caveat style coverage in dashboard/src/test/style-states.test.tsx
- [ ] T028 [P] [US2] Add large artifact table density and selected-row style coverage in dashboard/src/test/style-states.test.tsx
- [ ] T029 [P] [US2] Add mobile and desktop responsive layout assertions in dashboard/src/test/style-states.test.tsx
- [ ] T030 [P] [US2] Add artifact detail panel state coverage in dashboard/src/test/style-states.test.tsx

### Implementation for User Story 2

- [ ] T031 [P] [US2] Apply shared layout primitive class names in dashboard/src/App.tsx
- [ ] T032 [P] [US2] Apply shared session style class names in dashboard/src/components/SessionList.tsx
- [ ] T033 [P] [US2] Apply shared run explorer and task group style class names in dashboard/src/components/RunOverview.tsx and dashboard/src/components/TaskGroups.tsx
- [ ] T034 [P] [US2] Apply shared filter and toolbar style class names in dashboard/src/components/FiltersBar.tsx
- [ ] T035 [P] [US2] Apply shared artifact table style class names in dashboard/src/components/ArtifactTable.tsx
- [ ] T036 [P] [US2] Apply shared artifact detail style class names in dashboard/src/components/ArtifactDetailPanel.tsx
- [ ] T037 [P] [US2] Apply shared caveat and privacy style class names in dashboard/src/components/CaveatList.tsx, dashboard/src/components/EmptyState.tsx, and dashboard/src/components/ErrorState.tsx
- [ ] T038 [US2] Verify text, controls, tables, and detail panels do not overlap at mobile and desktop widths using dashboard-owned tests
- [ ] T039 [US2] Run dashboard build, typecheck, tests, and style validation from dashboard/package.json

**Checkpoint**: User Story 2 is independently testable and preserves dashboard visual consistency across core states.

---

## Phase 5: User Story 3 - Guard The Styling Boundary Over Time (Priority: P2)

**Goal**: Maintainers can detect style regressions, root-style leakage, and unowned global CSS growth as dashboard features evolve.

**Independent Test**: Run dashboard-owned validation that fails for root CSS imports, broad catch-all selectors, missing ownership docs, and visual changes to representative fixture states when screenshot checks are available.

### Tests for User Story 3

- [ ] T040 [P] [US3] Add dashboard/src/test/visual-regression.test.tsx for normal session and selected run screenshots when browser test tooling is available
- [ ] T041 [P] [US3] Add dashboard/src/test/visual-regression.test.tsx for offline, version mismatch, metadata-only, partial, stale, large-table, and artifact-detail screenshots when browser test tooling is available
- [ ] T042 [P] [US3] Add deterministic fallback DOM assertions in dashboard/src/test/visual-regression.test.tsx for environments without screenshot support
- [ ] T043 [P] [US3] Extend dashboard/src/test/style-boundary.test.ts to fail when new dashboard/src/styles/*.css files are not imported or documented

### Implementation for User Story 3

- [ ] T044 [US3] Add dashboard-owned visual check command to dashboard/package.json when screenshot tooling is available
- [ ] T045 [US3] Store any dashboard visual fixtures or snapshots under dashboard/src/test/ without referencing live profiler data
- [ ] T046 [US3] Document how to update visual fixtures and when screenshot changes are acceptable in dashboard/README.md
- [ ] T047 [US3] Verify style validation catches a temporary forbidden root style import in dashboard/src/test/style-boundary.test.ts without committing the forbidden import
- [ ] T048 [US3] Verify style validation catches a temporary unowned broad selector in dashboard/src/test/style-boundary.test.ts without committing the selector

**Checkpoint**: User Story 3 guards dashboard styling boundaries over time.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation for the dashboard-only style system.

- [ ] T049 [P] Review dashboard/src/styles/*.css for duplicated token values and replace with dashboard-owned tokens where appropriate
- [ ] T050 [P] Review dashboard/src/styles/*.css for privacy and caveat states that rely on color alone and add non-color indicators where needed
- [ ] T051 [P] Review dashboard/README.md for clear instructions on adding a new component style module
- [ ] T052 Run dashboard style-boundary, style-states, and visual checks from dashboard/package.json
- [ ] T053 Run dashboard typecheck, tests, and build commands from dashboard/package.json
- [ ] T054 Confirm implementation changed only files under dashboard/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Depends on spec 008 completion.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on US1 style ownership and shared primitives.
- **User Story 3 (Phase 5)**: Depends on US1 and US2 validation surfaces.
- **Polish (Phase 6)**: Depends on selected stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; establishes style ownership.
- **User Story 2 (P1)**: Depends on US1 modules and shared state/privacy styles.
- **User Story 3 (P2)**: Depends on representative states and style modules from US1 and US2.

### Parallel Opportunities

- T003-T005 can run in parallel after T001-T002.
- T010-T012 can run in parallel after T008-T009.
- US1 style module creation T018-T022 can run in parallel after style-boundary expectations are drafted.
- US2 component class updates T031-T037 can run in parallel after style modules exist.
- US3 screenshot and fallback tests T040-T043 can run in parallel after representative states are stable.

## Parallel Example: User Story 1

```text
Task: "Verify dashboard/src/styles/sessions.css owns session list styling"
Task: "Verify dashboard/src/styles/run-explorer.css owns run overview, filters, task group, and explorer workspace styling"
Task: "Verify dashboard/src/styles/tables.css owns artifact table, row, metric, sort header, and empty-result styling"
Task: "Verify dashboard/src/styles/detail.css owns artifact detail panel, metadata section, relationship, and detail caveat styling"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Confirm spec 008 app exists and passes baseline checks.
2. Verify shared tokens, layout, states, privacy/caveat treatment, and validation.
3. Keep component styles out of `dashboard/src/styles/app.css`.
4. Stop and validate that style ownership is clear and dashboard imports remain isolated.

### Incremental Delivery

1. Add US1 to prevent immediate style debt.
2. Add US2 to preserve consistent visual treatment across dashboard states.
3. Add US3 to keep style boundaries protected over time.
4. Finish with dashboard-only validation and documentation.

### Isolation Strategy

1. Keep all implementation under `dashboard/`.
2. Do not modify root source, `AGENTS.md`, `.specify/feature.json`, or other spec directories.
3. Treat root styles and generated static dashboard styles as forbidden dependencies.
4. Use deterministic dashboard fixtures instead of live profiler data for visual checks.
