# Feature Specification: Modular Analyzer Pipeline

**Feature Branch**: `003-analyzer-pipeline`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Separate context bloat, top contributors, burn, attribution, and legibility into derived modules over metadata."

**Sequencing**: Execute after `001-canonical-event-schema-privacy` and the module-boundary work in `006-module-boundaries-architecture`. This feature depends on canonical captured records and must not consume provider-specific payloads directly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand Exposure And Replay (Priority: P1)

A user can open a report for a captured run and understand how much context was present overall, how much of it was newly introduced, and which artifacts were repeatedly carried forward across requests.

**Why this priority**: Exposure and replay are the core value of the current product. Users need to see whether a session is spending context on fresh work, useful persistence, or repeated baggage.

**Independent Test**: Analyze a representative run with repeated artifact identities, changed artifact content, and multiple requests; verify total exposure, unique exposure, repeated exposure, replay ratio, context efficiency, request count, artifact count, and top contributors.

**Acceptance Scenarios**:

1. **Given** the same artifact content appears in multiple requests, **When** exposure analysis runs, **Then** the artifact contributes once to unique exposure and each later inclusion contributes to repeated exposure.
2. **Given** an artifact keeps the same label but its content changes, **When** exposure analysis runs, **Then** the changed content is counted as a new unique exposure while preserving the relationship to the artifact identity.
3. **Given** a run contains many artifacts with different sizes and inclusion counts, **When** top contributors are shown, **Then** the user can identify which artifacts account for the largest cumulative exposure.
4. **Given** replayed content is present in a run, **When** summary metrics are displayed, **Then** the report distinguishes repeated context from a judgment that the repetition was wasteful.

---

### User Story 2 - Understand Cache And Burn Attribution (Priority: P1)

A user can compare provider-reported usage totals with local artifact-level estimates, see how much attribution coverage exists, and understand where cached, uncached, and unattributed tokens are being reported or estimated.

**Why this priority**: Token-heavy sessions become misleading if provider totals and locally estimated artifact attribution are blended together. The user needs clear caveats before making cost or efficiency decisions.

**Independent Test**: Analyze fixtures where local artifact token totals exactly match, undercount, and overcount request-level usage; verify coverage, mismatch state, provider totals, local estimates, proportional coordinate normalization for overlong reconstructed artifact ranges, and user-facing attribution notes.

**Acceptance Scenarios**:

1. **Given** provider-reported usage exists for a request, **When** cache attribution runs, **Then** the output separates provider-reported totals from locally estimated artifact contributions.
2. **Given** locally estimated artifact tokens exactly match provider-reported input tokens, **When** attribution is displayed, **Then** the report states that artifact-level allocation is still locally estimated.
3. **Given** locally estimated artifact tokens are lower than provider-reported input tokens, **When** attribution is displayed, **Then** the output reports an unattributed remainder and does not hide the gap.
4. **Given** reconstructed artifact coordinate ranges exceed provider-reported input tokens, **When** cache attribution runs, **Then** artifact ranges are proportionally scaled into the provider-reported input-token range before cached and uncached estimates are allocated.
5. **Given** provider usage is missing for some requests, **When** burn analysis runs, **Then** the output marks those requests as usage-unavailable and keeps them separate from requests with authoritative usage totals.

---

### User Story 3 - Separate Context Clutter From Useful Persistence (Priority: P2)

A user can tell whether repeated context appears to be normal task persistence, potentially stale clutter, or simply unclassified replay that needs more evidence.

**Why this priority**: The product should help users reason about context behavior without treating every repeated artifact as a problem. Some persistence is essential for long tasks.

**Independent Test**: Analyze fixtures containing artifacts that appear briefly, artifacts that persist across many requests, artifacts that disappear and later reappear, and artifacts with missing readable metadata; verify each receives an explainable persistence classification.

**Acceptance Scenarios**:

1. **Given** an artifact appears across a contiguous request span, **When** persistence analysis runs, **Then** the output reports first seen, last seen, inclusion count, and span length.
2. **Given** an artifact disappears and later reappears, **When** persistence analysis runs, **Then** the output distinguishes continuous persistence from reintroduced replay.
3. **Given** an artifact has high repeated exposure but no readable task or source metadata, **When** clutter analysis runs, **Then** the output marks the concern as uncertain rather than declaring it waste.
4. **Given** an artifact is repeatedly present near related task activity, **When** clutter analysis runs, **Then** the output can describe it as useful or normal persistence when evidence supports that classification.

---

### User Story 4 - Reuse Analyzer Results Across Surfaces (Priority: P2)

A developer or advanced user can rely on one set of analyzer outputs for CLI summaries, local dashboard views, and future exports, so each surface reports the same totals and caveats for the same run.

**Why this priority**: Multiple surfaces are on the roadmap. Users should not see different numbers because each surface recomputed the same concept differently.

**Independent Test**: Analyze the same fixture run and render the available CLI output plus a structured result export; verify metric names, totals, top contributor ordering, unavailable states, and attribution notes are consistent.

**Acceptance Scenarios**:

1. **Given** a run has analyzer results available, **When** a CLI report and another surface consume the results, **Then** the headline totals and attribution notes match.
2. **Given** an analyzer result is unavailable because required source records are missing, **When** a surface renders the report, **Then** it shows the section as unavailable or omitted with a clear reason.
3. **Given** a new analyzer is introduced, **When** existing surfaces render a run, **Then** they continue to display existing results without requiring source-adapter changes.

