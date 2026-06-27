# Tasks: Dashboard Contract Drift Guards

> Superseded by expanded spec 008. Retained as an audit/reference checklist; do not execute as a separate implementation queue unless spec 008 is later split again.

**Input**: Design documents from `/specs/010-dashboard-contract-drift-guards/`

**Prerequisites**: spec 007 complete, spec 008 complete, plan.md, spec.md, research.md, data-model.md, contracts/dashboard-contract-fixtures.md, quickstart.md

**Tests**: Included because the specification requires API-real baseline validation, dashboard fixture-consuming tests, privacy no-leak checks, structured-error coverage, unsupported-version checks, and import-boundary checks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisite features are complete and audit the fixture locations established by spec 008.

- [X] T001 Verify spec 007 dashboard API implementation and tests are complete by reviewing specs/007-dashboard-api-surface/tasks.md and package.json before starting this feature
- [X] T002 Verify spec 008 isolated dashboard frontend implementation and tests are complete by reviewing specs/008-dashboard-frontend-app/tasks.md and dashboard/package.json before starting this feature
- [X] T003 Verify dashboard/test/fixtures/api-real/ exists for generated API-real baseline fixtures
- [X] T004 Verify dashboard/test/fixtures/edge-fixtures.ts and dashboard/test/fixtures/large-run-fixture.ts exist for curated edge fixtures
- [ ] T005 [P] Create dashboard/src/test/contract-drift.test.ts for baseline fixture consumer tests
- [ ] T006 [P] Create dashboard/src/test/contract-edge-fixtures.test.ts for edge fixture consumer tests
- [X] T007 [P] Create dashboard/src/test/privacy-fixture-safety.test.ts for raw-content leak checks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the fixture-generation and validation foundation required by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T008 Define deterministic API-real fixture file names and source metadata shape in dashboard/test/fixtures/api-real/source.json
- [X] T009 Verify dashboard/scripts/capture-api-fixtures.ts captures GET /api/status over HTTP only
- [X] T010 Verify dashboard/scripts/capture-api-fixtures.ts captures GET /api/sessions?limit=20 over HTTP only
- [X] T011 Verify dashboard/scripts/capture-api-fixtures.ts captures GET /api/runs/:runId over HTTP only
- [X] T012 Verify dashboard/scripts/capture-api-fixtures.ts captures GET /api/runs/:runId/artifacts/:artifactId over HTTP only
- [X] T013 Verify dashboard/package.json owns the fixtures:capture npm script
- [X] T014 Verify dashboard/scripts/capture-api-fixtures.ts validates generated fixture schema-version and readiness
- [X] T015 Verify dashboard/scripts/capture-api-fixtures.ts validates generated fixtures for hidden raw-content safety
- [X] T016 Verify dashboard/scripts/capture-api-fixtures.ts normalizes or documents volatile metadata handling
- [X] T017 [P] Verify dashboard-owned JSON fixture loading helper exists in dashboard/test/helpers/contract-fixtures.ts
- [X] T018 [P] Add dashboard-owned fixture parse assertions using duplicated API types in dashboard/src/test/contract-drift.test.ts
- [X] T019 Document fixture generation and validation commands in dashboard/README.md

**Checkpoint**: Baseline fixture generation and dashboard-side fixture loading are ready.

---

## Phase 3: User Story 1 - Detect Dashboard Contract Drift (Priority: P1) MVP

**Goal**: A maintainer can generate API-real fixtures from the completed API and run dashboard tests that fail on incompatible contract drift.

**Independent Test**: Generate baseline fixtures from the local dashboard API and run dashboard contract drift tests without a live API process.

### Tests for User Story 1

- [X] T020 [P] [US1] Add status baseline fixture assertions in dashboard/src/test/contract-drift.test.ts
- [X] T021 [P] [US1] Add sessions baseline fixture assertions in dashboard/src/test/contract-drift.test.ts
- [X] T022 [P] [US1] Add run baseline fixture assertions in dashboard/src/test/contract-drift.test.ts
- [X] T023 [P] [US1] Add artifact detail baseline fixture assertions in dashboard/src/test/contract-drift.test.ts
- [ ] T024 [P] [US1] Add unsupported or missing schema-version failure assertions in dashboard/src/test/contract-drift.test.ts

