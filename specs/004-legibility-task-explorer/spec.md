# Feature Specification: Legibility And Task Explorer

**Feature Branch**: `004-legibility-task-explorer`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Get more clarity into what each task/tool call did; turn input:custom_tool_call:325 and tool:exec_command:call_* into readable work units."

## User Scenarios & Testing

### User Story 1 - Readable Artifact Labels (Priority: P1)

A user can read top token contributors as commands, patches, tool calls, or messages instead of opaque call IDs.

**Why this priority**: Token-heavy reports are not actionable unless rows explain what they are.

**Independent Test**: Capture fixtures with apply_patch, exec command, and paired command output events and verify readable labels.

**Acceptance Scenarios**:

1. **Given** an apply_patch custom tool call, **When** it is captured, **Then** the artifact label names the patch action and touched files.
2. **Given** an exec command output, **When** it is captured, **Then** the output label inherits the paired command string and workdir.
3. **Given** an older generic artifact later receives better metadata, **When** aggregation runs, **Then** the more specific display label wins.

---

### User Story 2 - Artifact Drilldown (Priority: P1)

A user can inspect a top contributor and see command, workdir, output preview, patch files, inclusion span, and cache/exposure details.

**Why this priority**: The user needs to move from "this row is big" to "this is what was in context."

**Independent Test**: Run `explain` or the equivalent dashboard drilldown on a fixture artifact.

**Acceptance Scenarios**:

1. **Given** a command output artifact, **When** the user opens detail, **Then** they see command, workdir, exit code, preview, inclusions, first seen, and last seen.
2. **Given** a patch artifact, **When** the user opens detail, **Then** they see add/update/delete counts and touched files.

---

### User Story 3 - Task/Story Grouping (Priority: P2)

A user can view a session as phases of work, with related tool calls grouped under user prompts or inferred task windows.

**Why this priority**: The user wants insight into what each task cost, not only individual artifacts.

**Independent Test**: Use a fixture with multiple user messages and tool sequences; verify groups are created and aggregate metrics roll up.

**Acceptance Scenarios**:

1. **Given** a user prompt followed by tool calls and assistant messages, **When** task grouping runs, **Then** related artifacts are grouped under that prompt window.
2. **Given** a long session with multiple task phases, **When** the explorer renders, **Then** each phase shows input, cached, uncached, output, top artifacts, and attribution notes.

### Edge Cases

- Some tool outputs lack a matching call item in the same request.
- Command strings may be truncated or unavailable in imported logs.
- User prompts may be sensitive and unavailable in metadata-only mode.
- Multiple commands may share similar labels but different call IDs.
- Long command labels need truncation without hiding the useful part.

## Requirements

### Functional Requirements

- **FR-001**: System MUST derive display names for known artifact kinds.
- **FR-002**: System MUST join tool outputs to paired calls by call ID where available.
- **FR-003**: System MUST provide artifact detail output for CLI and dashboard consumers.
- **FR-004**: System MUST support task grouping by user prompt/request windows.
- **FR-005**: System MUST show stable IDs alongside readable labels in detail views.
- **FR-006**: System MUST work in metadata-only mode without requiring raw content.
- **FR-007**: System SHOULD add richer previews when preview mode is enabled.

### Key Entities

- **ArtifactDisplay**: Human-readable label and supporting details for an artifact.
- **ToolCallPair**: A call and output linked by call ID.
- **TaskGroup**: A time/request-bounded collection of artifacts associated with a user intent.
- **ArtifactDetail**: Drilldown view data for one artifact.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Top contributor tables replace opaque command output IDs with readable command labels for new captures.
- **SC-002**: Artifact detail identifies command/workdir or patch touched files for at least 90% of supported tool artifacts in fixture runs.
- **SC-003**: Task grouping can summarize a multi-prompt fixture without raw content storage.
- **SC-004**: Mixed-version runs prefer the most specific available label.

## Assumptions

- Some provider/tool artifacts will remain opaque; reports should say why.
- Preview mode will improve detail quality but is not required for baseline legibility.
- Task grouping begins heuristic-first and can later incorporate explicit trace/span data.
