# Tasks: Request Accounting Contract

**Input**: Design documents from `/specs/014-request-accounting-contract/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/request-accounting-contract.md, quickstart.md

**Tests**: Included because the specification defines independent tests for each user story and the plan requires focused analyzer/API contract coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or depends only on completed prerequisites
- **[Story]**: User story label from spec.md
- Every task names the exact file path to change

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared fixtures and validation scaffolding used by request accounting tests.

- [X] T001 Create reusable request accounting fixture builders in test/helpers/request-accounting-fixtures.js
- [X] T002 [P] Add metadata-only request accounting fixture helpers in test/helpers/dashboard-fixtures.js
- [X] T003 [P] Add request accounting validation notes to specs/014-request-accounting-contract/quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish owned analyzer/API contracts before implementing user-story behavior.

**CRITICAL**: No user story work should begin until these types and boundaries exist.

- [X] T004 Add RequestAccountingResult, RequestAccountingRow, ProviderRequestUsage, RequestArtifactInclusion, RequestUsageAvailability, and SessionIdentityMapping analyzer types in src/analysis/types.ts
- [X] T005 Add DashboardApiRequestAccounting, DashboardApiRequestAccountingRow, DashboardApiRequestArtifactInclusion, and DashboardApiSessionIdentityMapping API types in src/surfaces/dashboard-api/types.ts
- [X] T006 [P] Add architecture-boundary assertions for request accounting staying out of dashboard/src in test/architecture-boundaries.test.js

**Checkpoint**: Analyzer and API contracts are owned at the correct boundaries and browser code remains a consumer.

---

## Phase 3: User Story 1 - Rank Requests By Provider Usage (Priority: P1) MVP

**Goal**: A user can inspect one captured session and see provider requests in chronological order with authoritative token totals and incomplete usage clearly marked.

**Independent Test**: Load a captured session with multiple request usage records and verify request rows expose timestamp, input, cached input, uncached input, output, total tokens, chronological order, deterministic tie handling, and incomplete usage without artifact analysis.

### Tests for User Story 1

- [X] T007 [P] [US1] Add analyzer tests for provider usage rows, deterministic request ordering, highest-total summary, highest-uncached summary, and missing usage availability in test/request-accounting.test.js
- [X] T008 [P] [US1] Add dashboard API contract tests for requests on GET /api/runs/:runId and request_accounting capability on GET /api/status in test/dashboard-api-request-accounting.test.js

### Implementation for User Story 1

- [X] T009 [US1] Implement request accounting analyzer row construction and summary ranking in src/analysis/request-accounting.ts
- [X] T010 [US1] Wire request accounting analyzer output into RunAnalysisSummary in src/analysis/pipeline.ts
- [X] T011 [US1] Add request accounting fields to dashboard API view-model contracts in src/surfaces/dashboard-api/view-model-types.ts
- [X] T012 [US1] Map analyzer request accounting output into dashboard-safe API run responses in src/surfaces/dashboard-api/view-model.ts
- [X] T013 [US1] Expose request accounting capability and run response fields through API response types in src/surfaces/dashboard-api/types.ts
- [X] T014 [US1] Update dashboard API status response to include request_accounting capability in src/surfaces/dashboard-api/routes.ts
- [X] T015 [US1] Extend existing dashboard API fixture snapshots or contract fixtures with request accounting fields in dashboard/test/fixtures/api-real/run.json

**Checkpoint**: User Story 1 is independently functional; expensive provider requests can be ranked without aggregate artifact analysis.

---

## Phase 4: User Story 2 - Preserve Session Identity For Codex Runs (Priority: P1)

**Goal**: A user can correlate dashboard sessions with available Codex session/run identity while keeping the routable dashboard run ID stable.

**Independent Test**: Load captured runs routed from Codex sessions and verify each exposed session has a route identifier plus available Codex-facing identity or diagnostic label, with limitations disclosed when one-to-one mapping cannot be proven.

### Tests for User Story 2

- [X] T016 [P] [US2] Add session identity mapping tests for direct Codex session IDs and fallback mappings in test/codex-sessions.test.js
- [X] T017 [P] [US2] Add dashboard API session identity contract tests for route_run_id, canonical_run_id, Codex identity fields, confidence, source, and limitations in test/dashboard-api-request-accounting.test.js

### Implementation for User Story 2

- [X] T018 [US2] Build dashboard session identity mapping from routable run IDs, canonical run IDs, Codex labels, and available Codex diagnostics in src/surfaces/dashboard-api/sessions.ts
- [X] T019 [US2] Preserve route identity while exposing SessionIdentityMapping on dashboard API sessions in src/surfaces/dashboard-api/types.ts
- [X] T020 [US2] Map session identity into dashboard API session view models without absolute local paths in src/surfaces/dashboard-api/sessions.ts
- [X] T021 [US2] Add caveats or availability limitations for non-one-to-one session mappings in src/surfaces/dashboard-api/sessions.ts
- [X] T022 [US2] Update dashboard API real session fixture with identity mapping fields in dashboard/test/fixtures/api-real/sessions.json

**Checkpoint**: User Stories 1 and 2 both work independently; request accounting and session identity are available through API contracts.

---

## Phase 5: User Story 3 - Explain Request Cost With Request-Scoped Artifacts (Priority: P2)

**Goal**: A user can expand an expensive request and see the artifacts included in that request with local token counts, request order, request-local estimated cache attribution, privacy state, and caveats.

**Independent Test**: Load a session with a request containing multiple artifacts and verify request detail exposes only that request's inclusions, preserves order, includes local token counts, includes estimated cached/uncached portions when possible, and marks partial/unavailable attribution when facts are missing.

### Tests for User Story 3

- [X] T023 [P] [US3] Add analyzer tests for request-scoped artifact inclusions, request order fallback, local token totals, offsetless attribution availability, and usage-missing attribution availability in test/request-accounting.test.js
- [X] T024 [P] [US3] Add dashboard API privacy tests proving metadata-only request accounting excludes raw prompt, file, command, tool output, and message bodies in test/dashboard-api-privacy.test.js
- [X] T025 [P] [US3] Add dashboard API contract tests for request artifact inclusion fields and caveats in test/dashboard-api-request-accounting.test.js

### Implementation for User Story 3

- [X] T026 [US3] Refactor request-local cache attribution helpers for reuse by request accounting in src/analysis/cache-attribution.ts
- [X] T027 [US3] Add request-scoped artifact inclusion construction with stable order, local token counts, offsets, and attribution availability in src/analysis/request-accounting.ts
- [X] T028 [US3] Attach local attribution and partial-data caveats to request rows and artifact inclusions in src/analysis/request-accounting.ts
- [X] T029 [US3] Map request artifact inclusions to dashboard-safe labels, privacy states, and caveats in src/surfaces/dashboard-api/view-model.ts
- [X] T030 [US3] Add request accounting privacy helpers or reuse existing dashboard privacy mapping in src/surfaces/dashboard-api/privacy.ts
- [X] T031 [US3] Extend dashboard API real run fixture with request-scoped artifact inclusions in dashboard/test/fixtures/api-real/run.json

**Checkpoint**: All user stories are independently functional and request accounting explains expensive requests without leaking hidden content.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation alignment, and contract safety checks.

- [X] T032 [P] Update request accounting implementation notes and validation commands in specs/014-request-accounting-contract/quickstart.md
- [X] T033 [P] Update dashboard API contract documentation with finalized request accounting fields in specs/014-request-accounting-contract/contracts/request-accounting-contract.md
- [X] T034 Run focused request accounting validation commands from specs/014-request-accounting-contract/quickstart.md
- [X] T035 Run full root validation commands from package.json
- [X] T036 Review request accounting source files for module-boundary style and explicit field mapping in src/analysis/request-accounting.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and may run alongside US1 after shared types exist.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1 analyzer/API mapping, but remains independently testable through request inclusion tests.
- **Polish (Phase 6)**: Depends on selected stories being complete.

### User Story Dependencies

- **US1 Rank Requests By Provider Usage**: First MVP slice; no dependency on US2 or US3.
- **US2 Preserve Session Identity For Codex Runs**: Independent from request row construction after shared API types exist.
- **US3 Explain Request Cost With Request-Scoped Artifacts**: Builds on the request accounting analyzer shape from US1 but can be tested independently with request inclusion fixtures.

### Within Each User Story

- Write tests first and confirm they fail before implementation.
- Add analyzer behavior before dashboard API mapping.
- Map analyzer contracts to API-owned types explicitly by field name.
- Validate privacy and boundary checks before marking a story complete.

## Parallel Opportunities

- T002 and T003 can run in parallel after T001.
- T005 and T006 can run in parallel after T004 is understood.
- T007 and T008 can run in parallel for US1.
- T016 and T017 can run in parallel for US2.
- T023, T024, and T025 can run in parallel for US3.
- US2 work can proceed in parallel with US1 implementation after Phase 2.

## Parallel Example: User Story 1

```bash
Task: "Add analyzer tests for provider usage rows, deterministic request ordering, highest-total summary, highest-uncached summary, and missing usage availability in test/request-accounting.test.js"
Task: "Add dashboard API contract tests for requests on GET /api/runs/:runId and request_accounting capability on GET /api/status in test/dashboard-api-request-accounting.test.js"
```

## Parallel Example: User Story 2

```bash
Task: "Add session identity mapping tests for direct Codex session IDs and fallback mappings in test/codex-sessions.test.js"
Task: "Add dashboard API session identity contract tests for route_run_id, canonical_run_id, Codex identity fields, confidence, source, and limitations in test/dashboard-api-request-accounting.test.js"
```

## Parallel Example: User Story 3

```bash
Task: "Add analyzer tests for request-scoped artifact inclusions, request order fallback, local token totals, offsetless attribution availability, and usage-missing attribution availability in test/request-accounting.test.js"
Task: "Add dashboard API privacy tests proving metadata-only request accounting excludes raw prompt, file, command, tool output, and message bodies in test/dashboard-api-privacy.test.js"
Task: "Add dashboard API contract tests for request artifact inclusion fields and caveats in test/dashboard-api-request-accounting.test.js"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational contract types and boundary checks.
3. Complete Phase 3 for request rows and provider usage.
4. Validate with `node --import tsx --test test/request-accounting.test.js test/dashboard-api-request-accounting.test.js`.
5. Stop and confirm a user can rank highest-total and highest-uncached requests from API output.

### Incremental Delivery

1. Add US1 to expose request-level provider usage.
2. Add US2 to preserve Codex-facing session identity diagnostics.
3. Add US3 to explain expensive requests with request-scoped artifact inclusions.
4. Run focused validation after each story and full root validation at the end.

### Boundary Discipline

- Keep request accounting logic in `src/analysis/`.
- Keep public JSON contract mapping in `src/surfaces/dashboard-api/`.
- Keep `dashboard/src` as a consumer for later dashboard rendering work.
- Preserve metadata-only privacy behavior throughout analyzer and API responses.
