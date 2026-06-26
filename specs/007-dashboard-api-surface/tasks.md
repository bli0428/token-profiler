# Tasks: Dashboard API Surface

**Input**: Design documents from `/specs/007-dashboard-api-surface/`
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/dashboard-api-contract.md`, `research.md`, `quickstart.md`

## Phase 1: Setup

- [X] T001 Verify Node/TypeScript ignore patterns in `.gitignore`
- [X] T002 Create dashboard API source directory in `src/surfaces/dashboard-api/`

## Phase 2: Foundational

- [X] T003 Define versioned dashboard API response and error types in `src/surfaces/dashboard-api/types.ts`
- [X] T004 Implement structured envelope and error helpers in `src/surfaces/dashboard-api/errors.ts`
- [X] T005 Implement dashboard-safe response builders in `src/surfaces/dashboard-api/responses.ts`

## Phase 3: User Story 1 - Open A Local Dashboard API (P1)

**Independent Test**: Start or invoke the local API, request status and sessions, and verify local-only/read-only metadata plus safe recent session summaries.

- [X] T006 [P] [US1] Add status and sessions API contract tests in `test/dashboard-api.test.js`
- [X] T007 [US1] Implement status and sessions route handling in `src/surfaces/dashboard-api/routes.ts`
- [X] T008 [US1] Implement local HTTP server lifecycle in `src/surfaces/dashboard-api/server.ts`
- [X] T009 [US1] Add `dashboard-api serve` CLI dispatch in `src/surfaces/cli/index.ts`
- [X] T010 [US1] Document `dashboard-api serve` in CLI help text in `src/surfaces/cli/utils.ts`

## Phase 4: User Story 2 - Inspect One Run Through The API (P1)

**Independent Test**: Request a fixture run and one artifact through the API and verify analyzer-derived overview, rows, task groups, details, structured errors, and privacy-safe payloads.

- [X] T011 [P] [US2] Add run view, artifact detail, and not-found API tests in `test/dashboard-api.test.js`
- [X] T012 [P] [US2] Add metadata-only privacy leak tests in `test/dashboard-api-privacy.test.js`
- [X] T013 [US2] Implement run view response building in `src/surfaces/dashboard-api/responses.ts`
- [X] T014 [US2] Implement artifact detail lookup by full or short stable ID in `src/surfaces/dashboard-api/responses.ts`
- [X] T015 [US2] Wire run and artifact routes with structured errors in `src/surfaces/dashboard-api/routes.ts`

## Phase 5: User Story 3 - Keep API Boundaries Clean (P2)

**Independent Test**: Boundary checks prove dashboard API modules consume canonical store/analyzer/dashboard-safe model code and avoid adapters/frontend imports.

- [X] T016 [US3] Extend architecture boundary checks for dashboard API modules in `test/architecture-boundaries.test.js`

## Phase 6: User Story 4 - Refresh Data While Working (P2)

**Independent Test**: Update fixture run data between API requests and verify new sessions and updated run metrics appear without restarting the API.

- [X] T017 [P] [US4] Add request-time freshness tests in `test/dashboard-api-freshness.test.js`
- [X] T018 [US4] Ensure route handlers read local storage on every sessions/run request in `src/surfaces/dashboard-api/responses.ts`

## Final Phase: Polish & Validation

- [X] T019 Run `npm run typecheck`
- [X] T020 Run `npm test`

## Dependencies

- Phase 1 and Phase 2 block all user stories.
- User Story 1 and User Story 2 are both MVP/P1 work and can be validated independently after foundational API helpers exist.
- User Story 3 depends on API module files existing.
- User Story 4 depends on route and response builders from User Story 1 and User Story 2.

## Parallel Examples

- T006, T011, T012, and T017 are test files that can be drafted independently.
- T003 and T004 touch separate foundational files and can be implemented independently after the API directory exists.

## Implementation Strategy

Deliver the P1 API contract first: status, sessions, run view, artifact detail, structured errors, CLI serve command. Then add boundary and freshness validation.
