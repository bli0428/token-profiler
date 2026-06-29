# Tasks: Dashboard API Turn Drilldown Contract

**Input**: [03-dashboard-api-contract.md](../sub-specs/03-dashboard-api-contract.md), [turn-drilldown-dashboard.md](../contracts/turn-drilldown-dashboard.md), [data-model.md](../data-model.md)

**Boundary**: Dashboard API/view-model contract only. Do not implement React rendering, do not derive analyzer logic here, and do not preserve a request-first hierarchy solely for compatibility.

## Phase 1: Setup

- [X] T001 Review dashboard API view-model mapping in `src/surfaces/dashboard-api/view-model.ts`
- [X] T002 Review dashboard API view-model types in `src/surfaces/dashboard-api/view-model-types.ts`
- [X] T003 Review dashboard response serialization in `src/surfaces/dashboard-api/responses.ts`
- [X] T004 Review frontend API mirror types in `dashboard/src/api/types.ts`

## Phase 2: Tests

- [X] T005 [P] Add API contract test for run detail `turns` collection in `test/dashboard-api-request-accounting.test.js`
- [X] T006 [P] Add dashboard model test for turn request title sources in `test/dashboard-model.test.js`
- [X] T007 Add API contract test proving `artifact_details` remains keyed by artifact id in `test/dashboard-api-request-accounting.test.js`
- [X] T008 Add API contract test proving fallback turn grouping is labeled in `test/dashboard-api-request-accounting.test.js`

## Phase 3: Implementation

- [X] T009 Add `DashboardViewTurnGroup` and `DashboardViewTurnRequest` owned types in `src/surfaces/dashboard-api/view-model-types.ts`
- [X] T010 Map analyzer turn groups into dashboard view-model `turns` in `src/surfaces/dashboard-api/view-model.ts`
- [X] T011 Explicitly map request child fields by name in `src/surfaces/dashboard-api/view-model.ts`
- [X] T012 Map request metrics needed by turn children explicitly from analyzer output in `src/surfaces/dashboard-api/view-model.ts`
- [X] T013 Serialize `turns` through dashboard API responses in `src/surfaces/dashboard-api/responses.ts`
- [X] T014 Add matching frontend API types for `turns` in `dashboard/src/api/types.ts`

## Phase 4: Validation

- [X] T015 Run `node --import tsx --test test/dashboard-api-request-accounting.test.js test/dashboard-model.test.js`
- [X] T016 Run `npm run typecheck`
- [X] T017 Run `cd dashboard && npm run typecheck`

## Dependencies

- Requires analyzer task T009 or equivalent turn hierarchy types before final mapping.
- T005-T008 should be written before T009-T014.
- T015-T017 validate this workstream independently.

## Checkpoint

The dashboard API exposes `turns` as the primary run-detail hierarchy with stable ids, display titles, title sources, grouping sources, request children, artifact references, privacy, and caveats.
