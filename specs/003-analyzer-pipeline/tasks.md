# Tasks: Modular Analyzer Pipeline

**Input**: Design documents from `/specs/003-analyzer-pipeline/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/analyzer-result-contract.md](./contracts/analyzer-result-contract.md), [quickstart.md](./quickstart.md)

**Tests**: Required by the spec and quickstart. Add analyzer-focused fixtures before implementation where practical, and keep legacy aggregate parity tests until the migration is complete.

**Organization**: Tasks are grouped by user story so each analyzer slice can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files and has no dependency on incomplete tasks.
- **[Story]**: User story label from [spec.md](./spec.md).
- Every task includes an exact repository path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the shared analyzer pipeline scaffolding and test fixtures without changing report behavior yet.

- [X] T001 Create shared analyzer result and availability types only in `src/analysis/types.ts`
- [X] T002 Create analyzer registry and canonical input orchestration skeleton in `src/analysis/pipeline.ts`
- [X] T003 [P] Create deterministic analyzer sort helpers in `src/analysis/sort.ts`
- [X] T004 [P] Create reusable analyzer fixture builders in `test/helpers/analyzer-fixtures.js`
- [X] T005 [P] Add analyzer pipeline contract smoke tests in `test/analyzer-pipeline.test.js`
- [X] T006 Update public analysis exports for new pipeline entry points in `src/index.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish canonical-only boundaries, legacy parity protection, and shared caveat handling before user-story analyzers are split out.

**Critical**: No analyzer story work should begin until these tasks are complete.

- [X] T007 Add shared analyzer caveat helpers and local-attribution caveat text in `src/analysis/caveats.ts`
- [X] T008 Implement canonical event validation and grouping in `src/analysis/run-data.ts`
- [X] T009 Add legacy aggregate parity fixture coverage for current summary totals in `test/aggregate.test.js`
- [X] T010 Add architecture-boundary assertions for new `src/analysis/*.ts` modules in `test/architecture-boundaries.test.js`
- [X] T011 Wire canonical run-data preparation into the analyzer pipeline in `src/analysis/pipeline.ts`

**Checkpoint**: Analyzer scaffolding is available, canonical-only boundaries are protected, and legacy behavior is covered before extraction begins.

---

## Phase 3: User Story 1 - Understand Exposure And Replay (Priority: P1)

**Goal**: A user can understand total, unique, and repeated context exposure plus top contributors from canonical artifact records.

**Independent Test**: Run exposure analyzer fixtures with repeated hashes, changed content under the same identity, multiple requests, and metadata-only records; verify exposure totals, replay ratio, context efficiency, artifact counts, request counts, and deterministic contributor ordering.

### Tests for User Story 1

- [X] T012 [P] [US1] Add repeated-content and changed-content exposure tests in `test/exposure-analyzer.test.js`
- [X] T013 [P] [US1] Add deterministic top-contributor ordering tests in `test/exposure-analyzer.test.js`
- [X] T014 [P] [US1] Add metadata-only exposure baseline tests in `test/exposure-analyzer.test.js`

### Implementation for User Story 1

- [X] T015 [US1] Implement exposure metrics and artifact aggregate derivation in `src/analysis/exposure.ts`
- [X] T016 [US1] Implement top contributor and replay hotspot row generation in `src/analysis/exposure.ts`
- [X] T017 [US1] Wire the exposure analyzer into the registry in `src/analysis/pipeline.ts`
- [X] T018 [US1] Preserve legacy exposure fields through a compatibility adapter in `src/analysis/aggregate.ts`
- [X] T019 [US1] Run `npm test -- test/exposure-analyzer.test.js test/aggregate.test.js` and fix exposure parity issues in `src/analysis/exposure.ts`

**Checkpoint**: User Story 1 works independently through the analyzer pipeline and legacy aggregate summary values still match.

---

## Phase 4: User Story 2 - Understand Cache And Burn Attribution (Priority: P1)

**Goal**: A user can compare provider-reported usage totals with local artifact-level estimates, including attribution coverage and proportional coordinate normalization.

**Independent Test**: Run cache attribution fixtures for exact match, under-attribution, overlong-coordinate normalization, missing usage, and missing offsets; verify provider totals stay separate from estimated artifact attribution and caveats are emitted.

### Tests for User Story 2

- [X] T020 [P] [US2] Add exact-match and under-attributed cache attribution tests in `test/cache-attribution.test.js`
- [X] T021 [P] [US2] Add overlong reconstructed coordinate normalization tests in `test/cache-attribution.test.js`
- [X] T022 [P] [US2] Add missing usage and missing offset availability tests in `test/cache-attribution.test.js`
- [X] T023 [P] [US2] Add attribution caveat rendering expectations in `test/cache-attribution.test.js`

### Implementation for User Story 2

