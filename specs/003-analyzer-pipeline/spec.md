# Feature Specification: Modular Analyzer Pipeline

**Feature Branch**: `003-analyzer-pipeline`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Separate context bloat, top contributors, burn, attribution, and legibility into derived modules over metadata."

## User Scenarios & Testing

### User Story 1 - Exposure And Replay Analyzer (Priority: P1)

A user can identify which artifacts were repeatedly present in context and how much cumulative exposure they represent.

**Why this priority**: This is the core value already proven by the MVP.

**Independent Test**: Run the analyzer over a fixture with repeated hashes and verify total, unique, repeated exposure, replay ratio, and top contributors.

**Acceptance Scenarios**:

1. **Given** the same artifact content appears in multiple requests, **When** exposure analysis runs, **Then** only the first content hash counts as unique exposure.
2. **Given** an artifact changes content, **When** exposure analysis runs, **Then** the new hash contributes new unique exposure.

---

### User Story 2 - Cache Attribution Documentation (Priority: P1)

A user can see per-artifact cached and uncached contribution while the report documents which values are provider-reported and which values are estimated from local tokenization.

**Why this priority**: Users should not confuse provider-reported request totals with locally estimated artifact attribution.

**Independent Test**: Run fixtures where reconstructed artifact tokens exactly match, undercount, and overcount provider usage.

**Acceptance Scenarios**:

1. **Given** reconstructed artifact tokens match provider input tokens, **When** cache attribution runs, **Then** the report documents that artifact attribution is estimated from local tokenizer counts.
2. **Given** reconstructed tokens exceed provider input, **When** attribution runs, **Then** the analyzer normalizes or flags the coordinate mismatch.
3. **Given** artifact-level cost estimates are shown, **When** reports render, **Then** users can distinguish them from provider-reported request totals.

---

### User Story 3 - Analyzer Registry (Priority: P2)

A developer can add or disable analyzer modules without editing the capture layer or report-specific code.

**Why this priority**: The tool will grow beyond the current report sections.

**Independent Test**: Register a synthetic analyzer that consumes canonical events and produces a named result without affecting other analyzers.

**Acceptance Scenarios**:

1. **Given** a new analyzer module, **When** the pipeline runs, **Then** the module receives canonical run data and emits a typed result.
2. **Given** an analyzer is disabled, **When** reports render, **Then** sections depending on it are omitted or marked unavailable.

### Edge Cases

- Mixed-version runs contain generic and readable metadata for the same artifact.
- Usage events may be missing for some requests.
- Artifact offsets may be missing in older runs.
- Two artifacts may have similar display names but different stable IDs.
- Replayed cached content may be normal persistence, not waste.

## Requirements

### Functional Requirements

- **FR-001**: System MUST separate capture from analysis.
- **FR-002**: System MUST expose analyzer outputs as typed data reusable by CLI and dashboard surfaces.
- **FR-003**: Exposure analysis MUST report total, unique, repeated, replay ratio, context efficiency, artifact count, and request count.
- **FR-004**: Cache analysis MUST report provider usage totals and attribution coverage.
- **FR-005**: Analyzer reports MUST document that local artifact attribution is estimated based on local tokenizer counts.
- **FR-006**: Reports MUST distinguish exposure, persistence, uncached cost, and context clutter rather than treating replay as inherently bad.
- **FR-007**: Analyzer modules MUST be testable with synthetic canonical fixtures.

### Key Entities

- **Analyzer**: A module that derives one result from canonical run data.
- **AnalyzerResult**: Typed output consumed by CLI, dashboard, or exports.
- **AttributionDocumentation**: Plain-language caveat explaining provider totals vs local artifact estimates.
- **ArtifactAggregate**: Per-artifact totals, replay, cache attribution, metadata, and inclusion span.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Existing summary output can be reproduced from analyzer results.
- **SC-002**: Analyzer tests cover exact, under-attributed, and over-attributed prompt-coordinate cases.
- **SC-003**: Adding a new analyzer does not require changing source adapters.
- **SC-004**: Reports document that local artifact attribution is estimated based on local tokenizer counts.

## Assumptions

- Local tokenizer counts remain estimates.
- Provider usage events may not be available for every source adapter.
- Analyzer output schemas can evolve with explicit versioning.
