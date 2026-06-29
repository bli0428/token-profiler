# Contract: Session Dashboard Grouping

## Scope

This contract documents what the dashboard surface consumes for Codex-session grouping. It is not a Codex provider payload schema and not an adapter contract.

## `GET /api/sessions`

The dashboard expects each session row to expose normalized identity metadata:

```ts
type DashboardSession = {
  run_id: string;
  canonical_run_id?: string;
  label?: string;
  identity: DashboardSessionIdentityMapping;
  updated_at?: string;
  request_count?: number;
  artifact_count?: number;
  input_tokens?: number;
  cached_input_tokens?: number;
  uncached_input_tokens?: number;
  output_tokens?: number;
  availability: AvailabilityState;
  caveats: DashboardCaveat[];
};

type DashboardSessionIdentityMapping = {
  route_run_id: string;
  canonical_run_id?: string;
  codex_session_id?: string;
  codex_conversation_id?: string;
  codex_label?: string;
  mapping_confidence: "one_to_one" | "probable" | "best_effort" | "unknown";
  mapping_source:
    | "direct_session_id"
    | "cache_key"
    | "wrapper_header"
    | "rollout_time_index"
    | "fallback_fingerprint"
    | "unavailable";
  limitations: string[];
};
```

### Dashboard Interpretation

- `mapping_confidence: "one_to_one"` with `mapping_source: "direct_session_id"` is displayed as Codex-session grouped.
- `mapping_source: "cache_key"` is displayed as fallback/cache grouped and must retain limitations text.
- `mapping_source: "fallback_fingerprint"` or `mapping_confidence: "best_effort"` is displayed as fallback grouped.
- `mapping_source: "unavailable"` or `mapping_confidence: "unknown"` is displayed as identity unavailable.
- The dashboard uses `run_id` as the selection and route handle.

## `GET /api/runs/{run_id}`

Selecting a session row fetches the run detail by the selected row's `run_id`.

```ts
type DashboardRun = {
  run_id: string;
  canonical_run_id?: string;
  requests: DashboardRequestAccounting;
  // existing overview, artifacts, task groups, filters, privacy, caveats omitted
};
```

### Dashboard Interpretation

- The request list displays `requests.rows` from the selected run response.
- The dashboard must not merge, split, or filter request rows by prompt cache key, raw Codex payloads, headers, or labels.
- Privacy fields on request artifact inclusions continue to control content display.

## Non-Goals

- Historical migration/backfill for older cache-key grouped traffic.
- Browser-side Codex payload schema parsing.
- New API endpoint shape for session grouping.