### Edge Cases

- Mixed-version runs may contain older records that lack newer canonical fields.
- Usage records may be missing for some requests or unavailable for some sources.
- Local artifact token estimates may undercount or overcount provider-reported request totals.
- Artifacts may share readable labels while representing different stable identities.
- The same stable artifact may gain richer metadata later in the run.
- Request ordering may contain gaps, duplicate timestamps, or imported records without precise timing.
- Metadata-only runs may lack raw content and previews, so analyzers must still provide useful metrics from captured facts.
- Very large runs should remain understandable without requiring the user to inspect raw JSONL.
- Replayed cached content may reflect necessary task continuity rather than context clutter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST derive analyzer outputs from canonical captured records only.
- **FR-002**: The system MUST keep captured facts separate from derived metrics in all user-facing output.
- **FR-003**: The system MUST produce reusable analyzer results that can be consumed by CLI reports, local dashboards, and exports without recomputing analyzer logic in those surfaces.
- **FR-004**: Exposure analysis MUST report total exposure, unique exposure, repeated exposure, replay ratio, context efficiency, artifact count, request count, and top contributors.
- **FR-005**: Exposure analysis MUST preserve stable artifact identity while distinguishing unchanged repeated content from changed content.
- **FR-006**: Top contributor analysis MUST rank artifacts by cumulative exposure and include enough identity, size, inclusion, and caveat information for a user to understand each row.
- **FR-007**: Cache and burn analysis MUST report provider-reported usage totals separately from local artifact-level estimates.
- **FR-008**: Cache and burn analysis MUST report attribution coverage for each analyzable request and for the run as a whole.
- **FR-009**: Cache and burn analysis MUST classify attribution state as exact-match, under-attributed, over-attributed, usage-unavailable, or not-applicable where those states can be determined from available records.
- **FR-010**: Cache and burn analysis MUST proportionally normalize overlong reconstructed artifact coordinate ranges to provider-reported input tokens before allocating cached and uncached estimates.
- **FR-011**: User-facing reports MUST explain that artifact-level attribution is estimated from local tokenization while provider-reported request totals remain authoritative when present.
- **FR-012**: Persistence analysis MUST report each artifact's first seen request, last seen request, inclusion count, span, and whether replay appears continuous, reintroduced, or unknown.
- **FR-013**: Context clutter analysis MUST distinguish exposure, persistence, uncached burn, and possible clutter rather than treating replay as inherently bad.
- **FR-014**: Analyzer outputs MUST include unavailable and partial-data states with user-readable reasons.
- **FR-015**: Analyzer outputs MUST be stable enough for automated comparison across fixture runs, including deterministic ordering for tied or similar contributor rows.
- **FR-016**: Analyzer results MUST support privacy-safe operation in metadata-only mode and MUST NOT require raw captured content to produce baseline metrics.
- **FR-017**: Analyzer behavior MUST be testable with synthetic canonical fixtures that cover exact, partial, missing, and contradictory data conditions.

### Key Entities *(include if feature involves data)*

- **Analyzer**: A named derivation that turns canonical run records into one focused result, such as exposure, cache attribution, persistence, or contributor ranking.
- **Analyzer Result**: Reusable output containing metrics, ranked rows, partial-data states, and user-facing caveats for one analyzer.
- **Run Analysis Summary**: The combined set of analyzer results for one captured run, including headline metrics and cross-analyzer caveats.
- **Artifact Aggregate**: Per-artifact summary containing identity, label metadata, token estimates, inclusion counts, exposure totals, replay state, attribution information, and caveats.
- **Attribution Coverage**: The relationship between provider-reported request usage and the portion that can be explained by locally estimated artifact tokens.
- **Persistence Classification**: A user-facing classification that describes whether repeated artifacts appear continuous, reintroduced, useful, uncertain, or potentially cluttered based on available evidence.
- **Analyzer Availability State**: A state describing whether an analyzer result is complete, partial, unavailable, or not applicable for a run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Existing summary output for representative captured runs can be reproduced from analyzer results without relying on source-specific payloads.
- **SC-002**: Fixture analysis covers exact-match, under-attributed, over-attributed, overlong-coordinate normalization, missing-usage, and metadata-only scenarios.
- **SC-003**: CLI and structured result consumers report matching headline totals, top contributor ordering, and attribution caveats for the same fixture run.
- **SC-004**: A new analyzer can be added without changing source-adapter behavior or requiring existing surfaces to recompute existing metrics.
- **SC-005**: User-facing output always labels local artifact attribution as estimated when provider-reported usage is shown.
- **SC-006**: For a fixture comparable to current long local sessions, a user can identify the top cumulative exposure contributors, their replay state, and their attribution caveats without opening raw event files.
- **SC-007**: Metadata-only fixture runs still produce baseline exposure, replay, top contributor, and attribution-availability results.

## Assumptions

- Canonical event schema and privacy-mode behavior from spec 001 are available before this feature is planned.
- Module boundaries from spec 006 are in place before substantial analyzer work begins.
- Provider-reported usage may be absent, incomplete, or available only at request level.
- Local tokenization remains an estimate for artifact-level attribution.
- Legibility and task-grouping improvements in spec 004 can enrich analyzer output later, but this feature must provide useful baseline metrics without them.
- Dashboard work in spec 005 consumes analyzer results rather than defining separate metric calculations.
