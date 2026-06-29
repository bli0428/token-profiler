# Tasks: Codex Session Routing

**Input**: Design documents from `/specs/016-codex-session-routing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/session-routing.md, quickstart.md

**Tests**: Capture changes require tests for routing precedence, privacy-safe metadata, and request-shape validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm active feature context and dependency state.

- [x] T001 Verify `zod` dependency is declared in package.json and package-lock.json
- [x] T002 Confirm `.specify/feature.json` points to `specs/016-codex-session-routing`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish adapter-owned observed request parsing before story work.

**CRITICAL**: No user story work can be considered complete until the Codex request boundary is explicit and tested.

- [x] T003 Implement observed Codex request body/header/client_metadata schemas in src/adapters/codex/live-proxy/codex-envelope.ts
- [x] T004 Implement safe Codex request normalization with body summaries and observed-key diagnostics in src/adapters/codex/live-proxy/codex-envelope.ts
- [x] T005 [P] Document the source-backed request envelope in docs/codex-request-envelope.md

**Checkpoint**: Observed request shape is modeled at the adapter boundary.

---

## Phase 3: User Story 1 - New Traffic Groups By Codex Session (Priority: P1) MVP

**Goal**: New live Codex requests with the same Codex session identity resolve to one local session group, and different Codex sessions resolve separately.

**Independent Test**: Send representative request objects through the session router and verify Codex session identity wins over provider cache hints.

### Tests for User Story 1

- [x] T006 [US1] Add same-session and different-session routing tests in test/session-router.test.js
- [x] T007 [US1] Add Codex session identity beats prompt_cache_key test in test/session-router.test.js

### Implementation for User Story 1

- [x] T008 [US1] Implement Codex session route precedence in src/adapters/codex/live-proxy/codex-envelope.ts
- [x] T009 [US1] Integrate Codex session route before provider fallbacks in src/adapters/codex/live-proxy/session-router.ts

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Identity Resolution Is Explainable (Priority: P1)

**Goal**: Captured request artifacts carry a safe routing source that explains whether Codex identity or fallback routing determined grouping.

**Independent Test**: Resolve requests with full turn metadata, compatibility identity, and fallback-only hints, then verify the resulting session source is specific and safe.

### Tests for User Story 2

- [x] T010 [US2] Add tests for turn metadata, compatibility header, and fallback routing sources in test/session-router.test.js

### Implementation for User Story 2

- [x] T011 [US2] Return distinct machine-readable routing sources from src/adapters/codex/live-proxy/codex-envelope.ts
- [x] T012 [US2] Preserve session_source artifact metadata through src/adapters/codex/live-proxy/server.ts and src/adapters/codex/live-proxy/recording.ts

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Observed Request Shape Remains Auditable (Priority: P2)

**Goal**: The adapter contract makes the whole ingested Codex request shape visible, including body fields, input item shapes, tools, metadata, headers, and diagnostics.

**Independent Test**: Parse representative request bodies and verify known shapes are accepted, malformed known shapes are rejected, and unknown top-level body fields are diagnostic only.

### Tests for User Story 3

- [x] T013 [US3] Add full Responses request body shape test in test/session-router.test.js
- [x] T014 [US3] Add malformed known-field validation tests in test/session-router.test.js

### Implementation for User Story 3

- [x] T015 [US3] Model Codex input item and tool definition shapes in src/adapters/codex/live-proxy/codex-envelope.ts
- [x] T016 [US3] Expose safe body diagnostics such as input item types and tool names in src/adapters/codex/live-proxy/codex-envelope.ts
- [x] T017 [P] [US3] Update docs/codex-request-envelope.md with validation and privacy boundaries

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the feature end-to-end and ensure documentation stays aligned.

- [x] T018 Run `npm run typecheck`
- [x] T019 Run `node --import tsx --test test/session-router.test.js`
- [x] T020 Run `npm test`
- [x] T021 Review specs/016-codex-session-routing/quickstart.md against implemented behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational; can be validated after route sources exist.
- **User Story 3 (Phase 5)**: Depends on Foundational; can be implemented in parallel with story-specific tests if files are coordinated.
- **Polish (Phase 6)**: Depends on desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: MVP and primary routing behavior.
- **User Story 2 (P1)**: Uses routing decisions from US1 but can be validated independently with source assertions.
- **User Story 3 (P2)**: Audits request parsing and diagnostics; supports long-term maintainability.

### Parallel Opportunities

- T005 can run after T003-T004 are drafted because it writes documentation.
- T017 can run in parallel with US3 tests once the request shape is known.
- T018 and T019 are independent validation commands after implementation; T020 follows for full regression coverage.

## Parallel Example: User Story 3

```bash
Task: "Add full Responses request body shape test in test/session-router.test.js"
Task: "Update docs/codex-request-envelope.md with validation and privacy boundaries"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational request-envelope parsing.
2. Implement Codex session route precedence and router integration.
3. Validate same-session, different-session, and cache-key precedence tests.

### Incremental Delivery

1. Deliver US1 routing.
2. Add US2 route-source explainability.
3. Add US3 request-shape auditability.
4. Run full validation.

### Notes

- Provider-specific payloads must stay in the Codex adapter.
- Do not add migration/backfill tasks for historical runs.
- Do not add dashboard rendering work; that belongs to spec 017.
