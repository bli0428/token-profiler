# Tasks: Source Adapters And Capture Boundaries

**Input**: Design documents from `/specs/002-source-adapters-capture/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/source-adapter-contract.md, quickstart.md

**Tests**: Included because this feature is an architecture migration and requires regression guards.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation.

## Phase 1: Setup

**Purpose**: Establish the feature context and architecture guardrails.

- [X] T001 Update architecture-boundary expectations for legacy top-level capture modules in test/architecture-boundaries.test.js
- [X] T002 [P] Add source adapter seam contract fixture expectations in test/source-adapter-seam.test.js

---

## Phase 2: Foundational

**Purpose**: Move source-agnostic capture writing into core before source-specific migrations.

- [X] T003 Create canonical capture writer module in src/core/capture/index.ts from src/profiler.js behavior
- [X] T004 Move token counting helper from src/tokenizer.js to src/core/tokenization/index.ts
- [X] T005 Move hash helper from src/hash.js to src/core/hash/index.ts
- [X] T006 Update src/core/events/index.ts and core capture imports to use src/core/hash/index.ts and src/core/tokenization/index.ts
- [X] T007 Remove src/profiler.js, src/tokenizer.js, and src/hash.js after moving behavior to canonical modules
- [X] T008 Update tests that import capture writer/tokenization/hash behavior to pass through the new core modules or thin wrappers

---

## Phase 3: User Story 1 - Capture Codex Activity Without Changing The Session (Priority: P1)

**Goal**: Live Codex proxy behavior remains stable while Codex-specific implementation lives under the Codex adapter.

**Independent Test**: `node --import tsx --test test/proxy.test.js`

- [X] T009 [US1] Move Codex session routing from src/session-router.js into src/adapters/codex/live-proxy/session-router.ts
- [X] T010 [US1] Move Codex config mutation from src/codex-config.js into src/adapters/codex/live-proxy/config.ts
- [X] T011 [US1] Update src/adapters/codex/live-proxy/server.ts and src/surfaces/cli/proxy-commands.ts imports to use domain-owned Codex proxy modules
- [X] T012 [US1] Remove src/session-router.js and src/codex-config.js after moving behavior to the Codex adapter
- [X] T013 [US1] Validate live proxy, config, compressed body, and session routing tests in test/proxy.test.js and test/session-router.test.js

---

## Phase 4: User Story 2 - Import Local Logs With Completeness Notes (Priority: P1)

**Goal**: Codex log import and Codex session metadata reading live under the Codex log import adapter; CLI only orchestrates.

**Independent Test**: `node --import tsx --test test/codex-sessions.test.js`

- [X] T014 [US2] Create src/adapters/codex/log-import/index.ts for Codex rollout import and session metadata reading
- [X] T015 [US2] Move readCodexSessionMetadata and enrichProfilerSessions from src/codex-sessions.js into src/adapters/codex/log-import/index.ts
- [X] T016 [US2] Move runCodexImport parsing behavior out of src/surfaces/cli/capture-commands.ts into src/adapters/codex/log-import/index.ts
- [X] T017 [US2] Update src/surfaces/cli/capture-commands.ts and src/surfaces/cli/report-commands.ts to delegate to src/adapters/codex/log-import/index.ts
- [X] T018 [US2] Remove src/codex-sessions.js after moving behavior to the Codex adapter
- [X] T019 [US2] Add or update Codex log import tests for valid usage import and skipped unsupported entries in test/codex-sessions.test.js

---

## Phase 5: User Story 3 - Preserve A Future Claude Code Adapter Seam (Priority: P2)

**Goal**: Prove a future non-Codex adapter can emit canonical records and limitations without changing Codex modules or analyzers.

**Independent Test**: `node --import tsx --test test/source-adapter-seam.test.js`

- [X] T020 [US3] Create fixture-only source adapter in src/adapters/fixture-source/index.ts
- [X] T021 [US3] Implement fixture-source canonical artifact, usage, and limitation emission through src/core/capture/index.ts
- [X] T022 [US3] Add test coverage proving fixture-source output aggregates without Codex imports in test/source-adapter-seam.test.js

---

## Phase 6: User Story 4 - Add Provider-Compatible Sources Safely (Priority: P2)

**Goal**: The adapter contract and architecture tests prevent source-specific payloads from leaking into analyzers.

**Independent Test**: `node --import tsx --test test/architecture-boundaries.test.js test/source-adapter-seam.test.js`

- [X] T023 [US4] Add architecture-boundary checks that analysis modules do not import any src/adapters source module in test/architecture-boundaries.test.js
- [X] T024 [US4] Add architecture-boundary checks that source-root compatibility modules do not exist in test/architecture-boundaries.test.js
- [X] T025 [US4] Document allowed source adapter exports in src/adapters/fixture-source/index.ts and src/adapters/codex/live-proxy/index.ts

---

## Phase 7: User Story 5 - Retire Legacy Capture Modules Into Domains (Priority: P2)

**Goal**: Source root no longer contains mixed-responsibility capture/import/config/session implementations.

**Independent Test**: `node --import tsx --test test/architecture-boundaries.test.js`

- [X] T026 [US5] Ensure src/profiler.js, src/session-router.js, src/codex-config.js, src/codex-sessions.js, src/hash.js, and src/tokenizer.js are removed
- [X] T027 [US5] Update src/index.js exports to point at domain-owned modules while preserving public API names
- [X] T028 [US5] Search for remaining imports of moved implementation modules and replace with domain-owned imports

---

## Final Phase: Polish & Cross-Cutting

**Purpose**: Validate the migration and update generated task status.

- [X] T029 Run npm run typecheck
- [X] T030 Run npm test
- [X] T031 Update specs/002-source-adapters-capture/quickstart.md if validation commands or expected outcomes changed

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 Setup has no dependencies.
- Phase 2 Foundational depends on Phase 1 and blocks user stories.
- US1 and US2 depend on Phase 2.
- US3 depends on Phase 2 and should not modify Codex modules.
- US4 depends on US3.
- US5 depends on US1, US2, and US4.
- Final polish depends on all selected user stories.

### User Story Dependencies

- **US1**: Depends on core capture writer migration.
- **US2**: Depends on core capture writer migration.
- **US3**: Depends on core capture writer migration only.
- **US4**: Depends on source seam test and architecture-boundary structure.
- **US5**: Depends on source-specific migrations being complete.

### Parallel Opportunities

- T002 can run alongside T001.
- US1 and US2 can be implemented independently after Phase 2, except final import cleanup should happen after both.
- US3 can be implemented after Phase 2 without touching Codex files.

## Implementation Strategy

1. Build core capture/token/hash ownership first.
2. Move Codex live proxy support into `src/adapters/codex/live-proxy/`.
3. Move Codex log import support into `src/adapters/codex/log-import/`.
4. Add fixture-only future-source seam.
5. Tighten architecture tests and remove legacy implementation from source root.
