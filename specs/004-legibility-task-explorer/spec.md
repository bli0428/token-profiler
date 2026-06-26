# Feature Specification: Legibility And Task Explorer

**Feature Branch**: `004-legibility-task-explorer`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Get more clarity into what each task/tool call did; turn input:custom_tool_call:325 and tool:exec_command:call_* into readable work units."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Readable Work Unit Labels (Priority: P1)

A user reviewing token-heavy artifacts can understand each row as a command, patch, tool call, message, file, or unknown item instead of seeing only opaque identifiers such as `input:custom_tool_call:325` or `tool:exec_command:call_*`.

**Why this priority**: The tracker is only actionable when users can recognize what consumed context. Opaque rows force users to inspect raw logs or guess which activity created the cost.

**Independent Test**: Capture or load a fixture containing command calls, command outputs, patch calls, assistant messages, and unknown artifacts; verify top-contributor and legibility views show readable labels while preserving stable identifiers.

**Acceptance Scenarios**:

1. **Given** a command tool call with a captured command string, **When** a user views a contributor row for that work, **Then** the row label starts with the command or a concise command summary and still exposes the stable artifact identifier in detail.
2. **Given** a command output linked to a command call, **When** a user views the output artifact, **Then** the output label inherits the command, work directory when available, and output/exit context when available.
3. **Given** a patch-style tool call, **When** a user views its artifact row, **Then** the label identifies it as a patch and summarizes touched files or patch shape.
4. **Given** an artifact whose type is known but details are unavailable, **When** it appears in the report, **Then** the row uses the best known category label and explains which details are missing.
5. **Given** two artifacts with similar readable labels, **When** they appear together, **Then** the user can distinguish them using short stable IDs, timestamps, request position, or other non-sensitive context.

---

### User Story 2 - Artifact Drilldown (Priority: P1)

A user can open a top contributor or readable work unit and see the facts that explain what it was, when it appeared, how long it persisted, and what token/caching evidence is available.

**Why this priority**: A readable label answers "what is this?" but a drilldown answers "why did this matter?" and "where did it show up?"

**Independent Test**: Run artifact detail on fixture artifacts for a command output, patch, message, and unknown artifact; verify each detail view includes available identity, timing, exposure, persistence, and caveat information without requiring raw content.

**Acceptance Scenarios**:

1. **Given** a command output artifact, **When** the user opens detail, **Then** they see command, work directory, exit status, output preview if permitted, inclusion count, first seen, last seen, exposure, repeated exposure, and cache attribution state when available.
2. **Given** a patch artifact, **When** the user opens detail, **Then** they see patch action, touched file count, touched file names when permitted, add/update/delete shape when available, and inclusion history.
3. **Given** a message or file artifact, **When** the user opens detail, **Then** they see the artifact category, request association, visibility/storage mode, exposure metrics, and any permitted preview or summary.
4. **Given** an artifact without readable metadata, **When** the user opens detail, **Then** the detail view still shows stable identity, token/exposure evidence, persistence evidence, and a plain explanation of why richer details are unavailable.
5. **Given** local attribution is estimated, **When** the detail view shows artifact-level cache or uncached-token evidence, **Then** it also shows the attribution caveat and does not present those values as provider-reported facts.

---

### User Story 3 - Task And Story Grouping (Priority: P2)

A user can view a long session as a sequence of task groups, with related prompts, assistant turns, tool calls, tool outputs, patches, and artifacts grouped into readable phases of work.

**Why this priority**: Long sessions often contain multiple goals. The user needs to understand which phase produced token exposure and repeated context, not only which individual artifact was large.

**Independent Test**: Load a fixture with multiple user prompts and interleaved tool sequences; verify groups are created in chronological order, metrics roll up per group, and artifacts remain traceable back to their stable IDs.

**Acceptance Scenarios**:

