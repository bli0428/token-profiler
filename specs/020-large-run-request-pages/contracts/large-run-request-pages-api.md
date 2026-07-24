# Large Run Request Pages API Contract

All endpoints are local, read-only, and use the existing dashboard API envelope.

## `GET /api/runs/{run_id}/large/requests?cursor=&limit=`

Returns a single newest-first request page for the specified large run.

- `cursor` is optional for the first page and opaque thereafter.
- `limit` is optional, defaults to `50`, and must be an integer from `1` through `500`.
- A cursor is valid only for the run and source-file version that created it.

### Success shape

```ts
type LargeRunRequestPage = {
  items: Array<{
    request_id: string;
    timestamp?: string;
    turn_id?: string;
    chronology_index: number;
    artifact_count: number;
    total_local_artifact_tokens: number;
    usage?: {
      input_tokens: number;
      cached_input_tokens: number;
      uncached_input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
  }>;
  next_cursor?: string;
};
```

`chronology_index` is response metadata for the ordered projection, not a cursor format or stable database key.

### Errors

| Condition | Status | Error code | Message requirement |
|---|---:|---|---|
| Malformed, non-base64, negative, cross-run, or source-stale cursor | 400 | `invalid_request` | Clearly identify an invalid page cursor. |
| Invalid `limit` | 400 | `invalid_request` | Clearly identify an invalid page limit. |
| Missing route/run | existing API behavior | existing error | Preserve standard route/run semantics. |
| Invalid complete JSONL or invalid canonical record | 422 | `run_unreadable` | Provide a safe reason without source payload content. |

## Invariants

- Returned item count never exceeds the accepted limit.
- Adjacent pages have no duplicate `request_id` values and retain the same newest-first order while their cursor is valid.
- Returned fields originate only from canonical records or API-generated pagination metadata.
- The endpoint must not call the full-file `readEventsFromRunDir` path, emit artifact history, or expose provider payloads.
- The dashboard client forwards `next_cursor` unchanged and must not decode or construct cursors.
