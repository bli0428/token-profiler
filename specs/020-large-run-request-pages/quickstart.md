# Quickstart: Validate Large Run Request Pages

## Prerequisites

- Node.js 18+ and the repository dependencies installed.
- A local run directory containing `events.jsonl` canonical records, or the temporary fixtures created by the tests.

## Focused validation

From the repository root:

```sh
node --import tsx --test test/large-run-store.test.js test/large-run-analyzer.test.js test/large-run-dashboard-api.test.js
npm run typecheck
```

If dashboard client types or rendering change:

```sh
npm --prefix dashboard run typecheck
npm --prefix dashboard test -- large-run-explorer.test.tsx
```

## End-to-end scenario

1. Request `GET /api/runs/{run_id}/large/requests?limit=1` for a local large run.
2. Confirm the envelope contains one newest request row and, when another request exists, a `next_cursor`.
3. Request the same route with the returned cursor. Confirm its row differs from the first while retaining descending chronology.
4. Reuse that cursor for another run, or alter it, and confirm a `400 invalid_request` response.
5. Confirm rows contain only the fields in the [API contract](./contracts/large-run-request-pages-api.md), including canonical usage/turn facts when captured; no artifact detail or provider payload appears.

## Expected result

The page is bounded by the requested limit, deterministic while the event source is unchanged, and produced without materializing the run-wide artifact history.

## Validation evidence

On 2026-07-24, the focused large-run suite passed (7 tests), the root suite
passed (144 tests), and the dashboard suite passed (69 tests). Root and
dashboard TypeScript checks both passed. The root proxy integration tests need
permission to bind temporary local `127.0.0.1` servers.