1. **Given** a user prompt followed by assistant work and tool activity, **When** task grouping is displayed, **Then** the group label reflects the user intent when permitted or a safe fallback when the prompt is unavailable.
2. **Given** a session with multiple user prompts, **When** groups are rendered, **Then** each group contains only the artifacts and requests associated with that phase unless continuity evidence explicitly spans groups.
3. **Given** tool calls occur between user prompts, **When** the group is summarized, **Then** it shows input, cached input, uncached input, output, exposure, repeated exposure, top artifacts, and relevant caveats where those facts are available.
4. **Given** an artifact appears in multiple task groups, **When** the user views group summaries, **Then** the artifact is counted in each group where it was included and the detail view shows cross-group persistence.
5. **Given** a grouping decision is heuristic or incomplete, **When** the user views the group, **Then** the uncertainty is visible rather than hidden.

---

### User Story 4 - Privacy-Aware Legibility (Priority: P2)

A user can improve report clarity without accidentally exposing raw prompts, command outputs, file contents, or other sensitive text beyond the run's selected storage mode.

**Why this priority**: Legibility must not turn metadata-only capture into transcript archival. Users need useful explanations and visible privacy boundaries.

**Independent Test**: Run the same fixture in metadata-only, preview, and raw-content modes; verify labels, details, previews, and task names respect the selected mode.

**Acceptance Scenarios**:

1. **Given** metadata-only storage, **When** a user views labels or task groups, **Then** the system uses safe summaries, categories, IDs, timestamps, and structural metadata without displaying raw content.
2. **Given** preview storage is enabled, **When** a user opens detail, **Then** permitted previews are visibly marked as previews and may be truncated.
3. **Given** raw content is available, **When** the user opens detail, **Then** raw or near-raw text is only shown in views that explicitly expose it.
4. **Given** a user prompt is unavailable because of privacy mode, **When** a task group needs a name, **Then** it uses a non-sensitive fallback label and explains that the original prompt was not stored.

### Edge Cases

- A tool output has no matching call item in the same run.
- A tool call has no captured output because the command failed, was interrupted, or was still pending when capture stopped.
- Imported logs contain command output artifacts but omit command strings, work directories, or exit statuses.
- Multiple commands use identical command strings but occur in different requests or directories.
- Long command labels, long file paths, and long prompts need truncation that preserves the most useful distinguishing information.
- Artifacts are captured before richer metadata is available, then later records provide better labels for the same stable identity.
- A task spans multiple requests, multiple assistant turns, or a user correction that changes the goal midstream.
- A task group has no stored user prompt because metadata-only mode was used.
- A run mixes old records with no legibility metadata and new records with rich metadata.
- Local tokenization or cache attribution is partial, unavailable, or based on estimates.
- Provider or tool names are unfamiliar, unavailable, or provider-specific but must still be presented through canonical categories.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST assign a readable display category to every artifact, using categories such as command, command output, patch, tool call, assistant message, user message, file/context item, request metadata, or unknown.
- **FR-002**: System MUST derive the most specific safe display label available for supported artifacts and fall back to stable identifiers when details are unavailable.
- **FR-003**: System MUST preserve and expose stable artifact identifiers in detail views so readable labels never replace traceability.
- **FR-004**: System MUST link tool outputs to their corresponding tool calls when a stable call relationship is available.
- **FR-005**: System MUST keep unmatched tool calls and unmatched tool outputs visible, marked as unmatched, and included in relevant exposure summaries.
- **FR-006**: System MUST prefer richer later metadata over older generic labels for the same stable artifact identity, while keeping deterministic results.
- **FR-007**: System MUST provide artifact detail data that includes identity, readable label, category, known tool facts, inclusion count, first seen, last seen, exposure metrics, repeated-exposure metrics, attribution state, privacy/storage mode, and caveats where available.
- **FR-008**: System MUST provide command details when available, including command string or summary, work directory, exit status, output preview permission state, and linked output/call relationship.
- **FR-009**: System MUST provide patch details when available, including touched file names or counts, patch action/shape, and whether file-level details were unavailable or hidden.
- **FR-010**: System MUST provide safe fallback details for artifacts with incomplete metadata, including the reason richer details are unavailable where that reason can be known.
- **FR-011**: System MUST group session activity into chronological task groups based on user-intent boundaries, request order, and available continuity evidence.
- **FR-012**: System MUST label task groups with the best safe summary available and use non-sensitive fallback labels when prompt text is unavailable.
- **FR-013**: System MUST roll up per-task metrics for input, cached input, uncached input, output, total exposure, repeated exposure, artifact count, top artifacts, and caveats where those facts are available.
- **FR-014**: System MUST show when task grouping is complete, partial, or heuristic so users know how much confidence to place in a group boundary.
- **FR-015**: System MUST let report and dashboard consumers request artifact detail by stable ID and by readable label match.
- **FR-016**: System MUST work in metadata-only mode without requiring raw prompts, raw command output, raw file contents, or raw assistant text.
- **FR-017**: System MUST respect storage/privacy mode when showing previews, prompt labels, command output snippets, file names, or raw content.
- **FR-018**: System MUST visibly distinguish provider-reported totals from locally estimated artifact-level attribution whenever cache or uncached-token evidence appears in legibility or task views.
- **FR-019**: System MUST produce deterministic ordering for readable artifact rows, task groups, and equally ranked contributors.
- **FR-020**: System SHOULD support concise search or filtering by readable label, artifact category, tool name, task group, and stable ID.
- **FR-021**: System SHOULD surface a small set of highest-value opaque artifacts so users know what remains unexplained.
- **FR-022**: System SHOULD support richer previews when preview or raw-content modes permit them, while preserving metadata-only behavior as the baseline.

