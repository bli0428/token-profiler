# Research: Legibility And Task Explorer

## Decision: Treat legibility as analyzer output, not renderer behavior

**Rationale**: CLI, HTML reports, future dashboard views, and exports all need the same readable labels, artifact details, task groups, privacy states, and caveats. Keeping this logic in analyzers preserves the architecture boundary that surfaces render results without recomputing analysis.

**Alternatives considered**:

- Keep label formatting in CLI commands: rejected because dashboard/export surfaces would duplicate or diverge from CLI behavior.
- Store pre-rendered labels in the canonical store: rejected because labels can improve as analyzer rules evolve and should not require rewriting captured facts.

## Decision: Use canonical metadata and analyzer facts only

**Rationale**: Provider-specific payloads must stop at adapters. Legibility should consume artifact IDs, artifact types, canonical metadata, request ordering, storage mode, exposure, persistence, and attribution facts already present in canonical records or analyzer outputs.

**Alternatives considered**:

- Re-open original provider logs during analysis: rejected because it crosses adapter/analyzer boundaries and can bypass privacy mode.
- Add provider-specific matching rules in the analyzer: rejected because it makes Codex-specific details leak into reusable analysis.

## Decision: Keep metadata-only mode useful by using structural labels

**Rationale**: Metadata-only is the default product behavior. Labels can still be useful from artifact category, tool name, command summary when captured as metadata, call ID, request position, timestamps, file counts, and storage-mode caveats without storing raw prompts or outputs.

**Alternatives considered**:

- Require preview mode for legibility: rejected because it weakens the baseline privacy promise.
- Suppress opaque artifacts entirely: rejected because users need to know which high-exposure items remain unexplained.

## Decision: Model tool links explicitly with confidence and unmatched states

**Rationale**: Tool call and output relationships may be exact, inferred, partial, or missing. A first-class link object keeps unmatched calls/outputs visible and lets surfaces explain uncertainty rather than silently hiding it.

**Alternatives considered**:

- Merge call and output artifacts into one synthetic artifact: rejected because it can lose token/exposure facts and stable identities.
- Only show links when exact: rejected because imported or older runs may still have useful partial evidence.

## Decision: Task groups start with request/user-intent windows and visible confidence

**Rationale**: Exact task boundaries may be unavailable in older or metadata-only runs. A deterministic heuristic based on user-intent boundaries, request order, and continuity evidence gives useful summaries while making uncertainty explicit.

**Alternatives considered**:

- Wait for full trace/span records before grouping: rejected because users can benefit from grouped sessions before trace support is complete.
- Use raw prompt text as the only grouping key: rejected because metadata-only mode may not store prompt text.

## Decision: Reuse existing analyzer totals for task rollups

**Rationale**: Task groups should summarize input, cached input, uncached input, output, exposure, repeated exposure, and top artifacts using existing exposure/cache/persistence calculations to avoid conflicting numbers.

**Alternatives considered**:

- Recalculate token metrics inside task grouping: rejected because it duplicates analyzer logic and risks mismatched totals.
- Omit attribution from task groups: rejected because task-level cost insight is a core use case.

## Decision: Deterministic tie-breaking is part of the contract

**Rationale**: Fixture tests and user trust require stable output. Sorts should tie-break by relevant metric, inclusion/request order, timestamp, and stable IDs so repeated analysis produces identical labels and task ordering.

**Alternatives considered**:

- Preserve input order only: rejected because mixed imported/captured runs may have incomplete or inconsistent ordering facts.
- Sort by display label only: rejected because labels can collide or improve over time.
