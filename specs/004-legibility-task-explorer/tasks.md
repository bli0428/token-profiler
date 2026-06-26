# Tasks: Legibility And Task Explorer

**Input**: Design documents from `/specs/004-legibility-task-explorer/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included because the specification defines independent tests for each user story and privacy behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the current analyzer/reporting baseline before feature work.

- [X] T001 Run the existing baseline test suite with `npm test` and record any pre-existing failures in specs/004-legibility-task-explorer/tasks.md
- [X] T002 Run the existing typecheck with `npm run typecheck` and record any pre-existing failures in specs/004-legibility-task-explorer/tasks.md
- [X] T003 [P] Review current legibility formatter responsibilities in src/analysis/legibility.ts against specs/004-legibility-task-explorer/contracts/legibility-task-contract.md
- [X] T004 [P] Review analyzer orchestration and legacy adapter points in src/analysis/pipeline.ts against specs/004-legibility-task-explorer/plan.md

Baseline note: `npm run typecheck` passed. `npm test` had 46 passing tests and 3 pre-existing proxy test failures in `test/proxy.test.js` because the workspace sandbox denied `listen` on `127.0.0.1` with `EPERM`; rerun with elevated permissions during final validation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, caveats, fixtures, and deterministic helpers required by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Add shared ReadableArtifact, ToolCallLink, ArtifactDetail, TaskGroup, and legibility result types in src/analysis/types.ts
- [X] T006 Add shared caveat codes and messages for metadata missing, privacy hidden, unmatched tool links, inferred tool links, legacy records, heuristic task groups, and estimated attribution in src/analysis/caveats.ts
- [X] T007 Add deterministic stable short ID, specificity comparison, and legibility tie-breaking helpers in src/analysis/sort.ts
- [X] T008 [P] Create fixture events for command calls, linked command outputs, patch calls, messages, unknown artifacts, and mixed-version metadata in test/fixtures/events/legibility-work-units.jsonl
- [X] T009 [P] Create fixture events for multi-prompt task grouping and cross-group artifact persistence in test/fixtures/events/task-groups.jsonl
- [X] T010 [P] Create fixture events for metadata-only, preview, and raw privacy behavior in test/fixtures/events/legibility-privacy.jsonl

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Readable Work Unit Labels (Priority: P1) MVP

**Goal**: Replace opaque high-exposure artifact labels with readable command, output, patch, message, file/context, or unknown work-unit labels while preserving stable IDs.

**Independent Test**: Run a fixture containing supported and unknown artifacts through the legibility report and verify readable labels, stable IDs, caveats, and deterministic ordering.

### Tests for User Story 1

- [X] T011 [P] [US1] Add readable label and category tests for command, command output, patch, message, file/context, and unknown artifacts in test/legibility.test.js
- [X] T012 [P] [US1] Add mixed-version richer-metadata-wins and deterministic ordering tests in test/legibility.test.js

### Implementation for User Story 1

- [X] T013 [US1] Implement readable artifact row derivation from canonical artifact metadata and exposure aggregates in src/analysis/legibility.ts
- [X] T014 [US1] Implement tool call/output linking with exact, inferred, unmatched_call, and unmatched_output states in src/analysis/legibility.ts
- [X] T015 [US1] Integrate legibility analyzer output into analyzeEvents results in src/analysis/pipeline.ts
- [X] T016 [US1] Update legibility CLI rendering to consume legibility analyzer rows without recomputing labels in src/analysis/legibility.ts
- [X] T017 [US1] Update runLegibility to pass the full analyzer summary instead of legacy-only aggregate data in src/surfaces/cli/report-commands.ts

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Artifact Drilldown (Priority: P1)

**Goal**: Provide artifact detail records that explain identity, command/patch facts, inclusion history, exposure, persistence, attribution state, privacy state, and caveats.

**Independent Test**: Run artifact detail on command output, patch, message, and unknown fixture artifacts and verify each detail view includes available facts without requiring raw content.

### Tests for User Story 2

- [X] T018 [P] [US2] Add artifact detail tests for command output, patch, message, and unknown artifacts in test/legibility.test.js
- [X] T019 [P] [US2] Add estimated attribution caveat tests for artifact detail output in test/legibility.test.js

### Implementation for User Story 2

- [X] T020 [US2] Implement ArtifactDetail construction from readable artifacts, tool links, exposure, persistence, and cache attribution facts in src/analysis/legibility.ts
- [X] T021 [US2] Add artifact detail lookup by stable ID and readable label match in src/analysis/legibility.ts
- [X] T022 [US2] Update explain CLI rendering to consume ArtifactDetail records and preserve stable identity in src/analysis/legibility.ts
- [X] T023 [US2] Update runExplain to pass the full analyzer summary instead of legacy-only aggregate data in src/surfaces/cli/report-commands.ts

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Task And Story Grouping (Priority: P2)

**Goal**: Summarize long sessions as chronological task groups with safe labels, confidence, request ranges, artifact membership, top artifacts, rollup metrics, and caveats.

**Independent Test**: Load a multi-prompt fixture and verify deterministic task groups, group metrics, cross-group artifact membership, and visible heuristic/partial states.

### Tests for User Story 3

- [X] T024 [P] [US3] Add task grouping tests for multi-prompt sessions, request ranges, and deterministic ordering in test/task-groups.test.js
- [X] T025 [P] [US3] Add task rollup tests for exposure, repeated exposure, input, cached input, uncached input, output, and top artifacts in test/task-groups.test.js
- [X] T026 [P] [US3] Add cross-group persistence and heuristic confidence tests in test/task-groups.test.js

### Implementation for User Story 3

- [X] T027 [US3] Implement task group derivation over ordered requests, readable artifacts, tool links, and analyzer metrics in src/analysis/task-groups.ts
- [X] T028 [US3] Implement task group safe labeling, label source, confidence, and caveat assignment in src/analysis/task-groups.ts
- [X] T029 [US3] Integrate task-groups analyzer output into analyzeEvents results in src/analysis/pipeline.ts
- [X] T030 [US3] Add task group summary rendering for CLI summary output in src/surfaces/cli/report-renderer.ts
- [X] T031 [US3] Add task group details to JSON analyzer export coverage in test/analyzer-pipeline.test.js

**Checkpoint**: User Story 3 is independently functional and can be validated with task-group fixtures.

---

## Phase 6: User Story 4 - Privacy-Aware Legibility (Priority: P2)

**Goal**: Ensure labels, previews, details, and task names respect metadata-only, preview, and raw-content storage modes.

**Independent Test**: Run equivalent fixtures across privacy modes and verify raw prompts, raw tool output, and raw file contents are hidden unless explicitly permitted.

### Tests for User Story 4

- [X] T032 [P] [US4] Add metadata-only privacy tests for labels, details, and task group names in test/privacy.test.js
- [X] T033 [P] [US4] Add preview and raw-content permission tests for artifact detail output in test/privacy.test.js
- [X] T034 [P] [US4] Add hidden versus unavailable caveat tests in test/privacy.test.js

### Implementation for User Story 4

- [X] T035 [US4] Implement preview_state and hidden_fields derivation for readable artifacts and artifact details in src/analysis/legibility.ts
- [X] T036 [US4] Apply privacy-safe task group labeling and prompt-hidden caveats in src/analysis/task-groups.ts
- [X] T037 [US4] Ensure CLI legibility, explain, and summary render hidden/unavailable privacy states without raw text leakage in src/analysis/legibility.ts and src/surfaces/cli/report-renderer.ts

**Checkpoint**: User Story 4 is independently functional across metadata-only, preview, and raw-content fixtures.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate architecture boundaries, documentation, and end-to-end behavior.

- [X] T038 [P] Add architecture boundary assertions for legibility and task-group analyzer imports in test/architecture-boundaries.test.js
- [X] T039 [P] Update public analyzer export documentation for legibility and task grouping in README.md
- [X] T040 [P] Update spec implementation notes or follow-up gaps in specs/004-legibility-task-explorer/quickstart.md
- [X] T041 Run quickstart validation commands from specs/004-legibility-task-explorer/quickstart.md
- [X] T042 Run `npm test` and `npm run typecheck` from package.json before marking the feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational and can be developed alongside US1 after shared types exist, but final CLI detail rendering should align with US1 readable rows.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1 readable artifacts/tool links for richer group labels.
- **User Story 4 (Phase 6)**: Depends on Foundational and should be validated against outputs from US1, US2, and US3.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 Readable Work Unit Labels**: MVP. No dependency on other user stories after Foundational.
- **US2 Artifact Drilldown**: Uses the same readable artifact and tool-link foundations as US1.
- **US3 Task And Story Grouping**: Uses readable artifacts and tool links for useful group summaries, but grouping logic remains independently testable.
- **US4 Privacy-Aware Legibility**: Cross-cuts labels, details, and task groups; validate after each story surface is wired.

### Parallel Opportunities

- T003 and T004 can run in parallel.
- T008, T009, and T010 can run in parallel.
- Tests for each user story marked [P] can be written in parallel.
- US3 task grouping implementation can proceed in `src/analysis/task-groups.ts` while US1/US2 work continues in `src/analysis/legibility.ts`, after shared types are complete.
- Polish documentation and boundary tests marked [P] can run in parallel after story implementation stabilizes.

---

## Parallel Example: User Story 1

```text
Task: "T011 [P] [US1] Add readable label and category tests for command, command output, patch, message, file/context, and unknown artifacts in test/legibility.test.js"
Task: "T012 [P] [US1] Add mixed-version richer-metadata-wins and deterministic ordering tests in test/legibility.test.js"
```

## Parallel Example: User Story 3

```text
Task: "T024 [P] [US3] Add task grouping tests for multi-prompt sessions, request ranges, and deterministic ordering in test/task-groups.test.js"
Task: "T025 [P] [US3] Add task rollup tests for exposure, repeated exposure, input, cached input, uncached input, output, and top artifacts in test/task-groups.test.js"
Task: "T026 [P] [US3] Add cross-group persistence and heuristic confidence tests in test/task-groups.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate `node src/cli.js legibility <fixture-run-dir>`.
5. Stop and confirm readable labels replace opaque IDs for supported artifacts.

### Incremental Delivery

1. Deliver US1 readable labels.
2. Add US2 artifact drilldown.
3. Add US3 task grouping.
4. Add US4 privacy hardening across all legibility surfaces.
5. Finish boundary checks, docs, quickstart, tests, and typecheck.

### Validation Gates

- Every analyzer output must consume canonical records or other analyzer results only.
- Metadata-only fixtures must pass without raw prompt/output content.
- Estimated artifact-level cache or uncached values must show attribution caveats.
- Re-running the same fixture must produce deterministic labels, task groups, and ordering.
