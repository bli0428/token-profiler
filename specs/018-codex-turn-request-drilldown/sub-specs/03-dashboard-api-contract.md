# Sub-Spec: Dashboard API Turn Drilldown Contract

## Domain Boundary

This sub-spec covers API-owned view-model fields consumed by dashboard surfaces.

**Owns**
- Run-detail response shape for turn groups.
- Stable field names for turn rows, request children, and artifact references.
- Privacy and availability fields required by the frontend.

**Does Not Own**
- Codex provider request parsing.
- Analyzer algorithms.
- Browser-side inference of turn grouping.

## Required Behavior

- The run-detail API exposes a first-class `turns` collection or equivalent view-model section.
- Each turn row includes a stable id, title, title source, request references, availability/confidence, privacy state, and caveats.
- Each request child includes a stable request id, title, title source, existing accounting metrics, and artifact references.
- Artifact detail payloads remain keyed by artifact id.
- The API remains the contract owner for dashboard hierarchy shape; React components should not reconstruct turns from raw rows.

## Suggested View Shape

The exact implementation may change during planning, but the API should communicate this logical structure:

```text
run
  turns[]
    turn_id
    title
    title_source
    grouping_source
    confidence
    requests[]
      request_id
      title
      title_source
      artifact_inclusions[]
  artifact_details
  privacy
  caveats
```

## Contract Rules

- Turn and request titles are display values, not grouping keys.
- Stable ids are used for expansion, selection, and testing.
- Privacy state travels with title candidates and artifact details.
- Request accounting may be used as an internal source for request metrics, but the turn hierarchy is the primary drilldown contract for this feature.

## Acceptance Checks

- A dashboard client can render a complete three-level hierarchy from one run-detail response.
- The client can distinguish direct turn grouping from fallback grouping without provider-specific knowledge.
- The client can render titles and fallbacks without reading raw content fields hidden by capture policy.
