# Contract: Legibility And Task Explorer Results

## Purpose

Legibility and task explorer results are analyzer outputs consumed by CLI reports, artifact explain commands, dashboard views, and exports. Surfaces render these outputs and must not derive labels, task groups, privacy states, or attribution caveats from raw canonical events.

## Input Contract

Legibility analyzers accept canonical run data and previously computed analyzer results only.

```ts
type LegibilityInput = {
  run: PreparedRunData;
  exposure: ExposureAnalysis;
  cacheAttribution: CacheAttributionAnalysis;
  persistence: AnalyzerResult;
};
```

Adapter-specific request bodies, provider payloads, local transport objects, and source log rows are not valid inputs.

## Analyzer Result IDs

### `legibility`

Produces readable artifact rows, tool-call links, and artifact detail records.

Required complete facts:

- canonical artifact identity
- canonical artifact type/name
- request identity and ordering
- storage/privacy mode
- exposure artifact aggregates

Partial/unavailable behavior:

- Missing tool call IDs keep labels available but mark tool links partial.
- Missing command/workdir/exit facts produce fallback labels and `metadata_missing` caveats.
- Metadata-only storage may hide previews but must not make baseline labels unavailable.

### `task-groups`

Produces chronological task groups with rollups and grouping confidence.

Required complete facts:

- deterministic request ordering
- request-to-artifact associations
- exposure and cache analyzer totals for rollups
- available user-intent boundaries or fallback request windows

Partial/unavailable behavior:

- Missing prompt text produces safe fallback labels and `privacy_hidden` or `metadata_missing` caveats.
- Missing cache attribution keeps task groups available but marks cost rollups partial.
- Heuristic boundaries set confidence to `heuristic` and include `task_group_heuristic`.

## Output Shape

```ts
type LegibilityAnalysisResult = {
  analyzer_id: "legibility";
  schema_version: 1;
  availability: AnalyzerAvailability;
  metrics: {
    readable_artifact_count: number;
    opaque_artifact_count: number;
    exact_tool_link_count: number;
    inferred_tool_link_count: number;
    unmatched_tool_artifact_count: number;
  };
  rows: ReadableArtifactRow[];
  tool_links: ToolCallLink[];
  details: ArtifactDetail[];
  caveats: AnalysisCaveat[];
};
```

```ts
type TaskGroupAnalysisResult = {
  analyzer_id: "task-groups";
  schema_version: 1;
  availability: AnalyzerAvailability;
  metrics: {
    task_group_count: number;
    heuristic_group_count: number;
    grouped_artifact_count: number;
    cross_group_artifact_count: number;
  };
  rows: TaskGroup[];
  caveats: AnalysisCaveat[];
};
```

## Readable Artifact Row

```ts
type ReadableArtifactRow = {
  artifact_id: string;
  artifact_name: string;
  stable_short_id: string;
  display_name: string;
  display_category:
    | "command"
    | "command_output"
    | "patch"
    | "tool_call"
    | "assistant_message"
    | "user_message"
    | "file_context"
    | "request_metadata"
    | "unknown";
  summary?: string;
  tool_name?: string;
  call_id?: string;
  request_id?: string;
  total_exposure: number;
  repeated_exposure: number;
  inclusion_count: number;
  attribution_state?: string;
  preview_state: "hidden" | "unavailable" | "preview" | "raw_available";
  specificity: number;
  caveats: AnalysisCaveat[];
};
```

## Tool Call Link

```ts
type ToolCallLink = {
  link_id: string;
  call_id?: string;
  tool_name?: string;
  call_artifact_id?: string;
  output_artifact_ids: string[];
  match_state: "exact" | "inferred" | "unmatched_call" | "unmatched_output";
  confidence: "high" | "medium" | "low";
  evidence: string[];
  caveats: AnalysisCaveat[];
};
```

## Artifact Detail

```ts
type ArtifactDetail = {
  artifact_id: string;
  display_name: string;
  display_category: ReadableArtifactRow["display_category"];
  identity: {
    artifact_name: string;
    stable_short_id: string;
    request_ids: string[];
  };
  metrics: {
    total_exposure: number;
    repeated_exposure: number;
    inclusion_count: number;
    distinct_hash_count?: number;
    estimated_cached_input_tokens?: number;
    estimated_uncached_input_tokens?: number;
    attribution_state?: string;
  };
  persistence: {
    first_seen_at?: string;
    last_seen_at?: string;
    task_group_ids?: string[];
  };
  command?: {
    command?: string;
    workdir?: string;
    exit_code?: number;
    output_preview?: string;
    preview_state: ReadableArtifactRow["preview_state"];
  };
  patch?: {
    touched_files?: string[];
    touched_file_count?: number;
    adds?: number;
    updates?: number;
    deletes?: number;
  };
  privacy: {
    storage_mode: string;
    preview_state: ReadableArtifactRow["preview_state"];
    hidden_fields: string[];
  };
  tool_links: ToolCallLink[];
  caveats: AnalysisCaveat[];
};
```

## Task Group

```ts
type TaskGroup = {
  task_group_id: string;
  display_name: string;
  label_source: "user_prompt" | "safe_summary" | "request_window" | "fallback";
  confidence: "complete" | "partial" | "heuristic";
  start_request_id: string;
  end_request_id: string;
  request_ids: string[];
  artifact_ids: string[];
  tool_call_link_ids: string[];
  metrics: {
    input_tokens?: number;
    cached_input_tokens?: number;
    uncached_input_tokens?: number;
    output_tokens?: number;
    total_exposure: number;
    repeated_exposure: number;
    artifact_count: number;
  };
  top_artifact_ids: string[];
  privacy: {
    prompt_available: boolean;
    preview_state: ReadableArtifactRow["preview_state"];
    hidden_reason?: string;
  };
  caveats: AnalysisCaveat[];
};
```

## Deterministic Ordering

Readable artifact rows sort by:

1. estimated uncached input tokens when available, descending
2. total exposure descending
3. inclusion count descending
4. display category
5. stable artifact ID ascending

Task groups sort by:

1. first request order
2. first timestamp when available
3. stable task group ID ascending

Within a task group, top artifacts use the same readable artifact ordering.

## Surface Responsibilities

Surfaces may:

- choose compact or expanded formatting
- link rows to details
- filter rows by label, category, task group, or stable ID
- hide unavailable sections while preserving caveats

Surfaces must not:

- parse provider payloads
- recompute readable labels or grouping boundaries
- show hidden raw content
- suppress estimated-attribution caveats when showing estimated artifact-level values
