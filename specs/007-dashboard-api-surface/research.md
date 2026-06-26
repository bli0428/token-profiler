# Research: Dashboard API Surface

## Decision: Use a local read-only HTTP API as the frontend boundary

**Rationale**: The dashboard frontend should behave like an external client. HTTP JSON gives a clean boundary between the main project and the isolated dashboard app, prevents frontend imports from project internals, and supports live refresh without static HTML regeneration.

**Alternatives considered**:

- Static HTML generation only: simple, but does not support an app that stays open and refreshes while Codex runs.
- Direct frontend imports from `src/`: convenient during development, but tightly couples the dashboard to analyzers, store, and CLI modules.
- WebSocket-first API: useful later for live updates, but polling is sufficient for the first local read-only version.

## Decision: Use Node built-in HTTP for the first API server

**Rationale**: The project already runs on Node and has no web framework dependency. The required API is small: status, sessions, run, artifact detail, and structured errors. Built-in HTTP keeps dependencies low and the surface easy to remove or replace.

**Alternatives considered**:

- Add a web framework: clearer routing ergonomics, but unnecessary runtime dependency for the first API contract.
- Reuse the Codex proxy server: rejected because the model proxy and dashboard API have different lifecycles, ports, and responsibilities.

## Decision: Keep dashboard API separate from dashboard frontend

**Rationale**: The top-level dashboard app should know only the HTTP contract. Keeping the API under `src/surfaces/dashboard-api/` and the app under `dashboard/` allows the CLI/core and frontend to evolve independently.

**Alternatives considered**:

- Put frontend and API in one folder: simpler navigation, but encourages direct imports and blurs ownership.
- Put API in the top-level dashboard project: rejected because the API adapts internal analyzer/store data and belongs to the main project surface layer.

## Decision: Reuse dashboard-safe model transformation initially

**Rationale**: `src/surfaces/dashboard/model.ts` already converts analyzer summaries into privacy-safe dashboard records. The API should reuse or move that behavior rather than create a parallel model. Static rendering code remains temporary and cleanup belongs to spec 009.

**Alternatives considered**:

- Duplicate response mapping in the API: faster locally, but risks two dashboard contracts diverging.
- Move all dashboard code in this feature: rejected because API setup should stay focused; static-renderer cleanup is a separate spec.

## Decision: Refresh data on request rather than caching by default

**Rationale**: The first API should reflect new sessions and run updates without a cache invalidation layer. Local runs are file-backed and the expected scale is manageable for request-time reads.

**Alternatives considered**:

- Persistent API cache: faster for very large runs, but introduces invalidation and stale-data complexity.
- File watchers: useful later, but request-time reads satisfy the live refresh requirement when the frontend polls.

## Decision: Version every successful response

**Rationale**: The isolated frontend needs a stable contract and a way to detect unsupported response shapes as the API evolves.

**Alternatives considered**:

- Implicit version through package version: less explicit and harder for clients to validate at runtime.
- Version only the status response: insufficient because cached client state may consume run/detail responses independently.
