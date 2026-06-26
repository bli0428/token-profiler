# Data Model: Local Metrics Dashboard

## DashboardSession

Represents one locally available run in the session picker.

**Fields**:

- `run_id`: Stable local run identifier.
- `run_dir`: Local run directory used for loading the run.
- `label`: Human-readable session label when available.
- `updated_at`: Last known update timestamp.
- `request_count`: Number of requests in the run when available.
- `artifact_count`: Number of artifact rows when available.
- `input_tokens`: Provider-reported input tokens when available.
- `cached_input_tokens`: Provider-reported cached input tokens when available.
- `uncached_input_tokens`: Provider-reported uncached input tokens when available.
- `output_tokens`: Provider-reported output tokens when available.
- `availability`: Whether the run summary is complete, partial, or unreadable.
- `caveats`: User-facing limitations for this session row.

**Relationships**:

- Opens one `DashboardRunView`.

**Validation rules**:

- `run_id`, `run_dir`, and `availability` are required.
- Unreadable sessions must remain visible only if they can be safely identified.
- Labels must not include hidden raw content.

## DashboardRunView

Represents the complete dashboard payload for one selected run and optional filter scope.

**Fields**:

- `run_id`: Selected run identity.
- `generated_at`: Dashboard generation timestamp.
- `overview`: `DashboardRunOverview`.
- `artifacts`: Ordered `DashboardArtifactRow` records.
- `artifact_details`: Detail records keyed by artifact ID.
- `task_groups`: Ordered `DashboardTaskGroup` records.
- `filters`: Available categories, task groups, search-safe fields, and default sort.
- `privacy`: Run-level `DashboardPrivacyState`.
- `caveats`: Global caveats that affect the dashboard.

**Relationships**:

- Contains many `DashboardArtifactRow` records.
- Contains zero or more `DashboardTaskGroup` records.
- Contains one `DashboardArtifactDetail` for each row when detail data is available.

**Validation rules**:

- All metrics must come from analyzer output or canonical run summaries.
- Rows must be sorted deterministically.
- Hidden content must not appear in `artifacts`, `artifact_details`, `filters`, or embedded search data.

## DashboardRunOverview

Represents headline metrics and availability for the selected run or active task scope.

**Fields**:

- `scope`: `run` or `task_group`.
- `scope_label`: Human-readable label for the active scope.
- `request_count`: Number of requests in scope.
- `artifact_count`: Number of artifacts in scope.
- `input_tokens`: Input tokens when available.
- `cached_input_tokens`: Cached input tokens when available.
- `uncached_input_tokens`: Uncached input tokens when available.
- `output_tokens`: Output tokens when available.
- `total_exposure`: Total artifact exposure.
- `repeated_exposure`: Repeated artifact exposure.
- `replay_ratio`: Replay ratio.
- `context_efficiency`: Context efficiency.
- `attribution_coverage`: Share or state describing attribution completeness.
- `availability`: Analyzer availability summary.
- `caveats`: Caveats affecting overview interpretation.

**Relationships**:

- References one `DashboardTaskGroup` when scoped to a task.

**Validation rules**:

- Provider-reported totals must be distinguishable from local estimates.
- Missing metrics must be represented as unavailable or partial, not zero unless the analyzer reports zero.

## DashboardArtifactRow

Represents one artifact row in tables and filtered lists.

**Fields**:

- `artifact_id`: Stable artifact ID.
- `stable_short_id`: Short display ID.
- `display_name`: Privacy-safe readable label.
- `display_category`: Display category.
- `summary`: Optional privacy-safe row summary.
- `task_group_ids`: Task groups containing the artifact.
- `total_exposure`: Total exposure.
- `repeated_exposure`: Repeated exposure.
- `inclusion_count`: Inclusion count.
- `estimated_cached_input_tokens`: Estimated cached artifact contribution when available.
- `estimated_uncached_input_tokens`: Estimated uncached artifact contribution when available.
- `attribution_state`: Attribution completeness or limitation.
- `preview_state`: Whether detail content is hidden, unavailable, preview, or raw-available.
- `detail_available`: Whether the row can open a detail panel.
- `caveats`: Row-specific caveats.

**Relationships**:

- Opens one `DashboardArtifactDetail` when detail is available.
- May appear in many `DashboardTaskGroup` records.

**Validation rules**:

- `display_name` and `stable_short_id` are required.
- Estimated cached/uncached fields require an attribution caveat.
- Search text for the row must be built only from privacy-safe fields.

## DashboardArtifactDetail

Represents the detail panel payload for one artifact.

**Fields**:

- `artifact_id`: Stable artifact ID.
- `title`: Display title.
- `identity`: Stable IDs, original name if safe, category, and request IDs.
- `metrics`: Exposure, replay, inclusion, persistence, and attribution facts.
- `metadata_sections`: Privacy-safe command, patch, message, file-context, or generic metadata sections.
- `tool_links`: Related tool-call relationships and confidence.
- `task_group_ids`: Task groups containing the artifact.
- `privacy`: Field-level visibility state.
- `content`: Optional preview/raw content descriptors permitted for display.
- `caveats`: Detail-specific caveats.

**Relationships**:

- Derived from one analyzer `ArtifactDetail`.
- References zero or more `DashboardTaskGroup` records.

**Validation rules**:

- Raw content must not appear unless the user explicitly reveals it in a permitted raw-content state.
- Hidden and unavailable fields must be distinguishable.
- Detail must always include stable identity even when metadata is sparse.

## DashboardTaskGroup

Represents one chronological work group in navigation and filters.

**Fields**:

- `task_group_id`: Stable task group ID.
- `display_name`: Privacy-safe label.
- `label_source`: Source of the label.
- `confidence`: Complete, partial, or heuristic.
- `request_count`: Number of requests in the group.
- `artifact_count`: Number of artifacts in the group.
- `request_ids`: Ordered request IDs.
- `artifact_ids`: Ordered artifact IDs.
- `top_artifact_ids`: Top contributors within the group.
- `metrics`: Token and exposure rollups.
- `privacy`: Prompt/preview visibility state.
- `caveats`: Task grouping, privacy, and attribution caveats.

**Relationships**:

- Scopes `DashboardRunOverview`.
- Filters `DashboardArtifactRow` records.

**Validation rules**:

- Ordering follows analyzer task-group order.
- Heuristic or partial groups must show confidence and caveats.
- Labels must not include hidden prompt text.

## DashboardFilterState

Represents user-visible filtering and navigation state.

**Fields**:

- `run_id`: Selected run.
- `task_group_id`: Selected task group, if any.
- `category`: Selected artifact category, if any.
- `search_query`: Current text filter.
- `sort`: Current row sort.
- `selected_artifact_id`: Open detail artifact, if any.

**Validation rules**:

- Filter state must be serializable into a refresh-safe local URL state.
- Search must operate only on fields approved by `DashboardPrivacyState`.

## DashboardPrivacyState

Represents display permissions for the dashboard.

**Fields**:

- `storage_mode`: Run storage mode.
- `raw_content_available`: Whether raw content exists for any fields.
- `raw_content_revealed`: Whether the user has explicitly revealed raw content in the current detail view.
- `preview_fields`: Fields that may show previews.
- `hidden_fields`: Fields hidden by privacy mode.
- `unavailable_fields`: Fields absent from the run.
- `caveats`: Privacy caveats.

**Validation rules**:

- Hidden fields must not be embedded in the page payload.
- Raw content reveal is per-detail and off by default.
- Privacy caveats must distinguish hidden content from missing data.
