# Tasks: Large Run Request Pages

**Input**: Design documents from `/specs/020-large-run-request-pages/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/large-run-request-pages-api.md`, and `quickstart.md`

**Tests**: Required. The P1 independent test and cursor/error requirements require focused analyzer and dashboard-API coverage.

**Organization**: Tasks are grouped by user story. Feature 019's streaming store and compact request projection are a prerequisite, not duplicated scope.

## Phase 1: Setup

**Purpose**: Establish reusable canonical fixtures for request-page tests without provider payloads.

- [X] T001 Create reusable chronological large-run request fixtures with canonical usage, turn identity, and artifact facts in `test/helpers/dashboard-fixtures.js`

---

## Phase 2: Foundational prerequisites

**Purpose**: Ensure the feature-019 projection supplies the complete, stable request rows that the API page contract consumes. This phase blocks User Story 1.

- [X] T002 Verify and complete the compact request projection's timestamp, canonical usage, canonical turn ID, artifact count, local-token total, and deterministic newest-first tie-break behavior in `src/analysis/large-run.ts`
- [X] T003 Document the analyzer's request-row and bounded-page public contract in `src/analysis/README.md` and `src/analysis/contract.md`
- [X] T004 Add projection coverage for timestamp ties, usage-only requests, canonical turn identity, and page boundaries in `test/large-run-analyzer.test.js`

**Checkpoint**: The analyzer supplies one canonical, deterministic compact row per request without retaining artifact history.

---

## Phase 3: User Story 1 — Page through recent requests (Priority: P1) 🎯 MVP

**Goal**: An investigator can retrieve a bounded, newest-first page of canonical request facts for a large run and follow its opaque continuation cursor safely.

**Independent Test**: Build a local multi-request JSONL fixture, request `limit=1`, follow the returned cursor, and assert that the pages are distinct and newest-first. Reuse, alter, or cross-bind the cursor and assert `400 invalid_request`; assert no provider payload or artifact rows appear in the page.

### Tests for User Story 1

- [X] T005 [US1] Add failing route-level coverage for first/subsequent pages, maximum limits, stable order, run/source-bound cursors, malformed cursors, and unreadable canonical JSONL in `test/large-run-dashboard-api.test.js`

### Implementation for User Story 1

- [X] T006 [US1] Define explicit large-run request-page response types, including only canonical usage and turn facts plus pagination metadata, in `src/surfaces/dashboard-api/types.ts`
- [X] T007 [US1] Implement source-versioned summary reuse, opaque cursor decode/encode, cursor validation, bounded page selection, and explicit analyzer-row mapping in `src/surfaces/dashboard-api/large-runs.ts`
- [X] T008 [US1] Route `GET /api/runs/{run_id}/large/requests`, validate the `limit` range, and translate invalid cursors and unreadable runs to the documented API errors in `src/surfaces/dashboard-api/routes.ts`
- [X] T009 [US1] Add the typed request-page response and a cursor-forwarding client method without cursor decoding in `dashboard/src/api/types.ts` and `dashboard/src/api/client.ts`

**Checkpoint**: A local caller can retrieve only the requested request rows, page forward with an API-owned token, and receive clear failures for invalid cursor state.

---

## Phase 4: Polish and cross-cutting validation

**Purpose**: Keep surface documentation accurate and prove the request-page slice preserves its memory, privacy, and contract boundaries.

- [X] T010 [P] Update the request-page public API and forbidden-dependency rules in `src/surfaces/dashboard-api/README.md` and `src/surfaces/dashboard-api/contract.md`
- [X] T011 [P] Align the dashboard transport type expectations with the API fixture contract in `dashboard/src/test/api-client.test.ts`
- [X] T012 Update completed validation commands and expected request-page outcomes in `specs/020-large-run-request-pages/quickstart.md`
- [X] T013 Run the focused large-run tests, root typecheck, and dashboard typecheck from `specs/020-large-run-request-pages/quickstart.md`; record the results in `specs/020-large-run-request-pages/quickstart.md`

---

## Dependencies & Execution Order

```text
T001 -> T004
T002 -> T003 -> T004
T001 + T002 + T004 -> T005 -> T006 -> T007 -> T008 -> T009
T008 -> T010, T011
T009 + T010 + T011 -> T012 -> T013
```

- **Setup (T001)** supplies canonical fixtures for analyzer and route tests.
- **Foundational (T002–T004)** must complete before the API route can safely rely on request rows.
- **User Story 1 (T005–T009)** is the MVP and has no dependency on artifact pages or feature 021.
- **Polish (T010–T013)** follows the completed API/client contract.

## Parallel Opportunities

- T001 and T002 can proceed in parallel because fixtures and analyzer implementation are separate files.
- Once T002's public shape stabilizes, T003 can proceed in parallel with fixture work.
- After T008, T010 and T011 can proceed in parallel because they update separate surface and dashboard test areas.

## Parallel Example: User Story 1

```text
After the API response shape in T006 is agreed:

Task: "Implement source-bound cursor and explicit request-page mapping in src/surfaces/dashboard-api/large-runs.ts"
Task: "Prepare the dashboard request-page transport types in dashboard/src/api/types.ts and dashboard/src/api/client.ts"
```

## Implementation Strategy

### MVP First

1. Complete T001–T004 to lock the canonical request projection and its tests.
2. Write the route tests in T005, then implement T006–T008 until the focused API suite passes.
3. Add T009 so the dashboard transport forwards opaque cursors untouched.
4. Validate the P1 independent test before moving to documentation and final checks.

### Incremental Delivery

1. Analyzer projection is stable and explainable.
2. Local API returns bounded pages with cursor safety.
3. Dashboard client consumes the declared page contract.
4. Documentation and validation preserve the boundary for later artifact-page work in feature 021.
