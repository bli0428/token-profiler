# Research: Current Dashboard Surface Cleanup

## Decision: Move dashboard-safe model/session code into the API surface

**Rationale**: The dashboard API still needs `createDashboardViewModel` and `createDashboardSessionIndex`, but those modules adapt analyzer outputs into privacy-safe API-facing records and are not a standalone dashboard surface. Owning them under `src/surfaces/dashboard-api/` removes the misleading `src/surfaces/dashboard/` package without duplicating behavior.

**Alternatives considered**:

- Delete all of `src/surfaces/dashboard/` without moving behavior: rejected because it would break the dashboard API and discard useful privacy-safe mapping.
- Keep model code under `src/surfaces/dashboard/`: rejected because it preserves a misleading surface boundary after the React app and API split.

## Decision: Remove embedded static browser renderer modules

**Rationale**: `assets.ts` and `render.ts` contain embedded CSS/JS/HTML strings for the old static dashboard. The isolated dashboard app now owns browser UI code, styling, and interactivity.

**Alternatives considered**:

- Keep static renderer as a deprecated fallback: rejected because it preserves the wrong architecture and stale UI behavior.
- Redirect static renderer to the Vite build output: rejected because root source must not depend on `dashboard/src` or frontend build artifacts.

## Decision: Remove old static `html` and `dashboard` CLI workflows

**Rationale**: These commands generate static dashboard HTML and session index files. The supported dashboard workflow is now `dashboard-api serve` plus the isolated app.

**Alternatives considered**:

- Keep commands with warnings: rejected because command help would continue advertising obsolete paths.
- Automatically start the frontend from root CLI: rejected because dashboard validation and dependencies are owned by the dashboard package.

## Decision: Keep non-dashboard report commands intact

**Rationale**: `summarize`, `legibility`, `explain`, `sessions`, proxy, capture, and import workflows are not obsolete static dashboard rendering. They should continue to work and pass tests.

**Alternatives considered**:

- Broad CLI refactor: rejected because cleanup should be tightly scoped.

## Decision: Replace renderer tests with cleanup/boundary assertions

**Rationale**: Tests that assert embedded HTML/CSS/JS markers should be removed with the renderer. Privacy and session behavior stays covered by model/API tests, while new cleanup tests prove stale commands/modules are not exposed.

**Alternatives considered**:

- Rewrite renderer tests against the React app from root tests: rejected because root tests must not own or compile `dashboard/src`.
