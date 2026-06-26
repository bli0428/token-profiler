# Feature Specification: Source Adapters And Capture Boundaries

**Feature Branch**: `002-source-adapters-capture`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Support Codex CLI/app and local log capture now, while leaving clean source-adapter seams so Claude Code or provider-compatible sources can be added later without touching Codex-specific code or analyzers."

**Sequencing**: Build on the canonical record and privacy behavior from spec 001. Do substantial implementation after the module-boundary migration in spec 006 has established clear source, canonical, analyzer, and surface ownership areas.

## User Scenarios & Testing

### User Story 1 - Capture Codex Activity Without Changing The Session (Priority: P1)

A user can route Codex CLI or the Codex app through local capture and later review the same request, response, usage, and artifact facts as canonical records without disrupting the live Codex session.

**Why this priority**: Codex capture is the first practical source for understanding real agent context behavior. The feature is not trustworthy unless capture is transparent to the active workflow.

**Independent Test**: Run a representative Codex session through local capture and verify that the user receives the original response stream while the captured session contains canonical request, usage, artifact, tool call, and privacy-mode records.

**Acceptance Scenarios**:

1. **Given** Codex is configured for local capture, **When** it sends a streaming request, **Then** the user receives the upstream response without capture-visible mutation, truncation, or ordering changes.
2. **Given** a captured Codex request includes messages, instructions, tool calls, and tool outputs, **When** the session is reviewed, **Then** each captured item appears as a canonical record with stable identity, source, timing, size, and privacy-mode facts.
3. **Given** a Codex tool output follows a matching tool call, **When** the records are reviewed, **Then** the output preserves the available call identity and inherited context needed to explain the pair.
4. **Given** capture is unavailable or misconfigured, **When** Codex starts or sends a request, **Then** the user receives a clear local diagnostic rather than silent partial capture.

---

### User Story 2 - Import Local Logs With Completeness Notes (Priority: P1)

A user can import local Codex rollout logs or similar historical files and reconstruct the request timeline, usage, artifacts, and tool activity that the source makes available.

**Why this priority**: Users need to analyze past sessions and recover visibility when live capture was not active, while understanding that log-derived data may be less complete than live capture.

**Independent Test**: Import representative local log fixtures with complete, partial, malformed, and mixed-version events, then verify that canonical records are created for valid source facts and that limitations are visible for missing facts.

**Acceptance Scenarios**:

1. **Given** a local log contains request and usage events, **When** it is imported, **Then** the resulting session contains canonical request and usage records marked as imported from a log source.
2. **Given** a local log contains tool calls, tool outputs, or response items, **When** it is imported, **Then** available tool identity, result size, and task metadata are preserved as canonical records.
3. **Given** a local log lacks exact prompt composition or item ordering, **When** the session is reviewed, **Then** the user can see which completeness limitations apply to that source.
4. **Given** a local log contains malformed, unsupported, or mixed-version entries, **When** it is imported, **Then** valid entries are preserved where possible and rejected entries are reported with enough detail for the user to resolve the import.

---

### User Story 3 - Preserve A Future Claude Code Adapter Seam (Priority: P2)

A developer can verify that a future Claude Code adapter would live behind the source-adapter boundary and emit canonical records without requiring changes to Codex capture, Codex log import, analyzers, or report surfaces.

**Why this priority**: Claude Code functionality does not need to be built in this feature, but the architecture should avoid coupling future Claude work to Codex-specific modules.

**Independent Test**: Add a fixture-only non-Codex adapter stub that emits representative canonical records and limitation notes, then verify existing Codex capture/import code remains unchanged and analyzers consume only canonical records.

**Acceptance Scenarios**:

1. **Given** a future Claude Code adapter is planned, **When** a developer identifies where it would belong, **Then** the target boundary is separate from Codex live capture and Codex log import.
2. **Given** a fixture-only non-Codex adapter stub emits canonical request, artifact, usage, and limitation records, **When** analyzers run, **Then** they require no source-specific logic.
3. **Given** a future source omits exact prompt composition or tool metadata, **When** records are reviewed, **Then** the limitation model can disclose that gap without changing Codex-specific behavior.
4. **Given** the future adapter seam is validated, **When** the feature is considered complete, **Then** no working Claude Code capture or import workflow is required.

---

### User Story 4 - Add Provider-Compatible Sources Safely (Priority: P2)

