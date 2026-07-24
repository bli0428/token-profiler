# Tasks: Large Run Explorer

## Phase 1: Streaming foundation

- [ ] T001 Add streaming JSONL parsing and line-aware errors in src/core/store/index.ts
- [ ] T002 Add streaming reader tests in test/large-run-store.test.js
- [ ] T003 Update Core README and contract for streaming store support in src/core/README.md and src/core/contract.md

## Phase 2: Analyzer projection

- [ ] T004 Add a bounded-memory large-run request projection in src/analysis/large-run.ts
- [ ] T005 Export and document large-run analyzer APIs in src/analysis/index.ts, src/analysis/README.md, and src/analysis/contract.md
- [ ] T006 Add projection tests in test/large-run-analyzer.test.js

## Phase 3: Large-run API

- [ ] T007 Add large-run dashboard API response builders in src/surfaces/dashboard-api/large-runs.ts
- [ ] T008 Add large-run API routes and types in src/surfaces/dashboard-api/routes.ts and src/surfaces/dashboard-api/types.ts
- [ ] T009 Use bounded summaries for large sessions in src/surfaces/dashboard-api/sessions.ts
- [ ] T010 Add API tests in test/large-run-dashboard-api.test.js
- [ ] T011 Update dashboard API README and contract in src/surfaces/dashboard-api/README.md and src/surfaces/dashboard-api/contract.md

## Phase 4: Dashboard surface

- [ ] T012 Add large-run API types and client functions in dashboard/src/api/types.ts and dashboard/src/api/client.ts
- [ ] T013 Render paged requests and their overview metrics in dashboard/src/run-explorer/LargeRunExplorer.tsx
- [ ] T014 Integrate large-run mode in dashboard/src/run-explorer/RunExplorer.tsx and dashboard/src/shell/DashboardController.tsx
- [ ] T015 Add dashboard rendering tests in dashboard/src/test/large-run-explorer.test.tsx

## Phase 5: Validation

- [ ] T016 Run root and dashboard typechecks and tests; update quickstart evidence in specs/019-large-run-explorer/quickstart.md
