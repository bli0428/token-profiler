# Feature Specification: Consistent Capture Records And Privacy Modes

**Feature Branch**: `001-canonical-event-schema-privacy`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Extensibility that cleanly supports metadata-only, preview, and raw-content modes; separate captured facts from derived metrics; make privacy policy explicit."

## User Scenarios & Testing

### User Story 1 - Understand What Was Captured (Priority: P1)

A user can inspect a captured session and understand the major kinds of information recorded for each model request: what was included, how large it was, where it came from, and whether it was provider-reported or locally derived.

**Why this priority**: The tool is only useful if captured data has consistent meaning across reports and future product surfaces.

**Independent Test**: Capture or load a representative session and verify that every request and captured item can be explained in a consistent, documented way.

**Acceptance Scenarios**:

1. **Given** a captured session, **When** the user reviews the stored records, **Then** each request and captured item has stable identifiers, timing, source, and size information.
2. **Given** provider-reported usage is available, **When** the user reviews the session, **Then** provider totals are distinguishable from locally derived item-level attribution.
3. **Given** an older captured session, **When** the user opens it, **Then** the system either reads it successfully or explains why the older format is unsupported.

---

### User Story 2 - Choose Local Retention Level (Priority: P1)

A user can choose how much captured content is retained locally: metadata only, bounded previews, or full raw content.

**Why this priority**: The tool observes sensitive agent context. Users need control over whether the local machine stores only operational facts or creates a transcript-like archive.

**Independent Test**: Capture the same representative request using each retention level and compare what is stored locally.

**Acceptance Scenarios**:

1. **Given** metadata-only mode, **When** an item is captured, **Then** no raw prompt, message, patch body, or command output text is retained.
2. **Given** preview mode, **When** a large item is captured, **Then** only bounded excerpts and derived facts are retained.
3. **Given** raw-content mode, **When** an item is captured, **Then** the full captured content is retained and clearly marked as raw local content.

---

### User Story 3 - Add New Captured Item Types Safely (Priority: P2)

A developer can add support for new kinds of captured items without making existing reports ambiguous or breaking older sessions.

**Why this priority**: The project needs to grow from Codex-focused MVP capture toward multiple agent environments and richer artifact explanations.

**Independent Test**: Add a representative new item kind and verify existing session summaries still work while the new item receives clear labels and retention-level behavior.

**Acceptance Scenarios**:

1. **Given** a new captured item kind, **When** it is stored, **Then** it includes enough documented facts for reports to identify it without raw content.
2. **Given** older reports do not know about the new item kind, **When** they read a session, **Then** they ignore unsupported details without corrupting totals.

### Edge Cases

- Older captured sessions may lack newer privacy-mode fields.
- A single session may contain records produced by multiple tool versions.
- Preview mode may encounter very large, binary-looking, or unusual text content.
- Raw-content mode must never become active accidentally through missing or ambiguous configuration.

## Requirements

### Functional Requirements

- **FR-001**: System MUST define consistent record requirements for captured requests, captured items, and provider usage.
- **FR-002**: System MUST distinguish captured facts from derived report metrics.
- **FR-003**: System MUST record which local retention level was used for each captured item.
- **FR-004**: System MUST default to metadata-only retention.
- **FR-005**: System MUST require explicit user action for preview and raw-content retention.
- **FR-006**: System MUST preserve stable item identity across repeated appearances in a session.
- **FR-007**: System MUST support older captured sessions where feasible and report clear errors where not feasible.
- **FR-008**: System MUST document that local artifact attribution is estimated based on local tokenizer counts.

### Key Entities

- **Captured Session**: A group of related model requests analyzed together.
- **Captured Request**: One model request observed by the tool.
- **Captured Item**: One piece of context included in a request, such as a message, command output, tool call, patch, or instruction.
- **Provider Usage**: Token usage reported by the model provider for a request.
- **Retention Level**: The user's chosen local retention behavior: metadata only, preview, or raw content.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can identify the retention level for every captured item in a representative session.
- **SC-002**: Metadata-only mode stores no raw content for prompts, messages, command outputs, or patches.
- **SC-003**: Preview mode stores only bounded excerpts for large captured items.
- **SC-004**: Existing captured sessions can still be summarized after the record requirements are introduced.
- **SC-005**: User-facing documentation states that local artifact attribution is estimated based on local tokenizer counts.

## Assumptions

- Provider-reported request totals remain available for at least some captured sessions.
- Metadata-only remains the safest default for local capture.
- Raw-content retention is useful for debugging but must be treated as sensitive.
