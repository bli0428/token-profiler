# Feature Specification: Canonical Event Schema And Privacy Modes

**Feature Branch**: `001-canonical-event-schema-privacy`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Start over with extensibility that cleanly supports metadata-only, preview, and raw-content modes; separate derived metrics from capture; make privacy policy explicit."

## User Scenarios & Testing

### User Story 1 - Stable Canonical Events (Priority: P1)

A developer can inspect a captured run and see request, artifact, usage, and metadata records that follow a documented schema instead of ad hoc JSON objects.

**Why this priority**: All future adapters, analyzers, and dashboards depend on a stable event contract.

**Independent Test**: Capture or synthesize a run and validate every JSONL event against the canonical schema.

**Acceptance Scenarios**:

1. **Given** a metadata-only captured request, **When** events are stored, **Then** every artifact event includes stable identifiers, token estimate fields, content hash, source metadata, and no raw content.
2. **Given** a usage event from a provider response, **When** it is stored, **Then** request-level input, cached input, uncached input, output, and total token fields are represented in the canonical usage shape.
3. **Given** an older event file, **When** it is read, **Then** the loader either migrates it to the current in-memory shape or reports a precise schema compatibility error.

---

### User Story 2 - Explicit Privacy Modes (Priority: P1)

A user chooses whether local storage records metadata only, bounded previews, or full raw content, and the stored event shape makes that choice visible.

**Why this priority**: The tool's safety model depends on avoiding accidental local transcript archives.

**Independent Test**: Run the same synthetic request through all three modes and compare stored fields.

**Acceptance Scenarios**:

1. **Given** metadata-only mode, **When** a prompt artifact is captured, **Then** no raw text or bounded preview is stored.
2. **Given** preview mode, **When** a large command output is captured, **Then** only configured head/tail snippets and derived stats are stored.
3. **Given** raw mode, **When** content is captured, **Then** the event records the full normalized content and a `storage_mode` value indicating raw retention.

---

### User Story 3 - Schema-First Metadata Extensions (Priority: P2)

A developer can add new metadata fields for patches, commands, tool schemas, and task grouping without changing analyzer logic or inventing untracked fields.

**Why this priority**: Legibility and adapter extensibility require typed metadata variants.

**Independent Test**: Add a new metadata variant in tests and verify it is accepted by schema validation and ignored safely by unrelated analyzers.

**Acceptance Scenarios**:

1. **Given** an exec output artifact, **When** it is captured, **Then** command, workdir, exit code, output preview, and truncation fields follow the exec metadata schema.
2. **Given** an apply-patch artifact, **When** it is captured, **Then** touched files, add/update/delete counts, and patch summary follow the patch metadata schema.

### Edge Cases

- Older event files lack `storage_mode` and typed metadata discriminators.
- Preview mode must handle binary-looking or non-UTF-8 content safely after request decoding.
- Raw mode must not accidentally become the default through config merge or missing option values.
- Event records may contain metadata from multiple proxy versions in the same run.

## Requirements

### Functional Requirements

- **FR-001**: System MUST define canonical schemas for artifact events, request usage events, request timeline entries, and analyzer outputs.
- **FR-002**: System MUST record a storage/privacy mode for each captured artifact event.
- **FR-003**: System MUST default to metadata-only storage.
- **FR-004**: System MUST require explicit user configuration for preview and raw-content storage.
- **FR-005**: System MUST support schema validation in tests and in developer-facing diagnostics.
- **FR-006**: System MUST preserve content hashing regardless of storage mode.
- **FR-007**: System MUST support backwards-compatible loading of current MVP event files where feasible.
- **FR-008**: System MUST distinguish provider-reported usage from locally estimated artifact attribution.

### Key Entities

- **ArtifactEvent**: One observed piece of context included in a request.
- **RequestUsageEvent**: Provider-reported token usage for a model request.
- **ArtifactMetadata**: Typed details about command, patch, tool, message, reasoning, or system artifacts.
- **StoragePolicy**: The selected privacy mode and limits used when capturing content.
- **ContentPreview**: Bounded non-raw excerpts plus derived stats.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of events written by the proxy validate against documented schemas in tests.
- **SC-002**: Metadata-only mode stores zero raw content fields for prompt, message, command output, and patch artifacts.
- **SC-003**: Preview mode enforces configured character/token limits in tests.
- **SC-004**: Existing MVP event files can still be summarized without manual migration.

## Assumptions

- TypeScript or JavaScript with runtime validation is acceptable for the next architecture.
- Provider usage totals remain authoritative.
- JSONL remains supported during the transition even if SQLite becomes the preferred store later.

