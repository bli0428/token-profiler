# Tasks: Capture And Canonical Turn Identity

**Input**: [01-capture-canonical-turn-id.md](../sub-specs/01-capture-canonical-turn-id.md), [canonical-turn-facts.md](../contracts/canonical-turn-facts.md), [plan.md](../plan.md)

**Boundary**: Codex adapter and canonical request event/store contracts only. Do not add analyzer grouping or dashboard rendering here.

## Phase 1: Setup

- [X] T001 Review current Codex turn metadata parsing in `src/adapters/codex/live-proxy/codex-envelope.ts`
- [X] T002 Review current canonical event contracts in `src/core/events/types.ts`
- [X] T003 Review current session routing result shape in `src/adapters/codex/live-proxy/session-router.ts`
- [X] T004 Review current request artifact and usage recording paths in `src/adapters/codex/live-proxy/recording.ts`

## Phase 2: Tests

- [X] T005 [P] Add Codex turn metadata fixture coverage for direct `turn_id` in `test/session-router.test.js`
- [X] T006 [P] Add canonical request event fixture expectations for request-level turn identity in `test/fixtures/events/turn-identity.jsonl`
- [X] T007 Add root test coverage proving missing turn identity is explicit and not fallback-derived in `test/session-router.test.js`

## Phase 3: Implementation

- [X] T008 Add an owned provider-neutral request turn identity event/type in `src/core/events/types.ts`
- [X] T009 Add canonical event creation support for request turn identity facts in `src/core/events/index.ts`
- [X] T010 Map Codex `turn_id` and optional turn start time to canonical fields in `src/adapters/codex/live-proxy/codex-envelope.ts`
- [X] T011 Extend the session routing result to carry provider-neutral turn identity alongside session identity in `src/adapters/codex/live-proxy/session-router.ts`
- [X] T012 Thread resolved turn identity into request-level recording in `src/adapters/codex/live-proxy/recording.ts`
- [X] T013 Persist a request-level turn identity event for each new proxied request without making artifact events authoritative for turn grouping in `src/adapters/codex/live-proxy/recording.ts`
- [X] T014 Ensure malformed or absent turn metadata produces explicit missing/malformed state without inventing fallback ids in `src/adapters/codex/live-proxy/codex-envelope.ts`

## Phase 4: Validation

- [X] T015 Run `node --import tsx --test test/session-router.test.js`
- [X] T016 Run `npm run typecheck`
- [X] T017 Document any capture restart requirement in `specs/018-codex-turn-request-drilldown/quickstart.md`

## Dependencies

- T001-T004 before implementation.
- T005-T007 should be written before T008-T014.
- T015-T016 validate this workstream independently.

## Checkpoint

New captured Codex requests produce a provider-neutral canonical request-level turn fact, and missing turn identity is explicit.