A developer can add a provider-compatible capture or import source that emits canonical records and source limitations without requiring analyzer changes.

**Why this priority**: The project needs to grow beyond the first two agent environments while protecting the architecture boundary between source-specific payloads and provider-agnostic insight.

**Independent Test**: Add a fixture-only provider-compatible source and verify it can produce canonical records, declare limitations, honor privacy modes, and run through existing analyzer fixtures without importing source-specific payloads.

**Acceptance Scenarios**:

1. **Given** a new provider-compatible source is added, **When** it observes or imports a session, **Then** it emits canonical request, usage, artifact, and limitation records for the facts it can support.
2. **Given** the new source has fields that do not map to known canonical facts, **When** records are stored, **Then** those source-specific payloads do not leak into analyzer-visible records.
3. **Given** analyzer tests run after the new source is added, **When** reports are generated, **Then** existing analyzers continue to consume canonical records only.
4. **Given** a source cannot provide a required fact for a report, **When** that report renders, **Then** the missing fact is shown as unavailable with a source limitation rather than estimated without disclosure.

---

### User Story 5 - Retire Legacy Capture Modules Into Domains (Priority: P2)

A developer can complete this feature and see that legacy top-level source-capture modules have moved into their owning domains, leaving no mixed-responsibility Codex capture, import, config, or session-routing files at the source root.

**Why this priority**: The existing MVP already contains working capture behavior, but leaving it in top-level legacy files would preserve the coupling this feature is meant to remove.

**Independent Test**: Inspect the source tree and import graph after the feature is complete, then verify capture and import behavior lives under source-adapter domains, canonical writing lives under the canonical domain, and surface commands contain only command orchestration.

**Acceptance Scenarios**:

1. **Given** existing top-level capture helpers exist before migration, **When** spec 002 is complete, **Then** Codex capture extraction, request recording, usage recording, session routing, Codex config mutation, and Codex log import behavior live under their appropriate source-adapter or surface domains.
2. **Given** public imports still need compatibility, **When** top-level compatibility files remain, **Then** they are thin re-exports only and do not contain provider-specific logic.
3. **Given** a developer searches source root for Codex capture/import implementation, **When** the migration is complete, **Then** they find either no top-level implementation files or only documented compatibility wrappers.
4. **Given** existing Codex capture and import tests run after migration, **When** they pass, **Then** behavior has been preserved while ownership moved to the target domains.

### Edge Cases

- Local capture starts while an older capture process is still shutting down.
- A request or response body is unavailable, compressed, binary-looking, unusually large, or only partially observable.
- Codex CLI and Codex app provide different session identifiers, headers, or startup behavior.
- Source data contains multiple requests with the same apparent timestamp or missing request identifiers.
- A single session contains records produced by multiple source versions.
- Imported files include valid events interleaved with unsupported, malformed, duplicated, or out-of-order entries.
- Provider-reported usage is missing, delayed, split across events, or inconsistent with locally observed artifacts.
- A source exposes tool outputs but not the original tool call, or exposes tool calls without outputs.
- The selected privacy mode prevents retaining raw content needed for later debugging.
- A future Claude Code or provider-compatible source claims compatibility but omits facts needed for full context reconstruction.
- A legacy top-level file has both source-specific behavior and canonical writing behavior, making its correct destination ambiguous until responsibility boundaries are split.

## Requirements

### Functional Requirements

