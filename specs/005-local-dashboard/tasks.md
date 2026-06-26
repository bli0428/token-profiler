# Tasks: Local Metrics Dashboard

**Input**: Design documents from `/specs/005-local-dashboard/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included because the specification defines independent tests for overview parity, artifact drilldown, session/task navigation, and privacy behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current dashboard/reporting baseline and prepare the surface module structure.

- [X] T001 Run the existing typecheck with `npm run typecheck` and record any pre-existing failures in specs/005-local-dashboard/tasks.md
- [X] T002 Run the existing test suite with `npm test` and record any pre-existing failures in specs/005-local-dashboard/tasks.md
- [X] T003 [P] Review current HTML report responsibilities in src/surfaces/html-report.ts against specs/005-local-dashboard/contracts/dashboard-view-model-contract.md
- [X] T004 [P] Review CLI session/html command behavior in src/surfaces/cli/report-commands.ts against specs/005-local-dashboard/quickstart.md
- [X] T005 [P] Review analyzer summary fields in src/analysis/types.ts against specs/005-local-dashboard/data-model.md

Baseline note: `npm run typecheck` passed. `npm test` had 57 passing tests and 3 pre-existing proxy test failures in `test/proxy.test.js` because the workspace sandbox denied `listen` on `127.0.0.1` with `EPERM`; rerun with elevated permissions during final validation if socket-bound proxy coverage is required.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared dashboard contracts, privacy guards, model construction, and rendering structure required by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Create dashboard view-model and filter type definitions in src/surfaces/dashboard/types.ts
- [X] T007 Implement dashboard caveat mapping helpers from analyzer caveats in src/surfaces/dashboard/model.ts
- [X] T008 Implement privacy-safe display and search field guards in src/surfaces/dashboard/privacy.ts
- [X] T009 Implement base RunAnalysisSummary to DashboardViewModel construction in src/surfaces/dashboard/model.ts
- [X] T010 Implement static dashboard HTML shell rendering in src/surfaces/dashboard/render.ts
- [X] T011 Implement embedded dashboard CSS and client interaction asset strings in src/surfaces/dashboard/assets.ts
- [X] T012 Update createHtmlReport to delegate to dashboard rendering in src/surfaces/html-report.ts
- [X] T013 [P] Add dashboard fixture helpers for analyzer summaries and rendered HTML assertions in test/helpers/dashboard-fixtures.js
- [X] T014 [P] Add architecture boundary assertions for dashboard surface imports in test/architecture-boundaries.test.js

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Run Overview Dashboard (Priority: P1) MVP

**Goal**: A user can open a local dashboard for one captured run and understand overall token usage, cache health, replay exposure, attribution coverage, top contributors, and caveats.

**Independent Test**: Generate or render a dashboard for a fixture run and verify overview metrics, caveats, and top contributor rows match analyzer results used by command-line reports.

### Tests for User Story 1

- [X] T015 [P] [US1] Add dashboard overview metric parity tests in test/dashboard-model.test.js
- [X] T016 [P] [US1] Add top contributor row mapping and deterministic ordering tests in test/dashboard-model.test.js
- [X] T017 [P] [US1] Add static overview HTML rendering tests for metric cards, artifact table, and caveats in test/dashboard-render.test.js

### Implementation for User Story 1

- [X] T018 [US1] Map analyzer totals into DashboardRunOverview in src/surfaces/dashboard/model.ts
- [X] T019 [US1] Map legibility rows and artifact aggregates into DashboardArtifactRow records in src/surfaces/dashboard/model.ts
- [X] T020 [US1] Render overview metric cards, attribution coverage, and global caveats in src/surfaces/dashboard/render.ts
- [X] T021 [US1] Render artifact contributor and replay hotspot tables from DashboardArtifactRow data in src/surfaces/dashboard/render.ts
- [X] T022 [US1] Update CLI html generation path to emit the new dashboard document in src/surfaces/cli/report-commands.ts

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Artifact Drilldown (Priority: P1)

**Goal**: A user can select an artifact row and inspect identity, metadata, metrics, relationships, task membership, privacy state, and attribution notes.

**Independent Test**: Render fixture dashboards with command output, patch, message, file context, and unknown artifacts; verify each detail payload and rendered detail panel includes available facts without leaking hidden content.

### Tests for User Story 2

- [X] T023 [P] [US2] Add artifact detail view-model tests for command output, patch, message, file context, and unknown artifacts in test/dashboard-model.test.js
- [X] T024 [P] [US2] Add tool-link relationship and confidence rendering tests in test/dashboard-render.test.js
- [X] T025 [P] [US2] Add detail panel client-state fixture tests for open, close, and stable artifact selection in test/dashboard-render.test.js

### Implementation for User Story 2

- [X] T026 [US2] Map analyzer ArtifactDetail records into DashboardArtifactDetail records in src/surfaces/dashboard/model.ts
- [X] T027 [US2] Add task group membership and tool link references to detail records in src/surfaces/dashboard/model.ts
- [X] T028 [US2] Render artifact detail panel sections, metrics, metadata rows, tool links, privacy state, and caveats in src/surfaces/dashboard/render.ts
- [X] T029 [US2] Implement client-side artifact row selection and refresh-safe selected artifact state in src/surfaces/dashboard/assets.ts
- [X] T030 [US2] Ensure detail lookup supports stable artifact IDs and short IDs in src/surfaces/dashboard/assets.ts

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Session And Task Exploration (Priority: P2)

**Goal**: A user can browse recent sessions and filter a long run by task group, artifact category, search text, or contribution level.

**Independent Test**: Load fixture data with multiple local runs, task groups, and cross-task artifacts; verify session summaries, task filters, scoped metrics, and empty states update coherently.

### Tests for User Story 3

- [X] T031 [P] [US3] Add recent session index sorting and summary tests in test/dashboard-sessions.test.js
- [X] T032 [P] [US3] Add task group mapping and scoped overview tests in test/dashboard-model.test.js
- [X] T033 [P] [US3] Add category, task, search, no-match, and sort interaction tests in test/dashboard-render.test.js
- [X] T034 [P] [US3] Add cross-task artifact visibility tests for active task filters in test/dashboard-model.test.js

### Implementation for User Story 3

- [X] T035 [US3] Implement recent local run indexing with availability caveats in src/surfaces/dashboard/sessions.ts
- [X] T036 [US3] Map analyzer task groups into DashboardTaskGroup records in src/surfaces/dashboard/model.ts
- [X] T037 [US3] Implement task-scoped overview derivation without mutating run-level data in src/surfaces/dashboard/model.ts
- [X] T038 [US3] Render session selection and task group navigation sections in src/surfaces/dashboard/render.ts
- [X] T039 [US3] Implement client-side category, task, search, and sort filtering in src/surfaces/dashboard/assets.ts
- [X] T040 [US3] Add dashboard/session CLI option or command wiring in src/surfaces/cli/report-commands.ts
- [X] T041 [US3] Update CLI command dispatch for any new dashboard command or option in src/surfaces/cli/index.ts

**Checkpoint**: User Story 3 is independently functional and can be validated with multi-session/task fixtures.

---

## Phase 6: User Story 4 - Privacy-Safe Local Use (Priority: P2)

**Goal**: The dashboard follows the run's storage mode, never exposes hidden raw content, and distinguishes privacy-hidden fields from unavailable data.

**Independent Test**: Render equivalent metadata-only, preview, and raw-content fixture runs; verify embedded data, search fields, detail panels, and rendered HTML obey privacy expectations.

### Tests for User Story 4

- [X] T042 [P] [US4] Add metadata-only no-leak tests for dashboard view model and HTML in test/dashboard-privacy.test.js
- [X] T043 [P] [US4] Add preview and raw-available display-state tests in test/dashboard-privacy.test.js
- [X] T044 [P] [US4] Add hidden versus unavailable field rendering tests in test/dashboard-privacy.test.js
- [X] T045 [P] [US4] Add search payload privacy tests to ensure hidden content is excluded in test/dashboard-privacy.test.js

### Implementation for User Story 4

- [X] T046 [US4] Apply privacy-safe text sanitization to overview, row, detail, task, and session fields in src/surfaces/dashboard/privacy.ts
- [X] T047 [US4] Exclude hidden raw content from embedded dashboard JSON and HTML attributes in src/surfaces/dashboard/render.ts
- [X] T048 [US4] Implement explicit raw-content reveal state only for permitted detail fields in src/surfaces/dashboard/assets.ts
- [X] T049 [US4] Render hidden, preview, raw-available, and unavailable privacy indicators in src/surfaces/dashboard/render.ts

**Checkpoint**: User Story 4 is independently functional across metadata-only, preview, and raw-content fixtures.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate architecture boundaries, documentation, performance, and end-to-end local dashboard behavior.

- [X] T050 [P] Update README dashboard/report documentation in README.md
- [X] T051 [P] Update quickstart findings or implementation notes in specs/005-local-dashboard/quickstart.md
- [X] T052 [P] Add large-run dashboard generation fixture or synthetic performance test in test/dashboard-render.test.js
- [X] T053 Run quickstart validation commands from specs/005-local-dashboard/quickstart.md and record results in specs/005-local-dashboard/tasks.md
- [X] T054 Run `npm run typecheck` and record final result in specs/005-local-dashboard/tasks.md
- [X] T055 Run `npm test` and record final result in specs/005-local-dashboard/tasks.md

Final validation note: Quickstart demo/dashboard generation passed after running `npm run demo` with elevated filesystem permission for `~/.token-profiler`, then generating `/tmp/token-profiler-dashboard.html` and `/tmp/token-profiler-sessions.html`. Final `npm run typecheck` passed. Final `npm test` passed with 75 passing tests when run with elevated loopback permission for proxy tests.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and shares artifact row/detail data with US1.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1 artifact rows plus existing analyzer task groups.
- **User Story 4 (Phase 6)**: Depends on Foundational and should be validated across outputs from US1, US2, and US3.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 Run Overview Dashboard**: MVP. No dependency on other user stories after Foundational.
- **US2 Artifact Drilldown**: Uses the same dashboard row model as US1, but detail mapping can be developed in parallel after Foundational.
- **US3 Session And Task Exploration**: Uses task groups and rows from the shared dashboard model; session indexing can start independently after Foundational.
- **US4 Privacy-Safe Local Use**: Cross-cuts all dashboard model, render, and asset behavior; validate after each visible surface is wired.

### Parallel Opportunities

- T003, T004, and T005 can run in parallel.
- T013 and T014 can run in parallel after T006 through T012 are underway.
- Tests within each user story marked [P] can be written in parallel.
- US2 detail rendering can proceed in `src/surfaces/dashboard/render.ts` while US3 session indexing proceeds in `src/surfaces/dashboard/sessions.ts`.
- US4 privacy tests can be drafted while US1 through US3 implementation stabilizes.
- Documentation and performance checks in Phase 7 can run in parallel after story implementation stabilizes.

---

## Parallel Example: User Story 1

```text
Task: "T015 [P] [US1] Add dashboard overview metric parity tests in test/dashboard-model.test.js"
Task: "T016 [P] [US1] Add top contributor row mapping and deterministic ordering tests in test/dashboard-model.test.js"
Task: "T017 [P] [US1] Add static overview HTML rendering tests for metric cards, artifact table, and caveats in test/dashboard-render.test.js"
```

## Parallel Example: User Story 3

```text
Task: "T031 [P] [US3] Add recent session index sorting and summary tests in test/dashboard-sessions.test.js"
Task: "T032 [P] [US3] Add task group mapping and scoped overview tests in test/dashboard-model.test.js"
Task: "T033 [P] [US3] Add category, task, search, no-match, and sort interaction tests in test/dashboard-render.test.js"
Task: "T034 [P] [US3] Add cross-task artifact visibility tests for active task filters in test/dashboard-model.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate `node src/cli.js html <run_dir> --out <dashboard.html>`.
5. Stop and confirm dashboard overview totals match `node src/cli.js summarize <run_dir> --json`.

### Incremental Delivery

1. Deliver US1 run overview dashboard.
2. Add US2 artifact drilldown.
3. Add US3 session and task exploration.
4. Add US4 privacy hardening across the dashboard model, HTML, client state, and search payloads.
5. Finish documentation, performance checks, quickstart, tests, and typecheck.

### Validation Gates

- Dashboard model generation must consume analyzer outputs and canonical run summaries only.
- Metadata-only fixtures must not leak raw prompt, command output, patch, file-content, or message bodies into HTML or embedded JSON.
- Estimated artifact-level cache or uncached values must show attribution caveats.
- Re-running the same fixture must produce deterministic rows, task groups, detail IDs, and session ordering.
- `npm run typecheck` and `npm test` must pass before the feature is marked complete.