### Implementation for User Story 1

- [X] T025 [US1] Generate dashboard/test/fixtures/api-real/status.json from actual GET /api/status response
- [X] T026 [US1] Generate dashboard/test/fixtures/api-real/sessions.json from actual GET /api/sessions?limit=20 response
- [X] T027 [US1] Generate dashboard/test/fixtures/api-real/run.json from actual GET /api/runs/:runId response
- [X] T028 [US1] Generate dashboard/test/fixtures/api-real/artifact-detail.json from actual GET /api/runs/:runId/artifacts/:artifactId response
- [X] T029 [US1] Generate dashboard/test/fixtures/api-real/source.json with safe fixture run metadata and normalization notes
- [X] T030 [US1] Wire contract-drift tests into dashboard/package.json test workflow

**Checkpoint**: User Story 1 detects real API/frontend contract drift and is the MVP.

---

## Phase 4: User Story 2 - Preserve Privacy And Edge Behavior Fixtures (Priority: P1)

**Goal**: A maintainer can validate edge cases that preserve privacy, structured error, empty-state, partial, stale, large, and unsupported-version behavior.

**Independent Test**: Run edge fixture tests without a live API process and verify no hidden raw content is present.

### Tests for User Story 2

- [ ] T031 [P] [US2] Add empty sessions edge assertions in dashboard/src/test/contract-edge-fixtures.test.ts
- [ ] T032 [P] [US2] Add unknown run and unknown artifact structured-error assertions in dashboard/src/test/contract-edge-fixtures.test.ts
- [ ] T033 [P] [US2] Add unreadable run structured-error assertions in dashboard/src/test/contract-edge-fixtures.test.ts
- [ ] T034 [P] [US2] Add partial and stale run caveat assertions in dashboard/src/test/contract-edge-fixtures.test.ts
- [ ] T035 [P] [US2] Add metadata-only and hidden content rendering assertions in dashboard/src/test/contract-edge-fixtures.test.ts
- [ ] T036 [P] [US2] Add large run shape assertions for at least 1,000 artifact rows in dashboard/src/test/contract-edge-fixtures.test.ts
- [X] T037 [P] [US2] Add raw prompt, command output, patch, file-content, and message-body absence assertions in dashboard/src/test/privacy-fixture-safety.test.ts

### Implementation for User Story 2

- [ ] T038 [US2] Add empty sessions edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T039 [US2] Add run not found edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T040 [US2] Add artifact not found edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T041 [US2] Add run unreadable edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T042 [US2] Add partial run edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T043 [US2] Add stale run edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T044 [US2] Add metadata-only run edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T045 [US2] Add hidden content detail edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T046 [US2] Add unsupported version edge case to dashboard/test/fixtures/edge-fixtures.ts
- [ ] T047 [US2] Add large-run edge fixture generator in dashboard/test/fixtures/large-run-fixture.ts
- [X] T048 [US2] Wire edge fixture and privacy safety tests into dashboard/package.json test workflow

**Checkpoint**: User Story 2 protects privacy and non-happy-path contract behavior.

---

## Phase 5: User Story 3 - Keep Baselines Reviewable Over Time (Priority: P2)

**Goal**: A maintainer can intentionally refresh baselines and review meaningful API contract changes.

**Independent Test**: Regenerate fixtures from unchanged safe fixture data and verify output is deterministic or documented.

### Tests for User Story 3

- [X] T049 [P] [US3] Add deterministic fixture formatting test in dashboard/src/test/contract-drift.test.ts
- [X] T050 [P] [US3] Add source metadata validation test in dashboard/src/test/contract-drift.test.ts
- [X] T051 [P] [US3] Add volatile-field normalization assertions in dashboard/src/test/contract-drift.test.ts

