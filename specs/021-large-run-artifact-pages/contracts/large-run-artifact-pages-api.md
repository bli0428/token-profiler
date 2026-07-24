# Large Run Artifact Pages API Contract

All endpoints are local, read-only, and use the existing dashboard API envelope.

## `GET /api/runs/{run_id}/large/requests/{request_id}/artifacts?cursor=&limit=`

Returns one deterministic page of canonical artifacts included by the selected request in a large run.

- `cursor` is optional for the first page and opaque thereafter.
- `limit` is optional, defaults to `50`, and must be an integer from `1` through `500`.
- A cursor is valid only for the same run, request, and source-file version that created it.

### Success shape

```ts
type LargeRunArtifactPage = {
  request_id: string;
  items: Array<{
    artifact_id: string;
    artifact_type: string;
    display_name: string;
    local_token_count: number;
    request_order: number;
    preview_state: "hidden" | "preview" | "raw_available";
  }>;
  next_cursor?: string;
};
```

`preview_state` describes storage/privacy availability only. This endpoint never includes preview or raw content, regardless of state.

### Errors

| Condition | Status | Error code | Message requirement |
|---|---:|---|---|
| Malformed, non-base64, negative, cross-run, cross-request, or source-stale cursor | 400 | `invalid_request` | Clearly identify an invalid page cursor. |
| Invalid `limit` | 400 | `invalid_request` | Clearly identify an invalid page limit. |
| Missing route/run | existing API behavior | existing error | Preserve standard route/run semantics. |
| Invalid complete JSONL or invalid canonical record | 422 | `run_unreadable` | Provide a safe reason without source payload or content. |

## Invariants

- Returned item count never exceeds the accepted limit.
- Every returned row has the selected `request_id` in its canonical source event; no artifact from another request appears.
- Adjacent valid pages have no duplicated selected-request inclusion and retain canonical artifact order while the source is unchanged.
- Returned fields originate only from canonical artifact facts, API-generated pagination metadata, or the existing privacy-safe display mapping.
- The endpoint streams via the canonical store and must not call the full-file `readEventsFromRunDir` path, materialize run-wide artifact history, invoke the full-detail analyzer, or expose provider payloads/content.
- The dashboard client forwards `next_cursor` unchanged and must not decode or construct cursors.

