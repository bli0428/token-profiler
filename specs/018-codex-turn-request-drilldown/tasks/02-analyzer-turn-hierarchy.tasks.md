# Tasks: Analyzer Turn Hierarchy

**Input**: [02-analyzer-turn-hierarchy.md](../sub-specs/02-analyzer-turn-hierarchy.md), [data-model.md](../data-model.md), [canonical-turn-facts.md](../contracts/canonical-turn-facts.md)

**Boundary**: Analyzer-owned hierarchy and title derivation only. Do not parse Codex payloads, do not infer turn identity from artifacts, and do not render React UI here.

## Phase 1: Setup

- [ ] T001 Review request accounting shape in `src/analysis/types.ts`
- [ ] T002 Review legibility preview and privacy helpers in `src/analysis/legibility.ts`
- [ ] T003 Review current task grouping heuristics in `src/analysis/task-groups.ts`

## Phase 2: Tests

- [ ] T004 [P] Add analyzer fixture with two direct turn ids and multiple requests in `test/fixtures/events/turn-hierarchy.jsonl`
- [ ] T005 [P] Add analyzer fixture for metadata-only turn grouping in `test/fixtures/events/turn-hierarchy-metadata.jsonl`
- [ ] T006 Add dashboard model test for `turns -> requests -> artifacts` grouping in `test/dashboard-model.test.js`
- [ ] T007 Add dashboard model test for request title preference from assistant preview in `test/dashboard-model.test.js`
- [ ] T008 Add dashboard model test for missing-turn fallback grouping in `test/dashboard-model.test.js`

## Phase 3: Implementation

- [ ] T009 Add analyzer-owned `TurnGroup` and `TurnRequest` types in `src/analysis/types.ts`
- [ ] T010 Add turn hierarchy builder that consumes canonical request-level turn facts in `src/analysis/turn-groups.ts`
- [ ] T011 Add deterministic turn title selection from user previews in `src/analysis/turn-groups.ts`
- [ ] T012 Add deterministic request title selection from assistant previews and action labels in `src/analysis/turn-groups.ts`
- [ ] T013 Add fallback grouping and caveats for missing turn identity in `src/analysis/turn-groups.ts`
- [ ] T014 Integrate turn hierarchy output into run analysis summary in `src/analysis/index.ts`
- [ ] T015 Map request accounting and artifact detail references into turn groups without creating a competing request-first hierarchy in `src/analysis/turn-groups.ts`

## Phase 4: Validation

- [ ] T016 Run `node --import tsx --test test/dashboard-model.test.js`
- [ ] T017 Run `node --import tsx --test test/legibility.test.js test/dashboard-privacy.test.js`
- [ ] T018 Run `npm run typecheck`

## Dependencies

- Requires capture/canonical task T008 or equivalent canonical fields before final integration.
- T004-T008 should be written before T009-T015.
- T016-T018 validate this workstream independently.

## Checkpoint

Analysis produces stable turn groups from canonical request-level turn facts, with privacy-aware turn titles, request titles, request references, artifact references, and explicit fallback states.