### Implementation for User Story 3

- [X] T052 [US3] Add fixture refresh instructions and review checklist to dashboard/README.md
- [X] T053 [US3] Add root quick command documentation for fixture regeneration in README.md
- [X] T054 [US3] Ensure dashboard/scripts/capture-api-fixtures.ts writes stable sorted JSON keys
- [X] T055 [US3] Ensure dashboard/scripts/capture-api-fixtures.ts reports changed endpoint files after writing fixtures

**Checkpoint**: User Story 3 makes fixture refreshes intentional and reviewable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation checks across API generation and dashboard consumption.

- [X] T056 [P] Run dashboard import-boundary test from dashboard/package.json
- [X] T057 [P] Run dashboard contract drift tests from dashboard/package.json
- [X] T058 [P] Run dashboard edge fixture and privacy safety tests from dashboard/package.json
- [X] T059 Run dashboard typecheck, tests, and build commands defined in dashboard/package.json
- [ ] T060 Run dashboard fixtures:capture command defined in dashboard/package.json against safe fixture data
- [X] T061 Run root test commands defined in package.json
- [X] T062 Verify no dashboard/src/test/ or dashboard/src/ file imports root src/
- [X] T063 Verify generated dashboard/test/fixtures/api-real/ and dashboard/test/fixtures/ fixtures contain no private hidden raw content

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Depends on completed specs 007 and 008.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and can proceed after fixture loading conventions are known.
- **User Story 3 (Phase 5)**: Depends on US1 generated baseline behavior.
- **Polish (Phase 6)**: Depends on selected stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; required for API-real drift protection.
- **User Story 2 (P1)**: Can start after Foundational; independent of live API generation once fixture shapes are known.
- **User Story 3 (P2)**: Depends on US1 fixture generation and baseline files.

### Parallel Opportunities

- T005-T007 can run in parallel after fixture directories exist.
- T017-T018 can run in parallel with generator work after file naming is defined.
- US1 endpoint assertions T020-T023 can run in parallel.
- US2 edge assertions T031-T037 can run in parallel.
- US2 edge fixture files T038-T047 can be created in parallel once the edge fixture shape is established.
- Final validation tasks T056-T058 can run in parallel.

## Parallel Example: User Story 2

```text
Task: "Add empty sessions edge assertions in dashboard/src/test/contract-edge-fixtures.test.ts"
Task: "Add unknown run and unknown artifact structured-error assertions in dashboard/src/test/contract-edge-fixtures.test.ts"
Task: "Add metadata-only and hidden content rendering assertions in dashboard/src/test/contract-edge-fixtures.test.ts"
Task: "Add raw prompt, command output, patch, file-content, and message-body absence assertions in dashboard/src/test/privacy-fixture-safety.test.ts"
Task: "Add metadata-only run edge case to dashboard/test/fixtures/edge-fixtures.ts"
Task: "Add hidden content detail edge case to dashboard/test/fixtures/edge-fixtures.ts"
Task: "Add unsupported version edge case to dashboard/test/fixtures/edge-fixtures.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Confirm specs 007 and 008 are complete.
2. Complete fixture directory setup and generator foundation.
3. Generate API-real baseline fixtures for all four required endpoints.
4. Add dashboard contract tests that consume those fixtures without root imports.
5. Stop and validate drift checks fail on incompatible schema-version or field-shape changes.

### Incremental Delivery

1. Add US1 to prove real API/frontend contract alignment.
2. Add US2 to cover privacy and non-happy-path semantics.
3. Add US3 to make fixture refreshes deterministic and reviewable.
4. Finish with full root and dashboard validation.

### Isolation Strategy

1. Keep root/API fixture generation separate from dashboard fixture consumption.
2. Store dashboard-consumed fixtures under dashboard-owned fixture paths.
3. Run import-boundary checks against dashboard source and tests.
4. Treat generated fixtures as external HTTP payloads, not shared internal types.
5. Never require dashboard code to understand root source layout, analyzer internals, or local JSONL storage.
