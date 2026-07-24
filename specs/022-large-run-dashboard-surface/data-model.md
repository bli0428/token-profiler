# Data Model: Large Run Dashboard Surface

## Surface State

| State | Source | Rules |
|---|---|---|
| `run` | `GET /api/runs/{run_id}/large` response | Contains only the overview and one bounded request page. Reset when `run_id` or client changes. |
| `artifacts` | Selected-request artifact-page response | Contains rows for exactly one selected request. Reset on run change; replace when another request or continuation page succeeds. |
| `error` | Failed large-run request | Safe user-facing failure text; no API payload/content is rendered. |

## Transport Views

### Large-run overview and request page

| Field | Display use | Ownership |
|---|---|---|
| `overview.request_count`, `artifact_count`, `input_tokens`, `event_file_bytes` | Page scope/context | Dashboard API |
| `request_page.items[]` | Current bounded request table | Dashboard API |
| `request_page.next_cursor` | Enable explicit request continuation | Dashboard API; opaque to browser |
| Request `request_id`, usage, and artifact count | Request row identity and explainability | Dashboard API |

### Selected-request artifact page

| Field | Display use | Ownership |
|---|---|---|
| `request_id` | Selected-request heading and continuation route | Dashboard API |
| `items[]` | Artifact identity/type/token/order/privacy availability | Dashboard API |
| `next_cursor` | Enable explicit artifact continuation | Dashboard API; opaque to browser |

## State Transitions

```text
selected large-run session
  -> load overview/request page
  -> [Next requests] replace visible request page
  -> [Artifacts for request] load selected artifact page
  -> [Next artifacts] replace visible artifact page

select another run -> clear prior overview, artifact page, and error -> load its first page
```

Only user actions cause continuation fetches. A page cursor travels unchanged
from response to matching client method; it is not persisted, parsed, or
constructed by the UI.

## Exclusions

No client model holds provider payloads, canonical JSONL events, content or
preview bodies, run-wide artifact history, inferred task grouping, or inferred
privacy state.
