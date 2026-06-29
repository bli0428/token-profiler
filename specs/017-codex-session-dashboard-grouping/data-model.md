# Data Model: Codex Session Dashboard Grouping

## DashboardSessionGroup

Selectable dashboard row representing one grouped session returned by the dashboard API.

**Fields consumed**
- `run_id`: stable dashboard selection handle and run endpoint key.
- `label`: display title supplied by the API when available.
- `identity`: normalized grouping metadata.
- `updated_at`: row recency display.
- `request_count`, `artifact_count`: session scale indicators.
- `input_tokens`, `cached_input_tokens`, `uncached_input_tokens`, `output_tokens`: existing token totals.
- `availability`, `caveats`: existing completeness and warning metadata.

**Validation rules**
- Selection must use `run_id`, not label, prompt cache key, or browser-derived identity.
- A row with `identity.mapping_confidence === "one_to_one"` and `identity.mapping_source === "direct_session_id"` is treated as Codex-session grouped.
- Fallback rows remain visible but must not be labeled as true Codex-session grouped.

## SessionGroupingLabel

User-facing label derived from normalized session identity.

**Fields consumed**
- `identity.mapping_confidence`
- `identity.mapping_source`
- `identity.codex_session_id`
- `identity.limitations`

**Validation rules**
- Direct Codex-session rows show a concise Codex-session grouped label.
- Cache-key, fallback-fingerprint, unavailable, and unknown rows show fallback/partial labels.
- Internal enum values are not the primary visible text.
- Limitations remain visible for fallback rows.

## GroupedRequestList

Request-first detail data for the selected session row.

**Fields consumed**
- `DashboardRun.run_id`
- `DashboardRun.requests.rows`
- Existing request row token metrics, availability, artifact inclusions, privacy state, and caveats.

**Validation rules**
- The dashboard fetches run details using the selected `DashboardSessionGroup.run_id`.
- Request rows shown in the center pane are the rows returned for that selected run.
- Browser code does not filter requests by provider metadata, cache key, or raw Codex payload fields.

## SessionSelectionState

Surface state that tracks the selected session and drilldown controls.

**Fields consumed**
- `selectedRunId`
- `selectedArtifactId`
- `expandedRequestIds`
- Existing refresh mode fields.

**Validation rules**
- `selectedRunId` is reconciled against current session `run_id` values.
- Changing the selected session resets stale drilldown state according to existing view-state behavior.
- Distinct Codex sessions remain independently selectable even if visible labels or cache hints overlap.
