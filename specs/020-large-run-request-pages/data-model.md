# Data Model: Large Run Request Pages

## Compact Request Projection

One row is retained for every canonical `request_id` observed during a large-run scan.

| Field | Source | Rules |
|---|---|---|
| `request_id` | Canonical event | Required identity and deterministic final tie-breaker. |
| `timestamp` | Canonical event | Latest observed request timestamp; omitted if no canonical timestamp is available. |
| `turn_id` | Canonical request-turn identity | Optional canonical identifier; no source-specific metadata is retained. |
| `usage` | Canonical request-usage event | Optional provider-reported token totals; fields retain canonical names. |
| `artifact_count` | Canonical artifact event | Count only; no artifact objects/content retained. |
| `total_local_artifact_tokens` | Canonical artifact event | Sum of local token counts for explainability. |

Rows sort newest-first by `timestamp`, then descending `request_id` for stable tie resolution.

## Request Page

| Field | Meaning | Validation |
|---|---|---|
| `items` | Consecutive compact request rows | Length is at least 0 and no greater than the validated limit. |
| `next_cursor` | Opaque continuation token | Omitted when no more rows exist; clients must not decode it. |

## Opaque Cursor (surface-private)

The API may encode an offset plus `run_id` and source modification marker. This is intentionally not a client data model. On decode it must have a non-negative integer offset; when present, the run/source binding must match the requested run. Invalid or stale bindings yield `invalid_request`.

## Relationships And Lifecycle

```text
canonical events -> compact request projection -> ordered request page -> optional next cursor
```

A source-file change invalidates existing cursors. Malformed complete JSONL or invalid canonical events make the run unreadable; no partial successful page is returned.

## Explicit Exclusions

Artifact rows, artifact content/previews, raw provider payloads, and request-artifact pagination are not modeled here.
