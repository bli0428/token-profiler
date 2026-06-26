# Data Model: Modular Analyzer Pipeline

## Overview

Analyzers derive reusable results from canonical run records. They do not persist new source facts and do not interpret provider-specific payloads. All entities below describe derived data that can be rendered by CLI reports, dashboards, or exports.

## Entities

### Canonical Run Data

The normalized input set for all analyzers.

**Fields**:

- `run_id`: Stable run identifier when present in canonical records.
- `events`: Ordered or orderable canonical event records.
- `artifacts`: Canonical artifact events included in requests.
- `usage`: Canonical request-usage events when provider/source usage exists.
- `source_limitations`: Limitation records or metadata disclosed by adapters.

**Validation rules**:

- Analyzer inputs must pass canonical event validation before derivation.
- Provider-specific request or log payloads are not accepted as analyzer inputs.
- Missing usage or offset records produce partial/unavailable analyzer states, not raw failures.

### Analyzer

A focused derivation over canonical run data.

**Fields**:

- `id`: Stable analyzer identifier such as `exposure`, `cache-attribution`, `persistence`, or `context-clutter`.
- `version`: Result schema version for that analyzer.
- `requires`: Canonical facts required for complete output.
- `produces`: Result kind emitted by the analyzer.

**Validation rules**:

- Analyzer IDs must be unique.
- Analyzer execution must be deterministic for the same canonical input.
- Analyzer modules must not import adapter or surface modules.

### Analyzer Availability State

The status of one analyzer result for one run.

**Fields**:

- `status`: `complete`, `partial`, `unavailable`, or `not_applicable`.
- `reason`: User-readable reason when status is not `complete`.
- `missing_facts`: Canonical fact types that prevented complete analysis.
- `limitations`: Source limitation codes or caveats that affect interpretation.

**Validation rules**:

- `complete` results may still contain caveats, but must have all required facts for the metric.
- `partial` results must name which metric subsets are incomplete.
- `unavailable` results must not be rendered as zero-valued complete metrics.

### Run Analysis Summary

The combined analyzer output for one run.

**Fields**:

- `run_id`: Run identifier.
- `schema_version`: Combined result schema version.
- `generated_at`: Time the analysis was generated.
- `analyzers`: Map or list of named analyzer results.
- `totals`: Headline cross-analyzer metrics where available.
- `artifact_aggregates`: Per-artifact aggregate rows reusable across surfaces.
- `caveats`: Run-level explanations, especially attribution and source limitations.

**Relationships**:

- Contains many `Analyzer Result` entries.
- Contains many `Artifact Aggregate` entries.
- References one `Canonical Run Data` input set.

### Analyzer Result

Output from one analyzer.

**Fields**:

- `analyzer_id`: Stable analyzer identifier.
- `schema_version`: Result schema version.
- `availability`: Analyzer availability state.
- `metrics`: Named numeric or categorical values produced by the analyzer.
- `rows`: Optional ranked or grouped rows for surface tables.
- `caveats`: User-facing caveats specific to this analyzer.

**Validation rules**:

- Result values must be derived from canonical records only.
- Ranked rows must have deterministic ordering, including ties.
- Caveats must distinguish provider-reported totals from local estimates where relevant.

### Artifact Aggregate

Per-artifact derived summary.

**Fields**:

- `artifact_id`: Stable canonical artifact identity.
- `artifact_name`: Captured artifact name.
- `display_name`: Best available readable label.
- `artifact_type`: Canonical artifact type.
- `total_exposure`: Sum of local token estimates across all inclusions.
- `unique_exposure`: First-seen content exposure.
- `repeated_exposure`: Repeated content exposure.
- `replay_ratio`: Repeated exposure divided by total exposure.
- `inclusion_count`: Number of request inclusions.
- `distinct_hash_count`: Number of distinct content hashes seen for the artifact identity.
- `first_seen_request`: First request where the artifact appears.
- `last_seen_request`: Last request where the artifact appears.
- `estimated_cached_input_tokens`: Locally estimated cached contribution when allocatable.
- `estimated_uncached_input_tokens`: Locally estimated uncached contribution when allocatable.
- `attribution_state`: Attribution state for this artifact.
- `persistence_classification`: Persistence classification when available.
- `caveats`: Artifact-specific limitations or interpretation notes.

**Validation rules**:

- Exposure metrics must use canonical local token counts.
- Changed content under the same artifact identity must increase distinct hash count.
- Artifact-level cache values are estimates and must not be labeled provider-reported.

### Attribution Coverage

Relationship between provider-reported request usage and locally allocated artifact estimates.

**Fields**:

- `request_id`: Canonical request identifier.
- `provider_input_tokens`: Provider/source-reported request input tokens.
- `provider_cached_input_tokens`: Provider/source-reported cached input tokens.
- `provider_uncached_input_tokens`: Provider/source-reported uncached input tokens.
- `estimated_attributed_tokens`: Sum of local artifact ranges after normalization.
- `estimated_cached_tokens`: Local cached allocation.
- `estimated_uncached_tokens`: Local uncached allocation.
- `coverage_ratio`: Estimated attributed tokens divided by provider input tokens.
- `state`: `exact_match`, `under_attributed`, `overlong_normalized`, `usage_unavailable`, `offsets_unavailable`, or `not_applicable`.
- `coordinate_scale`: Proportional scale applied when reconstructed ranges exceed provider input tokens.

**Validation rules**:

- Provider usage totals remain authoritative when present.
- If reconstructed coordinate ranges exceed provider input tokens, ranges must be proportionally normalized before cached/uncached allocation.
- Missing provider usage must produce `usage_unavailable`.
- Missing artifact offsets must produce partial attribution rather than fabricated allocation.

### Persistence Classification

Explanation of how an artifact persists through request windows.

**Fields**:

- `artifact_id`: Stable artifact identity.
- `first_seen_request`: First request where artifact appears.
- `last_seen_request`: Last request where artifact appears.
- `span_request_count`: Number of request positions in the observed span.
- `inclusion_count`: Number of actual inclusions.
- `gap_count`: Number of gaps between inclusions.
- `classification`: `continuous`, `reintroduced`, `uncertain`, `normal_persistence`, or `possible_clutter`.
- `evidence`: Short user-readable evidence for the classification.

**Validation rules**:

- Continuous persistence requires adjacent or uninterrupted observed inclusions.
- Reintroduced replay requires at least one observed gap followed by later inclusion.
- Possible clutter must be framed as a concern, not a definitive waste label.

## State Transitions

### Analyzer Availability

```text
not_applicable -> complete
not_applicable -> partial
not_applicable -> unavailable
partial -> complete
complete -> partial      # possible when analyzing a different run with fewer facts
```

Analyzer states are per-run outcomes, not persistent lifecycle states. A result can be complete for one run and partial for another.

### Attribution State

```text
usage_unavailable
offsets_unavailable
under_attributed
exact_match
overlong_normalized
not_applicable
```

The state is derived independently for each request, then summarized at run and artifact levels.