### Key Entities *(include if feature involves data)*

- **ReadableArtifact**: A canonical artifact with a safe display category, readable label, stable identity, privacy state, and available explanatory metadata.
- **ToolCallLink**: A relationship between a tool call artifact and one or more related output/result artifacts, including match confidence and unmatched state.
- **ArtifactDetail**: The drilldown facts for one artifact, including identity, category, metrics, persistence, known tool facts, preview permission state, and caveats.
- **TaskGroup**: A chronological work phase that contains related requests, messages, tool calls, tool outputs, patches, artifacts, rolled-up metrics, and grouping confidence.
- **LegibilityCaveat**: A user-visible explanation for missing labels, unmatched calls, estimated attribution, privacy-hidden details, old record formats, or heuristic grouping.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In supported fixture runs, at least 90% of command, command output, and patch artifacts display readable labels instead of only opaque call IDs.
- **SC-002**: For supported command output fixtures with matching call information, artifact detail identifies the associated command and work directory when those facts were captured.
- **SC-003**: For supported patch fixtures, artifact detail identifies touched file information or an explicit privacy/unavailable explanation for at least 90% of patch artifacts.
- **SC-004**: A metadata-only multi-prompt fixture can be summarized into chronological task groups without displaying raw prompts or raw tool output.
- **SC-005**: Mixed-version fixture runs prefer richer labels when available while keeping old opaque artifacts visible and explainable.
- **SC-006**: For any artifact-level cache or uncached-token estimate shown in legibility or task views, the attribution caveat is visible in the same detail context.
- **SC-007**: Users can move from a top-contributor row to artifact detail and back to the associated task group using stable identity information.
- **SC-008**: Repeated runs over the same fixture produce the same readable labels, task group ordering, and tie-breaking order.

## Assumptions

- Existing canonical records provide enough request ordering, artifact identity, storage mode, and token/exposure facts to support baseline legibility.
- Some provider/tool artifacts will remain opaque; the product should expose that honestly rather than inventing detail.
- Metadata-only mode remains the baseline privacy mode, so raw text must not be required for labels, drilldowns, or task grouping.
- Preview mode may improve detail quality but is not required for the minimum useful version.
- Task grouping starts with explicit user/request boundaries where available and uses visible heuristic confidence when exact intent boundaries are unavailable.
- Local artifact attribution remains estimated; provider-reported request totals remain the authoritative usage totals when present.
- This feature depends on the canonical event, source capture, analyzer pipeline, and module-boundary work described in specs 001, 002, 003, and 006.