- **FR-001**: System MUST define source adapters as the only boundary where provider-specific capture, import, or payload interpretation occurs.
- **FR-002**: System MUST ensure analyzers and report surfaces consume canonical records and source limitation records rather than provider-specific payloads.
- **FR-003**: Codex live capture MUST preserve the user's request and response experience, including streaming order and content, while producing canonical records locally.
- **FR-004**: Codex live capture MUST support both one-off and persistent user workflows, with clear diagnostics when capture is unavailable or misconfigured.
- **FR-005**: System MUST support importing local log files for supported sources and MUST mark imported sessions distinctly from live-captured sessions.
- **FR-006**: Source adapters MUST record source identity, source version when known, capture method, capture time, and known completeness limitations for every captured or imported session.
- **FR-007**: Source adapters MUST honor the selected privacy mode for every artifact they emit, including metadata-only, preview, and raw-content behavior.
- **FR-008**: Source adapters MUST preserve stable identity and relationships for requests, artifacts, tool calls, tool outputs, usage records, and capture sessions when the source provides enough information.
- **FR-009**: Tool call outputs MUST inherit available metadata from paired tool calls, and unpaired calls or outputs MUST be explicitly represented as incomplete rather than silently dropped.
- **FR-010**: Importers MUST preserve valid supported records from mixed-quality inputs where feasible and MUST report rejected or unsupported entries.
- **FR-011**: Source adapters MUST disclose when prompt composition, item ordering, token usage, cache status, or tool metadata is partial, unavailable, or estimated.
- **FR-012**: System MUST provide a future-source acceptance path that proves a new source can emit canonical records, declare limitations, honor privacy modes, and require no analyzer-specific provider logic.
- **FR-013**: System MUST keep raw provider payloads out of persisted analyzer-visible records unless the user has explicitly selected a privacy mode that allows raw local content retention.
- **FR-014**: System MUST support sessions containing records from multiple adapter versions without corrupting existing captured or imported data.
- **FR-015**: Future Claude Code support MUST be addable as a separate source adapter without modifying Codex live capture, Codex log import, or Codex-specific configuration behavior.
- **FR-016**: Completion of this feature MUST migrate legacy top-level capture/import/config/session modules into their appropriate source, canonical, or surface domains, or reduce retained top-level files to documented thin compatibility re-exports.

### Key Entities

- **Source Adapter**: A source-specific capture or import boundary that observes external activity and emits canonical records plus limitation notes.
- **Capture Session**: A group of related captured or imported requests from one user workflow, including source identity, method, privacy mode, and adapter version facts.
- **Source Limitation**: A disclosed gap, uncertainty, or partial-observability note that affects how complete or comparable a captured session is.
- **Canonical Request**: A provider-agnostic request record that can be analyzed independently of the original source payload.
- **Canonical Artifact**: A provider-agnostic item included in context, such as a message, instruction, file excerpt, command output, tool call, or tool output.
- **Canonical Usage**: Provider-reported or source-observed usage facts associated with a request, marked so users can distinguish reported totals from local estimates.
- **Future Source Adapter Seam**: The documented source boundary and acceptance criteria that allow later adapters, including Claude Code, to be added without changing Codex-specific modules.
- **Legacy Capture Module**: Existing top-level MVP code that already performs capture, import, session routing, config mutation, or canonical event writing and must be moved or split by ownership.
- **Provider-Compatible Source**: A source whose external protocol or local files resemble a supported provider but still must prove its own canonical mapping and limitations.
- **Provider Payload**: The raw source-specific request, response, telemetry event, or log entry before normalization; this data belongs only at the source boundary unless privacy settings explicitly permit retention.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A representative live Codex capture produces canonical request, usage, artifact, tool call, and privacy-mode records while the user receives an unchanged streamed response.
- **SC-002**: Representative Codex log fixtures normalize into the same canonical record categories as live Codex capture and can be analyzed by the same reports.
- **SC-003**: Every captured or imported session in the fixture suite displays source identity, capture method, privacy mode, and any known completeness limitations.
- **SC-004**: Analyzer checks for this feature pass without importing provider-specific source modules or raw provider payload structures.
- **SC-005**: Mixed-quality import fixtures preserve valid supported entries and report unsupported or malformed entries without corrupting the resulting session.
- **SC-006**: Adding a fixture-only non-Codex adapter stub requires no Codex-specific code changes, no analyzer requirement changes, and produces a visible limitation when a report fact is unavailable.
- **SC-007**: Restarting local capture or mixing adapter versions does not require deleting existing captured session data.
- **SC-008**: Source-root legacy capture/import/config/session implementation files are removed, moved, split, or reduced to thin compatibility re-exports while existing Codex capture and import behavior remains testable.

## Assumptions

- Canonical record definitions and privacy-mode behavior from spec 001 are available before this feature is planned in detail.
- The module-boundary migration from spec 006 will establish the source and analyzer ownership areas before substantial adapter work begins.
- Codex remains observable through local routing, local configuration, or wrapper-style workflows.
- Claude Code capture or import functionality is out of scope for this feature; only the future adapter seam is in scope.
- Provider-compatible sources may vary in completeness even when their request or log shape is familiar.
- Metadata-only remains the default local retention mode for source adapters.
- Provider APIs and local log formats may change, so adapter diagnostics and limitation notes are part of the user-facing value.
