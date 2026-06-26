# Contract: Local Dashboard View Model

## Purpose

The local dashboard view model is the contract between canonical/analyzer data and dashboard surfaces. HTML rendering and browser interaction consume this model; they must not derive metrics, labels, task groups, or privacy permissions from raw events.

## Input Contract

Dashboard model builders accept canonical/analyzer summary objects and local session metadata only.

```ts
type DashboardModelInput = {
  summary: RunAnalysisSummary;
  runDir?: string;
  session?: DashboardSession;
};
```

Valid inputs:

- `RunAnalysisSummary` from `analyzeEvents`
- local run path and filesystem timestamps
- optional CLI-level session labels that are already privacy-safe

Invalid inputs:

- provider-specific request or response payloads
- adapter transport objects
- raw log rows that have not been converted to canonical events
- browser-side recomputation of analyzer metrics

## Output Shape

```ts
type DashboardViewModel = {
  schema_version: 1;
  run_id?: string;
  generated_at: string;
  session?: DashboardSession;
  overview: DashboardRunOverview;
  artifacts: DashboardArtifactRow[];
  artifact_details: Record<string, DashboardArtifactDetail>;
  task_groups: DashboardTaskGroup[];
  filters: DashboardFilterOptions;
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};
```

## Session Index Contract

```ts
type DashboardSessionIndex = {
  schema_version: 1;
  generated_at: string;
  sessions: DashboardSession[];
  caveats: DashboardCaveat[];
};
```

Session rows sort by:

1. `updated_at` descending
2. `run_id` ascending

Partial or unreadable runs remain visible only when they can be safely identified. Their `availability` explains the limitation.

## Overview Contract

```ts
type DashboardRunOverview = {
  scope: "run" | "task_group";
  scope_id?: string;
  scope_label: string;
  request_count: number;
  artifact_count: number;
  input_tokens?: number;
  cached_input_tokens?: number;
  uncached_input_tokens?: number;
  output_tokens?: number;
  total_exposure: number;
  repeated_exposure: number;
  replay_ratio?: number;
  context_efficiency?: number;
  attribution_coverage?: number | "partial" | "unavailable";
  availability: AnalyzerAvailability;
  caveats: DashboardCaveat[];
};
```

Rules:

- Request-level token totals are provider-reported when present.
- Artifact-level cached and uncached values are local estimates and require visible caveats.
- Missing values remain absent or marked unavailable; they are not silently coerced to zero.

## Artifact Row Contract

```ts
type DashboardArtifactRow = {
  artifact_id: string;
  stable_short_id: string;
  display_name: string;
  display_category: string;
  summary?: string;
  task_group_ids: string[];
  total_exposure: number;
  repeated_exposure: number;
  inclusion_count: number;
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
  attribution_state?: string;
  preview_state: "hidden" | "unavailable" | "preview" | "raw_available";
  detail_available: boolean;
  search_text: string;
  caveats: DashboardCaveat[];
};
```

Rules:

- `search_text` contains only privacy-safe fields.
- Row ordering defaults to estimated uncached tokens when available, then total exposure, repeated exposure, inclusion count, category, and stable ID.
- Every row with estimated artifact attribution includes or inherits an attribution caveat.

## Artifact Detail Contract

```ts
type DashboardArtifactDetail = {
  artifact_id: string;
  title: string;
  identity: {
    artifact_name?: string;
    stable_short_id: string;
    display_category: string;
    request_ids: string[];
  };
  metrics: Record<string, number | string | boolean | undefined>;
  metadata_sections: Array<{
    title: string;
    rows: Array<{ label: string; value: string; visibility: "visible" | "hidden" | "unavailable" }>;
  }>;
  tool_links: ToolCallLink[];
  task_group_ids: string[];
  privacy: DashboardPrivacyState;
  content?: {
    preview?: string;
    raw?: string;
    raw_reveal_required: boolean;
  };
  caveats: DashboardCaveat[];
};
```

Rules:

- `content.raw` is omitted unless raw content is permitted and explicitly revealed for that detail.
- Hidden content is represented by privacy state and metadata row visibility, not by blank visible strings.
- Tool link match states and confidence come from analyzer output.

## Task Group Contract

```ts
type DashboardTaskGroup = {
  task_group_id: string;
  display_name: string;
  label_source: string;
  confidence: "complete" | "partial" | "heuristic";
  request_count: number;
  artifact_count: number;
  request_ids: string[];
  artifact_ids: string[];
  top_artifact_ids: string[];
  metrics: {
    input_tokens?: number;
    cached_input_tokens?: number;
    uncached_input_tokens?: number;
    output_tokens?: number;
    total_exposure: number;
    repeated_exposure: number;
  };
  privacy: DashboardPrivacyState;
  caveats: DashboardCaveat[];
};
```

Rules:

- Task groups preserve analyzer ordering.
- Heuristic and partial grouping are visible in `confidence` and caveats.
- Selecting a task group scopes dashboard rows and overview metrics without mutating the underlying run model.

## Filter Options Contract

```ts
type DashboardFilterOptions = {
  categories: string[];
  task_groups: Array<{ task_group_id: string; display_name: string }>;
  default_sort: "estimated_uncached" | "total_exposure" | "repeated_exposure" | "inclusion_count";
  searchable_fields: string[];
};
```

Rules:

- `searchable_fields` documents the safe fields included in row `search_text`.
- Browser code may filter and sort rows already present in the view model.
- Browser code must not calculate analyzer metrics or reveal hidden fields.

## Rendering Contract

Static dashboard HTML must include:

- overview metric cards
- global and scoped caveats
- artifact table with filter controls
- task group navigation when groups are available
- artifact detail panel
- empty, loading, stale, and error states where applicable
- embedded view-model JSON that excludes hidden content

HTML renderer responsibilities:

- escape all text
- preserve stable element IDs or data attributes for tests
- keep layout usable at common laptop and desktop widths
- avoid embedding provider-specific payloads or hidden raw content

## CLI Contract

Existing behavior:

```text
token-profiler html [run_dir] --out <path>
```

Expected dashboard behavior:

- Generates a local dashboard HTML file for the selected run.
- Defaults to the selected run directory when no output path is given.
- Prints the written path.
- Fails with a clear message when the run cannot be read.

Session index behavior may be exposed through a later command or option:

```text
token-profiler dashboard --data-dir <path> --out <path> --limit <n>
```

If added, it must generate a local session index and link each session to a generated dashboard page or loadable run path without requiring remote services.
