# Tasks: Large Run Artifact Pages

**Input**: Design documents from `/specs/021-large-run-artifact-pages/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/large-run-artifact-pages-api.md`, and `quickstart.md`

**Tests**: Required. The P1 independent test and explicit privacy/cursor requirements require focused analyzer, dashboard API, client, and explorer coverage.

**Organization**: Tasks are grouped by user story. The existing streaming store is a prerequisite and is not changed unless a focused test proves it cannot supply complete canonical records.

## Phase 1: Setup

**Purpose**: Establish reusable canonical fixtures that prove selected-request isolation and each privacy storage mode without provider payloads.

- [X] T001 Extend canonical large-run fixtures with interleaved selected/other-request artifacts and metadata, preview, and raw storage modes in `test/helpers/dashboard-fixtures.js`

---

## Phase 2: Foundational prerequisites

**Purpose**: Lock the bounded analyzer behavior and test seam that the API route will use. This phase blocks User Story 1.

- [X] T002 Add failing selected-request page coverage for canonical order, page boundaries, one-record look-ahead, and no cross-request artifact retention in `test/large-run-analyzer.test.js`
- [X] T003 Implement a bounded selected-request artifact-page primitive that streams canonical records, retains at most a page plus one matching look-ahead record, and returns only analyzer offsets in `src/analysis/large-run.ts`

**Checkpoint**: The analyzer can page artifacts for exactly one request without HTTP state, provider payloads, or run-wide artifact history.

---

## Phase 3: User Story 1 — Inspect a selected request (Priority: P1) 🎯 MVP

**Goal**: An investigator can select a request in a large run and page through only its privacy-safe artifact rows using an opaque cursor.

**Independent Test**: With interleaved local canonical events, request a selected request's artifacts at `limit=1`, follow its cursor, and assert stable distinct rows from only that request. Reuse the cursor for another request/run, alter it, or modify the event source and assert `400 invalid_request`; assert metadata, preview, and raw fixtures expose only declared list fields and their correct privacy state.

### Tests for User Story 1

- [X] T004 [US1] Add failing route-level coverage for selected-request isolation, stable artifact order, limit validation, run/request/source-bound cursors, malformed cursors, unreadable JSONL, and content-free privacy states in `test/large-run-dashboard-api.test.js`
- [X] T005 [P] [US1] Add dashboard client request-path and opaque-cursor forwarding coverage for the request-artifact endpoint in `dashboard/src/test/api-client.test.ts`
- [X] T006 [P] [US1] Add explorer coverage for selecting a request, rendering the returned artifact fields, and following an artifact next cursor in `dashboard/src/test/large-run-explorer.test.tsx`

### Implementation for User Story 1

- [X] T007 [US1] Define the explicit `DashboardApiLargeRunArtifactPage` and artifact-row transport types, excluding content/preview bodies, in `src/surfaces/dashboard-api/types.ts`
- [X] T008 [US1] Implement separately validated artifact cursors bound to offset, run ID, request ID, and source version; map selected canonical artifact rows through the established privacy-safe display policy in `src/surfaces/dashboard-api/large-runs.ts`
- [X] T009 [US1] Route `GET /api/runs/{run_id}/large/requests/{request_id}/artifacts`, stat the source, enforce the shared 1–500 limit, and translate invalid cursor/unreadable-source failures into documented errors in `src/surfaces/dashboard-api/routes.ts`
- [X] T010 [US1] Mirror the artifact-page transport type and add a typed cursor-forwarding `getLargeRunArtifacts` client method in `dashboard/src/api/types.ts` and `dashboard/src/api/client.ts`
- [X] T011 [US1] Add selected-request artifact-page state, loading/error handling, privacy-state display, and next-page interaction without client-side cursor decoding in `dashboard/src/run-explorer/LargeRunExplorer.tsx`

**Checkpoint**: The selected request has a bounded, privacy-safe artifact page in the local dashboard; no returned row can originate from another request or expose stored content.

---

## Phase 4: Polish and cross-cutting validation

**Purpose**: Document the changed public boundaries and confirm the full validation scenario.

- [X] T012 [P] Update selected-request artifact paging usage and analyzer ownership in `src/analysis/README.md` and `src/analysis/contract.md`
- [X] T013 [P] Update artifact-page route behavior, cursor invariants, public types, and forbidden dependencies in `src/surfaces/dashboard-api/README.md` and `src/surfaces/dashboard-api/contract.md`
- [X] T014 Update validation evidence and results after running the quickstart commands in `specs/021-large-run-artifact-pages/quickstart.md`

---

## Dependencies & Execution Order

```text
T001 -> T002 -> T003
T001 + T003 -> T004
T003 -> T007 -> T008 -> T009 -> T010 -> T011
T004 + T005 + T006 + T009 + T010 + T011 -> T012 + T013 -> T014
```

- **Setup (T001)** provides canonical fixture facts shared by focused tests.
- **Foundational (T002–T003)** establishes the bounded analyzer page before API code relies on it.
- **User Story 1 (T004–T011)** delivers the P1 endpoint and dashboard interaction.
- **Polish (T012–T014)** documents the updated analyzer and surface contracts and records validation evidence.

## Parallel Opportunities

- After T001, T002 can proceed while the route/UI test assertions are drafted, but T003 must land before those tests can run end-to-end.
- T005 and T006 can proceed in parallel because they cover distinct dashboard files and consume the declared contract.
- After T009, T010 and the API documentation portion of T013 can proceed in parallel in separate file groups.
- T012 and T013 can proceed in parallel after the implementation shape is stable.

## Parallel Example: User Story 1

```text
After the response shape in T007 is agreed:

Task: "Add cursor-bound artifact page mapping in src/surfaces/dashboard-api/large-runs.ts"
Task: "Add dashboard artifact endpoint client coverage in dashboard/src/test/api-client.test.ts"
Task: "Add selected-request explorer interaction coverage in dashboard/src/test/large-run-explorer.test.tsx"
```

## Implementation Strategy

### MVP First

1. Complete T001–T003 to prove the bounded canonical selection primitive.
2. Write T004, then implement T007–T009 until the route-level independent test passes.
3. Complete T010–T011 to make the dashboard consume only the declared artifact page.
4. Validate the P1 scenario before documentation and final commands.

### Incremental Delivery

1. The analyzer can stream a selected request's ordered artifact page.
2. The local API exposes it with cursor and privacy guarantees.
3. The browser lets an investigator select and page that request.
4. Layer documentation and quickstart evidence preserve the boundary for future work.

## Notes

- All implementation tasks preserve `Adapters -> Canonical Store -> Analyzers -> Surfaces`.
- The analyzer owns filtering/order/offsets; the dashboard API owns opaque cursor validation and privacy-safe HTTP mapping.
- No task may add full-detail aggregation, run-wide artifact caching, raw/preview content, provider payloads, or browser-side pagination reconstruction to the large-run path.
