# Data Model: Legibility And Task Explorer

## ReadableArtifact

Represents one canonical artifact enriched for human understanding.

**Fields**:

- `artifact_id`: Stable canonical artifact identity.
- `artifact_name`: Original canonical artifact name.
- `display_name`: Best safe readable label.
- `display_category`: One of `command`, `command_output`, `patch`, `tool_call`, `assistant_message`, `user_message`, `file_context`, `request_metadata`, or `unknown`.
- `summary`: Optional concise explanation suitable for tables.
- `stable_short_id`: Short non-sensitive identity used to disambiguate similar labels.
- `tool_name`: Tool name when captured as canonical metadata.
- `call_id`: Stable tool call identity when available.
- `request_id`: Request where the artifact was first or primarily observed.
- `storage_mode`: Canonical storage/privacy mode for the artifact.
- `preview_state`: `hidden`, `unavailable`, `preview`, or `raw_available`.
- `specificity`: Numeric or ordered quality indicator used to prefer richer labels.
- `source_facts`: List of canonical facts used to derive the label.
- `caveats`: Legibility caveats attached to this artifact.

**Relationships**:

- May have zero or more `ToolCallLink` relationships.
- Has one `ArtifactDetail`.
- May appear in zero or more `TaskGroup` records.

**Validation rules**:

- `artifact_id`, `artifact_name`, `display_name`, `display_category`, `storage_mode`, and `preview_state` are required.
- `display_name` must fall back to a stable identifier when no richer label exists.
- `display_name` must not include raw content when storage mode does not permit it.
- `specificity` must deterministically prefer richer metadata over generic labels.

## ToolCallLink

Represents the relationship between a tool call and related output/result artifacts.

**Fields**:

- `link_id`: Stable derived identity for the relationship.
- `call_artifact_id`: Artifact ID for the call side when available.
- `output_artifact_ids`: Artifact IDs for output/result sides.
- `call_id`: Stable call ID when available.
- `tool_name`: Tool name when available.
- `match_state`: `exact`, `inferred`, `unmatched_call`, or `unmatched_output`.
- `confidence`: `high`, `medium`, or `low`.
- `evidence`: Canonical facts used to establish the link.
- `caveats`: Missing or inferred relationship notes.

**Relationships**:

- References one call artifact when available.
- References zero or more output artifacts.
- Contributes to `ArtifactDetail` for linked artifacts.

**Validation rules**:

- Exact links require a shared stable call identifier.
- Inferred links must include evidence and a caveat.
- Unmatched calls and unmatched outputs must remain visible.

## ArtifactDetail

Represents drilldown data for one artifact.

**Fields**:

- `artifact`: The associated `ReadableArtifact`.
- `identity`: Stable IDs, original name, category, and request associations.
- `metrics`: Exposure, repeated exposure, inclusion count, distinct hashes, and available attribution state.
- `persistence`: First seen, last seen, span, and cross-task presence when available.
- `command`: Command string/summary, work directory, exit status, and output preview state when available.
- `patch`: Touched file names/counts and add/update/delete shape when available.
- `message`: Role, prompt/response preview state, and safe summary when available.
- `file_context`: File path/name/count preview state when available.
- `tool_links`: Related `ToolCallLink` entries.
- `privacy`: Storage mode, preview permission, hidden fields, and raw-content availability.
- `caveats`: Estimate, privacy, missing metadata, and partial-data notes.

**Relationships**:

- Built from one `ReadableArtifact`.
- References existing exposure, cache attribution, and persistence analyzer facts.

**Validation rules**:

- Detail must always include stable identity and at least baseline exposure/persistence facts.
- Estimated attribution must carry a caveat in the same detail payload.
- Hidden raw content must be represented by privacy state, not by empty or misleading text.

## TaskGroup

Represents a chronological phase of work in a run.

**Fields**:

- `task_group_id`: Stable derived group identity.
- `display_name`: Safe group label.
- `label_source`: `user_prompt`, `safe_summary`, `request_window`, or `fallback`.
- `confidence`: `complete`, `partial`, or `heuristic`.
- `start_request_id`: First request in the group.
- `end_request_id`: Last request in the group.
- `request_ids`: Ordered request IDs in the group.
- `artifact_ids`: Ordered artifact IDs included in the group.
- `tool_call_link_ids`: Tool links associated with the group.
- `metrics`: Input, cached input, uncached input, output, exposure, repeated exposure, artifact count, and top artifact facts when available.
- `privacy`: Prompt/preview availability and hidden label reasons.
- `caveats`: Grouping, privacy, and attribution notes.

**Relationships**:

- Contains many `ReadableArtifact` records.
- Contains many `ToolCallLink` records.
- May share artifacts with other groups when artifacts persist across task boundaries.

**Validation rules**:

- Groups must be ordered deterministically by request order, timestamp, and stable ID.
- A metadata-only run must still receive useful fallback group labels.
- Heuristic or partial grouping must be visible in `confidence` and caveats.

## LegibilityCaveat

Represents a user-facing explanation for incomplete or estimated legibility.

**Fields**:

- `code`: Stable caveat code.
- `severity`: `info` or `warning`.
- `message`: User-facing explanation.
- `applies_to`: Analyzer, artifact, request, tool link, or task group scope.

**Common codes**:

- `metadata_missing`
- `privacy_hidden`
- `tool_link_unmatched`
- `tool_link_inferred`
- `legacy_record_limited`
- `task_group_heuristic`
- `artifact_attribution_estimated`

**Validation rules**:

- Caveats must use stable codes for tests and export consumers.
- Caveat messages must distinguish missing data from privacy-hidden data.
- Estimated cache/uncached artifact attribution must include `artifact_attribution_estimated`.
