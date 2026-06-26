# Data Model: Dashboard API Surface

## DashboardApiEnvelope

Wraps every successful API response.

**Fields**:

- `schema_version`: API response schema version.
- `generated_at`: Response generation timestamp.
- `data`: Response-specific payload.
- `caveats`: Global caveats for the response.

**Validation rules**:

- `schema_version` is required on every successful response.
- `generated_at` is required and must be parseable as a timestamp.
- `data` must not include hidden raw content.

## DashboardApiStatus

Represents service status for browser clients.

**Fields**:

- `service`: Stable service name.
- `ready`: Whether the API can serve dashboard data.
- `read_only`: Whether the API is read-only.
- `local_only`: Whether the API is bound for local use.
- `data_root_label`: Safe label for the local profiler data root.
- `schema_version`: Current API response version.
- `capabilities`: Supported resource types and refresh mode.

**Validation rules**:

- Status must not expose secrets, auth headers, provider payloads, or raw run content.
- Status should remain available even when no sessions exist.

## DashboardApiSession

Represents one available local profiler run in API responses.

**Fields**:

- `run_id`: Stable run identifier.
- `label`: Safe display label.
- `updated_at`: Last known run update timestamp.
- `request_count`: Request count when available.
- `artifact_count`: Artifact row count when available.
- `input_tokens`: Provider-reported input tokens when available.
- `cached_input_tokens`: Provider-reported cached input tokens when available.
- `uncached_input_tokens`: Provider-reported uncached input tokens when available.
- `output_tokens`: Provider-reported output tokens when available.
- `availability`: Complete, partial, or unavailable state.
- `caveats`: Session-level caveats.

**Relationships**:

- Links to one `DashboardApiRun` by `run_id`.

**Validation rules**:

- `run_id`, `label`, and `availability` are required.
- Session rows must not require clients to parse local filesystem paths.
- Unreadable runs must include a caveat.

## DashboardApiRun

Represents the full dashboard-safe view of one selected run.

**Fields**:

- `run_id`: Selected run identifier.
- `overview`: `DashboardApiRunOverview`.
- `artifacts`: Ordered `DashboardApiArtifactRow` records.
- `artifact_details`: Details keyed by artifact ID or stable lookup key.
- `task_groups`: Ordered `DashboardApiTaskGroup` records.
- `filters`: Safe filter options for clients.
- `privacy`: Run-level privacy state.
- `caveats`: Run-level caveats.

**Relationships**:

- Contains many artifact rows and details.
- Contains zero or more task groups.

**Validation rules**:

- Metrics must come from analyzer outputs or canonical run summaries.
- Hidden content must not appear in rows, details, filters, or search text.
- Rows and task groups must be deterministic for fixture comparison.

## DashboardApiRunOverview

Represents headline metrics for a selected run or scope.

**Fields**:

- `scope`: Run or task scope.
- `scope_label`: Safe display label.
- `request_count`: Request count.
- `artifact_count`: Artifact count.
- `input_tokens`: Provider-reported input tokens when available.
- `cached_input_tokens`: Provider-reported cached input tokens when available.
- `uncached_input_tokens`: Provider-reported uncached input tokens when available.
- `output_tokens`: Provider-reported output tokens when available.
- `total_exposure`: Total local artifact exposure.
- `repeated_exposure`: Repeated local artifact exposure.
- `replay_ratio`: Replay ratio when available.
- `context_efficiency`: Context efficiency when available.
- `attribution_coverage`: Attribution completeness when available.
- `availability`: Analyzer availability.
- `caveats`: Overview caveats.

**Validation rules**:

- Missing metrics must remain absent or marked unavailable, not silently zeroed unless the analyzer reports zero.
- Estimated artifact-level attribution requires caveats.

## DashboardApiArtifactRow

Represents one privacy-safe artifact list row.

**Fields**:

- `artifact_id`: Stable artifact identity.
- `stable_short_id`: Safe short identity.
- `display_name`: Privacy-safe readable label.
- `display_category`: Artifact category.
- `summary`: Optional privacy-safe summary.
- `task_group_ids`: Task groups containing the artifact.
- `total_exposure`: Total exposure.
- `repeated_exposure`: Repeated exposure.
- `inclusion_count`: Inclusion count.
- `estimated_cached_input_tokens`: Estimated cached contribution when available.
- `estimated_uncached_input_tokens`: Estimated uncached contribution when available.
- `attribution_state`: Attribution state when available.
- `preview_state`: Hidden, unavailable, preview, or raw-available state.
- `detail_available`: Whether detail can be requested.
- `search_text`: Privacy-safe searchable text.
- `caveats`: Row caveats.

**Validation rules**:

- Search text must contain only privacy-safe fields.
- Estimated attribution fields require a caveat in row, run, or global caveats.

## DashboardApiArtifactDetail

Represents one artifact drilldown.

**Fields**:

- `artifact_id`: Stable artifact identity.
- `title`: Safe display title.
- `identity`: Stable identity fields and request associations.
- `metrics`: Exposure, replay, inclusion, persistence, and attribution facts.
- `metadata_sections`: Privacy-safe metadata sections for display.
- `tool_links`: Tool-call relationships and confidence.
- `task_group_ids`: Task group membership.
- `privacy`: Field-level privacy state.
- `content`: Optional permitted preview/raw descriptors.
- `caveats`: Detail caveats.

**Validation rules**:

- Raw content is omitted unless explicitly allowed by the response contract and privacy mode.
- Hidden and unavailable fields must be distinguishable.

## DashboardApiTaskGroup

Represents a chronological task group.

**Fields**:

- `task_group_id`: Stable task group identity.
- `display_name`: Privacy-safe label.
- `label_source`: Source of label.
- `confidence`: Complete, partial, or heuristic.
- `request_count`: Request count.
- `artifact_count`: Artifact count.
- `request_ids`: Ordered request IDs.
- `artifact_ids`: Ordered artifact IDs.
- `top_artifact_ids`: Top contributors.
- `metrics`: Token and exposure rollups.
- `privacy`: Task prompt/preview visibility state.
- `caveats`: Group caveats.

**Validation rules**:

- Heuristic and partial task groups must show confidence and caveats.
- Labels must not include hidden prompt text.

## DashboardApiError

Represents a structured client-facing error.

**Fields**:

- `schema_version`: Error response schema version.
- `generated_at`: Error generation timestamp.
- `error`: Stable error code.
- `message`: Safe user-facing message.
- `status`: HTTP status class.
- `caveats`: Optional caveats.

**Validation rules**:

- Error messages must not include raw content, provider payloads, or stack traces.
- Unknown run and unknown artifact errors must be distinguishable.
