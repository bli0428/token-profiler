# Data Model: Large Run Artifact Pages

## Selected-Request Artifact Row

One returned row maps one canonical artifact event whose `request_id` exactly matches the route's selected request.

| Field | Source | Rules |
|---|---|---|
| `artifact_id` | Canonical artifact event | Required canonical identity. |
| `artifact_type` | Canonical artifact event | Required canonical category; never a provider payload type. |
| `display_name` | Canonical artifact identity through dashboard privacy mapping | A privacy-safe display label; no content/preview body is included. |
| `local_token_count` | Canonical artifact event | Non-negative local token contribution. |
| `request_order` | Canonical `artifact_index`, or analyzer page-order fallback | Deterministic selected-request inclusion order. |
| `preview_state` | Canonical storage mode via surface privacy mapping | `hidden`, `preview`, or `raw_available`; describes availability only. |

## Artifact Page

| Field | Meaning | Validation |
|---|---|---|
| `request_id` | Request selected by the route | Exactly equals the decoded route parameter. |
| `items` | Consecutive matching artifact rows | Length is at least 0 and no greater than the accepted limit; every row belongs to `request_id`. |
| `next_cursor` | Opaque continuation token | Omitted if no additional matching artifact exists; clients must not decode it. |

## Opaque Cursor (surface-private)

The API may encode `offset`, `run_id`, `request_id`, and source modification marker. It is not a client data model. A decoded token requires a non-negative integer offset and exact run/request/source match; malformed, cross-bound, or stale cursors yield `invalid_request`.

## Relationships And Lifecycle

```text
canonical artifact events --(request_id filter)--> bounded ordered artifact page --(surface cursor)--> optional continuation
```

The source is checked before each page. A source-file change invalidates an existing cursor. Malformed complete JSONL or invalid canonical records make the run unreadable; no partial successful page is returned.

## Explicit Exclusions

Run-wide artifact aggregation, artifact content, preview text, raw provider payloads, artifact detail composition, cache attribution, and browser-side artifact reconstruction are not modeled here.

