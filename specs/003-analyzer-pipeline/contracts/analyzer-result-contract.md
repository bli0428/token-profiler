# Contract: Analyzer Results

## Purpose

Analyzer results are the boundary between canonical run records and surfaces. CLI reports, dashboards, and exports consume these results instead of recalculating exposure, attribution, persistence, or contributor rankings.

## Input Contract

Analyzers accept canonical records only.

```ts
type CanonicalRunInput = {
  run_id?: string;
  events: CanonicalEvent[];
};
```

`CanonicalEvent` is defined by spec 001 and validated by the core event layer. Adapter-specific request bodies, provider payloads, local log rows, and capture transport objects are out of scope for analyzer inputs.

## Output Contract

```ts
type RunAnalysisSummary = {
  schema_version: 1;
  run_id?: string;
  generated_at: string;
  totals: AnalysisTotals;
  analyzers: AnalyzerResult[];
  artifact_aggregates: ArtifactAggregateResult[];
  caveats: AnalysisCaveat[];
};
```

```ts
type AnalyzerResult = {
  analyzer_id: string;
  schema_version: number;
  availability: AnalyzerAvailability;
  metrics: Record<string, number | string | boolean | null>;
  rows?: AnalyzerRow[];
  caveats: AnalysisCaveat[];
};
```

```ts
type AnalyzerAvailability = {
  status: "complete" | "partial" | "unavailable" | "not_applicable";
  reason?: string;
  missing_facts?: string[];
  limitations?: string[];
};
```

```ts
type AnalysisCaveat = {
  code: string;
  severity: "info" | "warning";
  message: string;
  applies_to?: {
    analyzer_id?: string;
    request_id?: string;
    artifact_id?: string;
  };
};
```

## Required Analyzer IDs

### `exposure`

Reports total exposure, unique exposure, repeated exposure, replay ratio, context efficiency, request count, artifact count, and top cumulative contributors.

Required complete facts:

- canonical artifact records
- artifact local token counts
- artifact content hashes
- request identifiers

Partial/unavailable behavior:

- Missing local token counts make exposure partial.
- Missing content hashes make unique/repeated split partial.
- Missing readable labels do not make exposure partial.

### `cache-attribution`

Reports provider usage totals, local artifact-level attribution estimates, attribution coverage, and cache/burn estimates.

Required complete facts:

- canonical request usage records
- artifact token offsets for attributable requests
- provider/source input and cached input token totals

Partial/unavailable behavior:

- Missing usage records produce `usage_unavailable` at request level.
- Missing offsets produce partial attribution for affected requests.
- Overlong reconstructed coordinate ranges must be proportionally normalized before allocation and caveated as `overlong_coordinate_normalized`.

Required caveat:

```text
Artifact-level attribution is estimated from local tokenization. Provider-reported request totals remain authoritative when present.
```

### `persistence`

Reports first seen, last seen, inclusion count, span, continuous replay, reintroduced replay, and unknown persistence states.

Required complete facts:

- canonical artifact records
- request identifiers
- stable artifact identities
- a deterministic request ordering

Partial/unavailable behavior:

- Missing timestamps or ordering facts produce partial span classification.
- Missing readable metadata does not prevent persistence metrics.

### `context-clutter`

Classifies possible clutter using exposure, repeated exposure, uncached estimate, persistence evidence, and caveats.

Required complete facts:

- exposure result
- persistence result
- cache-attribution result when uncached burn is part of the classification

Partial/unavailable behavior:

- Missing cache attribution keeps clutter classification possible but without burn evidence.
- Missing persistence evidence produces `uncertain`, not `possible_clutter`.

## Artifact Aggregate Result

```ts
type ArtifactAggregateResult = {
  artifact_id: string;
  artifact_name: string;
  display_name?: string;
  artifact_type: string;
  total_exposure: number;
  unique_exposure: number;
  repeated_exposure: number;
  replay_ratio: number;
  inclusion_count: number;
  distinct_hash_count: number;
  first_seen_request?: string;
  last_seen_request?: string;
  estimated_cached_input_tokens?: number;
  estimated_uncached_input_tokens?: number;
  normalized_estimated_input_tokens?: number;
  normalized_first_occurrence_estimated_input_tokens?: number;
  attribution_state?: string;
  persistence_classification?: string;
  caveats: AnalysisCaveat[];
};
```

## Deterministic Ordering

Analyzer rows must sort deterministically:

1. Primary metric descending.
2. Secondary relevant metric descending, such as inclusion count or repeated exposure.
3. Stable artifact ID ascending.

This applies to top contributors, replay hotspots, cost drivers, and clutter rows.

## Surface Responsibilities

Surfaces may:

- choose which analyzer sections to show
- format numbers and percentages
- show or hide partial/unavailable sections
- link from summary rows to detail views

Surfaces must not:

- recompute analyzer metrics from canonical events
- reinterpret provider-specific payloads
- label local artifact attribution as provider-reported
- hide attribution caveats when showing estimated artifact-level cost or cache data

## Compatibility Expectations

The first implementation should preserve current CLI summary values for representative fixtures:

- total exposure
- unique exposure
- repeated exposure
- replay ratio
- context efficiency
- top contributors
- replay hotspots
- provider usage totals
- estimated cached/uncached artifact attribution
- proportional normalization of overlong reconstructed coordinates