- [X] T024 [US2] Extract provider usage total aggregation into `src/analysis/cache-attribution.ts`
- [X] T025 [US2] Extract cached and uncached artifact allocation into `src/analysis/cache-attribution.ts`
- [X] T026 [US2] Preserve proportional overlong-coordinate scaling behavior in `src/analysis/cache-attribution.ts`
- [X] T027 [US2] Add request-level attribution availability states in `src/analysis/cache-attribution.ts`
- [X] T028 [US2] Wire the cache-attribution analyzer into `src/analysis/pipeline.ts`
- [X] T029 [US2] Preserve legacy prompt-cache fields through the compatibility adapter in `src/analysis/aggregate.ts`
- [X] T030 [US2] Run `npm test -- test/cache-attribution.test.js test/aggregate.test.js` and fix cache attribution parity issues in `src/analysis/cache-attribution.ts`

**Checkpoint**: User Story 2 works independently through the analyzer pipeline and legacy cache/cost-driver values still match.

---

## Phase 5: User Story 3 - Separate Context Clutter From Useful Persistence (Priority: P2)

**Goal**: A user can distinguish repeated exposure, continuous persistence, reintroduced replay, uncertain cases, and possible clutter without treating all replay as waste.

**Independent Test**: Run persistence fixtures with continuous artifacts, disappearing/reappearing artifacts, high-replay opaque artifacts, and useful persistence evidence; verify classifications and evidence strings.

### Tests for User Story 3

- [X] T031 [P] [US3] Add continuous and reintroduced persistence tests in `test/persistence-analyzer.test.js`
- [X] T032 [P] [US3] Add uncertain and possible clutter classification tests in `test/persistence-analyzer.test.js`
- [X] T033 [P] [US3] Add missing ordering partial-availability tests in `test/persistence-analyzer.test.js`

### Implementation for User Story 3

- [X] T034 [US3] Implement first-seen, last-seen, span, inclusion, and gap metrics in `src/analysis/persistence.ts`
- [X] T035 [US3] Implement continuous, reintroduced, and uncertain persistence classifications in `src/analysis/persistence.ts`
- [X] T036 [US3] Implement possible clutter classification over exposure, persistence, and uncached evidence in `src/analysis/context-clutter.ts`
- [X] T037 [US3] Wire persistence and context-clutter analyzers into `src/analysis/pipeline.ts`
- [X] T038 [US3] Preserve legacy context bloat and replay hotspot outputs through the compatibility adapter in `src/analysis/aggregate.ts`
- [X] T039 [US3] Run `npm test -- test/persistence-analyzer.test.js test/aggregate.test.js` and fix persistence/clutter parity issues in `src/analysis/persistence.ts`

**Checkpoint**: User Story 3 works independently and repeated context is reported with persistence context rather than a blanket waste label.

---

## Phase 6: User Story 4 - Reuse Analyzer Results Across Surfaces (Priority: P2)

**Goal**: CLI reports, HTML reports, and future exports can consume one analyzer result shape with matching totals, ordering, caveats, and availability states.

**Independent Test**: Analyze one fixture run and render CLI plus structured analyzer output; verify headline totals, top contributor ordering, attribution caveats, and partial/unavailable states match.

### Tests for User Story 4

- [X] T040 [P] [US4] Add CLI summary parity tests against analyzer results in `test/analyzer-pipeline.test.js`
- [X] T041 [P] [US4] Add structured analyzer result contract tests in `test/analyzer-pipeline.test.js`
- [X] T042 [P] [US4] Add partial/unavailable surface behavior tests in `test/analyzer-pipeline.test.js`

### Implementation for User Story 4

- [X] T043 [US4] Add combined `RunAnalysisSummary` construction in `src/analysis/pipeline.ts`
- [X] T044 [US4] Move text report rendering behind the CLI surface in `src/surfaces/cli/report-renderer.ts`
- [X] T045 [US4] Update CLI report orchestration to call the analyzer pipeline in `src/surfaces/cli/report-commands.ts`
- [X] T046 [US4] Move HTML report rendering into a surface-owned module in `src/surfaces/html-report.ts`
- [X] T047 [US4] Add analyzer result export helper in `src/analysis/pipeline.ts`
- [X] T048 [US4] Run `npm test -- test/analyzer-pipeline.test.js test/aggregate.test.js` and fix surface parity issues in `src/surfaces/cli/report-renderer.ts`

**Checkpoint**: User Story 4 works independently and surfaces no longer need to recompute analyzer metrics.

---

## Phase 7: Cleanup & Cross-Cutting Concerns

**Purpose**: Remove duplicate legacy analyzer logic, update validation docs, and run the full quality gate.

