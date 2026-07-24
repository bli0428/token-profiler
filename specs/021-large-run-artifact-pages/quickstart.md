# Quickstart: Validate Large Run Artifact Pages

## Prerequisites

- Node.js 18+ and repository dependencies installed.
- A local run directory containing canonical `events.jsonl`, or the temporary fixtures created by the tests.

## Focused validation

From the repository root:

```sh
node --import tsx --test test/large-run-store.test.js test/large-run-analyzer.test.js test/large-run-dashboard-api.test.js
npm run typecheck
```

For the dashboard client/explorer:

```sh
npm --prefix dashboard run typecheck
npm --prefix dashboard test -- large-run-explorer.test.tsx api-client.test.ts
```

## End-to-end scenario

1. Create a local run with interleaved artifact events for at least two requests and one request containing more than one page of artifacts.
2. Request `GET /api/runs/{run_id}/large/requests/{request_id}/artifacts?limit=1`.
3. Confirm the envelope has one row belonging to `request_id`, with canonical type/token/order and a privacy state but no content or preview body.
4. Follow `next_cursor` on the same route. Confirm the next row is distinct and retains selected-request order.
5. Reuse the cursor against another run or request, alter it, or change `events.jsonl`; confirm `400 invalid_request`.
6. Select metadata-only, preview, and raw fixture artifacts. Confirm their `preview_state` is respectively `hidden`, `preview`, and `raw_available`, while no response includes stored content.
7. In the large-run explorer, select a request, load artifacts, and use its next-page control. Confirm the UI sends only the returned cursor and replaces/appends according to the documented paging interaction.

## Expected result

An investigator can inspect bounded, privacy-safe artifact pages for exactly one request without loading run-wide artifact detail or content.

## Validation evidence

On 2026-07-24, the focused large-run root suite passed (6 tests), the root
TypeScript check passed, and the dashboard artifact/client suite passed (9
tests) along with its TypeScript check.
