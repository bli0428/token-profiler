# Tasks: Dashboard Surface

**Input**: [04-dashboard-surface.md](../sub-specs/04-dashboard-surface.md), [turn-drilldown-dashboard.md](../contracts/turn-drilldown-dashboard.md), [quickstart.md](../quickstart.md)

**Boundary**: Frontend rendering and interaction only. Do not parse provider payloads, do not reconstruct turn grouping from raw artifacts, and do not maintain a parallel request-first drilldown for compatibility.

## Phase 1: Setup

- [ ] T001 Review run explorer composition in `dashboard/src/run-explorer/RunExplorer.tsx`
- [ ] T002 Review current request list rendering in `dashboard/src/run-explorer/RequestList.tsx`
- [ ] T003 Review current request row artifact expansion in `dashboard/src/run-explorer/RequestRow.tsx`
- [ ] T004 Review run explorer styling in `dashboard/src/styles/run-explorer.css`

## Phase 2: Tests

- [ ] T005 Rename request-first run explorer tests to turn-drilldown vocabulary in `dashboard/src/test/turn-drilldown-dashboard.test.tsx`
- [ ] T006 [P] Add dashboard UI test for rendering turns as top-level rows in `dashboard/src/test/turn-drilldown-dashboard.test.tsx`
- [ ] T007 [P] Add dashboard UI test for expanding a turn into request rows in `dashboard/src/test/turn-drilldown-dashboard.test.tsx`
- [ ] T008 Add dashboard UI test for assistant-preview request titles in `dashboard/src/test/turn-drilldown-dashboard.test.tsx`
- [ ] T009 Add dashboard UI test for expanding a request into artifact details under a turn in `dashboard/src/test/turn-drilldown-dashboard.test.tsx`
- [ ] T010 Add dashboard UI test for missing-turn fallback labeling in `dashboard/src/test/turn-drilldown-dashboard.test.tsx`

## Phase 3: Implementation

- [ ] T011 Add turn list rendering component in `dashboard/src/run-explorer/TurnList.tsx`
- [ ] T012 Add turn row rendering component in `dashboard/src/run-explorer/TurnRow.tsx`
- [ ] T013 Update `RunExplorer` to render API-provided `turns` as the primary run-detail drilldown in `dashboard/src/run-explorer/RunExplorer.tsx`
- [ ] T014 Update request expansion state to nest under turn rows in `dashboard/src/run-explorer/RunExplorer.tsx`
- [ ] T015 Reuse existing request artifact expansion rendering under turn request rows in `dashboard/src/run-explorer/RequestRow.tsx`
- [ ] T016 Remove browser-side title inference that duplicates analyzer/API title selection in `dashboard/src/run-explorer/RequestRow.tsx`
- [ ] T017 Add styles for dense turn/request nesting and fallback labels in `dashboard/src/styles/run-explorer.css`

## Phase 4: Validation

- [ ] T018 Run `cd dashboard && npm test -- src/test/turn-drilldown-dashboard.test.tsx`
- [ ] T019 Run `cd dashboard && npm run typecheck`
- [ ] T020 Manually verify the dashboard can expand `turns -> requests -> artifacts` using the quickstart flow in `specs/018-codex-turn-request-drilldown/quickstart.md`

## Dependencies

- Requires dashboard API task T014 or equivalent frontend API types before implementation.
- T005-T010 should be written before T011-T017.
- T018-T020 validate this workstream independently.

## Checkpoint

The dashboard renders API-provided turns as the primary drilldown layer, request children with assistant-preview titles, artifact expansion below requests, and explicit fallback states.
