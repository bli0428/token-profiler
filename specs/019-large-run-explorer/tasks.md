# Tasks: Large Run Explorer

**Input**: Design documents from `/specs/019-large-run-explorer/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/large-run-dashboard-api.md`, and `quickstart.md`

**Tests**: Required by the acceptance scenarios and success criteria in `spec.md`.

## Phase 1: Setup

**Purpose**: Establish the feature test fixtures and preserve the existing full-detail threshold as an explicit boundary.

- [X] T001 Add reusable large-run canonical-event fixtures and a threshold-exceeding JSONL fixture helper in `test/helpers/dashboard-fixtures.js`

---

## Phase 2: Foundational streaming and projection

**Purpose**: Provide the canonical streaming and analyzer contracts that the large-run API consumes. This phase blocks User Story 1.

- [X] T002 Add a complete-line incremental canonical JSONL reader with line-aware errors in `src/core/store/index.ts`
- [X] T003 Add streaming-reader coverage for valid input, missing files, malformed lines, and an incomplete trailing line in `test/large-run-store.test.js`
- [X] T004 Add the bounded request-level large-run projection and newest-first page selection in `src/analysis/large-run.ts`
- [X] T005 Export the supported large-run analyzer API in `src/analysis/index.ts`
- [X] T006 Add projection coverage for usage-only requests, artifact counts, token totals, stable ordering, and page boundaries in `test/large-run-analyzer.test.js`
- [X] T007 Document the streaming store and public large-run analyzer contracts in `src/core/README.md`, `src/core/contract.md`, `src/analysis/README.md`, and `src/analysis/contract.md`

**Checkpoint**: Canonical events can be streamed and projected without retaining an artifact history.

---

## Phase 3: User Story 1 — Open a large captured session (Priority: P1) 🎯 MVP

**Goal**: A session above the full-detail threshold remains available with overview metrics and a newest-first, bounded request page.

**Independent Test**: Create a fixture larger than the legacy full-file limit, list its session, then fetch its initial and cursor-following request pages without using the whole-file reader.

- [X] T008 [US1] Add failing session-index and API contract coverage for available large runs, overview totals, newest-first pages, invalid cursors, and malformed JSONL in `test/large-run-dashboard-api.test.js`
- [X] T009 [US1] Implement large-run scan summaries and opaque request cursors from canonical projections in `src/surfaces/dashboard-api/large-runs.ts`
- [X] T010 [US1] Route the large overview and request-page endpoints, validate limits/cursors, and map failures to API errors in `src/surfaces/dashboard-api/routes.ts`
- [X] T011 [US1] Use the bounded large-run summary in the session index while retaining unreadable handling for malformed source files in `src/surfaces/dashboard-api/sessions.ts`
- [X] T012 [US1] Define the public dashboard API response shapes and document the paged endpoints in `src/surfaces/dashboard-api/types.ts`, `src/surfaces/dashboard-api/README.md`, and `src/surfaces/dashboard-api/contract.md`
- [X] T013 [US1] Add large-run transport types and page-fetching client functions in `dashboard/src/api/types.ts` and `dashboard/src/api/client.ts`
- [X] T014 [US1] Render overview metrics, newest-first request pages, pagination controls, and an explicit large-run state in `dashboard/src/run-explorer/LargeRunExplorer.tsx`
- [X] T015 [US1] Select the large-run surface without changing the normal run response path in `dashboard/src/shell/DashboardController.tsx` and `dashboard/src/run-explorer/RunExplorer.tsx`
- [X] T016 [US1] Add browser-facing rendering and client-page coverage in `dashboard/src/test/large-run-explorer.test.tsx` and `dashboard/src/test/api-client.test.ts`

**Checkpoint**: A large captured run can be opened and paged in the dashboard without a full event-file allocation.

---

## Phase 4: User Story 2 — Keep normal runs unchanged (Priority: P2)

**Goal**: Runs at or below the existing full-detail threshold continue to use the current dashboard API and explorer.

**Independent Test**: Existing normal-run session, API, and dashboard tests pass with their current full-detail response shape.

- [X] T017 [US2] Add threshold-boundary regression coverage proving normal runs retain the complete availability state and full-detail route in `test/dashboard-sessions.test.js` and `test/dashboard-api.test.js`
- [X] T018 [US2] Preserve normal-run client selection and add a regression rendering test in `dashboard/src/test/run-explorer.test.tsx`

**Checkpoint**: Both large and normal runs render through their intended paths.

---

## Phase 5: Polish and validation

**Purpose**: Validate the complete slice, record the supported workflow, and ensure no scope creep into artifact drilldown.

- [X] T019 Update the end-to-end validation steps and expected results in `specs/019-large-run-explorer/quickstart.md`
- [X] T020 Run root tests, root typecheck, dashboard tests, and dashboard typecheck; record the results in `specs/019-large-run-explorer/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 precedes the shared fixture consumers.
- Phase 2 is the foundation for User Story 1.
- User Story 1 must complete before User Story 2 regression checks, because it introduces the threshold branch.
- Polish follows both stories.

## Parallel Opportunities

- T003 and T006 can run in parallel once T001/T002 and T004 are respectively available.
- T007 can proceed after the public APIs in T002, T004, and T005 stabilize.
- Within User Story 1, dashboard transport/rendering (T013–T016) can proceed after the API response contract in T012 is stable.

## Implementation Strategy

1. Land the streaming reader and analyzer projection with their focused tests.
2. Deliver the P1 session/API path and validate it with a threshold-exceeding fixture.
3. Add the dashboard large-run surface while preserving the existing normal-run surface.
4. Prove the P2 no-regression path with the existing dashboard suite and quickstart commands.
