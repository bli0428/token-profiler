# Large Run Dashboard API Contract

All endpoints are local, read-only, and return the existing API envelope.

## `GET /api/runs/{run_id}/large`

Returns `{ run_id, mode: "paged", overview, request_page }`. `request_page` contains at most 50 newest-first request rows and optional `next_cursor`.

## `GET /api/runs/{run_id}/large/requests?cursor=&limit=`

Returns a request page. `limit` is 1–200 and defaults to 50. A cursor is opaque and valid only for the same run and ordering.

## Invariants

- Large-run endpoints stream source JSONL and do not call `readEventsFromRunDir`.
- Pages are bounded by requested limit.
- Invalid cursors return `invalid_request` (400).
- Malformed canonical records return `run_unreadable` (422).
- Request artifact drilldown is not exposed by this feature; it is planned separately so the initial large-run path can retain only request-level state.
