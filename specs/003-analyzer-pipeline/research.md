# Research: Modular Analyzer Pipeline

## Decision: Split Current Aggregate Behavior Into Focused Analyzer Modules

**Rationale**: `src/analysis/aggregate.ts` currently computes exposure, replay, prompt-cache totals, artifact attribution, top contributors, context bloat rows, and request summaries in one pass. The feature goal is to make those derived results reusable across CLI, dashboard, and export surfaces. Focused modules provide clearer ownership while preserving current behavior through parity tests.

**Alternatives considered**:

- Keep `aggregateEvents()` as the only analyzer. Rejected because surfaces would continue to depend on one broad result shape and future analyzers would likely add more mixed responsibility.
- Rewrite all reporting around spec 004 legibility/task outputs first. Rejected because baseline analyzer metrics must stand alone and should not depend on richer display metadata.

## Decision: Use Canonical Event Arrays As The Analyzer Input Contract

**Rationale**: The architecture requires provider-specific payloads to terminate at adapters. Existing canonical validation already turns stored events into canonical artifact and request-usage records. Analyzer modules should accept canonical run data, not Codex request bodies, log rows, or provider-specific metadata.

**Alternatives considered**:

- Let analyzers import adapter helpers for richer interpretation. Rejected because it violates the provider-agnostic analyzer boundary and would make future sources harder to add.
- Define a new source-specific intermediate format. Rejected because spec 001 already establishes canonical captured records as the shared contract.

## Decision: Preserve Legacy Cache Attribution And Coordinate Scaling

**Rationale**: The current cache attribution behavior allocates cached and uncached estimates to artifact token offsets and proportionally scales overlong reconstructed coordinate ranges to provider-reported input tokens. This behavior is already tested by `test/aggregate.test.js` and is user-visible through estimated cost-driver rows. Splitting analyzers must preserve it.

**Alternatives considered**:

- Treat overlong reconstructed coordinates as an error. Rejected because current capture can reconstruct artifact ranges that exceed provider token totals, and the existing proportional normalization produces useful bounded estimates.
- Drop artifact-level cache attribution until exact provider artifact usage exists. Rejected because local estimates are already part of the product value as long as caveats are explicit.

## Decision: Represent Partial And Unavailable Analyzer States Explicitly

**Rationale**: Not every run has provider usage, token offsets, readable metadata, or complete request ordering. Analyzer results need a shared availability state so surfaces can omit or mark sections consistently instead of guessing from missing numbers.

**Alternatives considered**:

- Use zeros for unavailable values. Rejected because zero can mean a real measured value, and this would hide source limitations.
- Throw when records are incomplete. Rejected because older and partial runs should still produce useful exposure and replay summaries.

## Decision: Keep Analyzer Results In Memory For This Feature

**Rationale**: JSONL remains the current canonical store, and the feature does not need a new persisted result cache. Deterministic analyzer outputs and fixture tests are enough for CLI/dashboard parity at this stage.

**Alternatives considered**:

- Persist analyzer result snapshots beside runs. Rejected because result schemas are still evolving and can be recomputed locally from canonical records.
- Migrate to SQLite first. Rejected because storage migration is outside this spec and not necessary for modular analyzer behavior.

## Decision: Treat Spec 004 Legibility/Task Work As Pipeline Extensions

**Rationale**: Spec 004 should add analyzers/results for artifact display, tool-call pairing, drilldowns, and task grouping into the same pipeline. Spec 003 should establish the reusable analyzer contract and core metric axes without making legibility a prerequisite.

**Alternatives considered**:

- Fold all legibility and task grouping into spec 003. Rejected because it would make the analyzer-pipeline slice too broad and blur the boundary between quantitative metric modules and richer interpretive views.