- [X] T049 Replace remaining direct imports of `aggregateEvents` with analyzer pipeline imports in `src/surfaces/cli/report-commands.ts`
- [X] T050 Replace remaining direct imports of `aggregateEvents` with analyzer pipeline imports in `src/index.js`
- [X] T051 Rename or replace legacy aggregate parity tests with analyzer-specific tests in `test/aggregate.test.js`
- [X] T052 Delete retired legacy aggregate implementation from `src/analysis/aggregate.ts` after all callers have migrated
- [X] T053 Update architecture-boundary expectations for retired `aggregate.ts` in `test/architecture-boundaries.test.js`
- [X] T054 Delete or replace root-level text renderer compatibility file `src/report.js` after CLI imports move to `src/surfaces/cli/report-renderer.ts`
- [X] T055 Delete or replace root-level HTML renderer compatibility file `src/html-report.js` after imports move to `src/surfaces/html-report.ts`
- [X] T056 [P] Update analyzer validation notes in `specs/003-analyzer-pipeline/quickstart.md`
- [X] T057 Run `npm run typecheck` and fix type errors in `src/analysis/types.ts`
- [X] T058 Run `npm test` and fix regressions in changed analyzer or surface files

**Checkpoint**: Duplicate analyzer logic is removed, `src/analysis/aggregate.ts` is retired, and the feature passes typecheck plus the full test suite.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no prerequisites beyond the existing repo.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user stories.
- **Phase 3: US1 Exposure and Replay** depends on Phase 2.
- **Phase 4: US2 Cache and Burn Attribution** depends on Phase 2 and can run alongside US1 after shared types are stable, but final aggregate parity is easier after US1.
- **Phase 5: US3 Persistence and Clutter** depends on US1 exposure outputs and Phase 2.
- **Phase 6: US4 Surface Reuse** depends on US1 and US2 for headline parity, and should consume US3 outputs when present.
- **Phase 7: Cleanup** depends on all selected user stories, especially US4 surface migration.

### User Story Dependencies

- **US1 (P1)**: Core MVP analyzer metrics. No other story dependency after foundation.
- **US2 (P1)**: Core attribution metrics. No user-story dependency after foundation, but shares artifact aggregates with US1.
- **US3 (P2)**: Uses exposure and attribution evidence, so it should follow US1 and preferably US2.
- **US4 (P2)**: Depends on analyzer outputs from US1 and US2; includes US3 where implemented.

### Cleanup Dependency

`src/analysis/aggregate.ts` is a temporary migration source only. Do not keep duplicate analyzer logic in both `aggregate.ts` and the new modules after US4 passes. Cleanup tasks T049-T053 explicitly retire that file after callers and parity tests move to the analyzer pipeline.

Top-level surface renderers are also temporary during this feature. Cleanup tasks T054-T055 remove or replace `src/report.js` and `src/html-report.js` once rendering lives under `src/surfaces/*`.

---

## Parallel Execution Examples

### Setup

```text
Task: "Create deterministic analyzer sort helpers in src/analysis/sort.ts"
Task: "Create reusable analyzer fixture builders in test/helpers/analyzer-fixtures.js"
Task: "Add analyzer pipeline contract smoke tests in test/analyzer-pipeline.test.js"
```

### User Story 1

```text
Task: "Add repeated-content and changed-content exposure tests in test/exposure-analyzer.test.js"
Task: "Add deterministic top-contributor ordering tests in test/exposure-analyzer.test.js"
Task: "Add metadata-only exposure baseline tests in test/exposure-analyzer.test.js"
```

### User Story 2

```text
Task: "Add exact-match and under-attributed cache attribution tests in test/cache-attribution.test.js"
Task: "Add overlong reconstructed coordinate normalization tests in test/cache-attribution.test.js"
Task: "Add missing usage and missing offset availability tests in test/cache-attribution.test.js"
```

### User Story 3

```text
Task: "Add continuous and reintroduced persistence tests in test/persistence-analyzer.test.js"
Task: "Add uncertain and possible clutter classification tests in test/persistence-analyzer.test.js"
Task: "Add missing ordering partial-availability tests in test/persistence-analyzer.test.js"
```

### User Story 4

```text
Task: "Add CLI summary parity tests against analyzer results in test/analyzer-pipeline.test.js"
Task: "Add structured analyzer result contract tests in test/analyzer-pipeline.test.js"
Task: "Add partial/unavailable surface behavior tests in test/analyzer-pipeline.test.js"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 exposure/replay.
3. Validate with `npm test -- test/exposure-analyzer.test.js test/aggregate.test.js`.
4. Stop and review analyzer result shape before extracting cache attribution.

### Preserve Behavior While Splitting

1. Add tests for the current behavior before extraction.
2. Move one metric axis at a time into a focused analyzer module.
3. Keep `aggregate.ts` as a temporary compatibility adapter only while callers migrate.
4. Delete `aggregate.ts` after US4 and cleanup tasks prove no caller depends on it.

### Full Delivery

1. Deliver US1 and US2 as the core analyzer MVP.
2. Add US3 for persistence and clutter interpretation.
3. Add US4 to migrate surfaces to analyzer results.
4. Run Phase 7 cleanup and validation.

## Notes

- Each task is scoped to one or a small set of exact files.
- Tests marked `[P]` can be written before implementation and should fail first when practical.
- Keep provider-specific data out of `src/analysis/*`.
- Keep local artifact attribution caveats visible wherever estimated cache or burn values are rendered.
