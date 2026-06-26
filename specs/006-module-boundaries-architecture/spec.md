# Feature Specification: Module Boundaries And Architecture Migration

**Feature Branch**: `006-module-boundaries-architecture`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Make the Hybrid Local Observability Core architecture explicit and migrate the codebase toward clear module boundaries."

**Sequencing**: Execute this before substantial new adapter, analyzer,
legibility, or dashboard work.

## User Scenarios & Testing

### User Story 1 - Understand The System Shape (Priority: P1)

A developer can open the project documentation and understand how source capture,
canonical records, analyzers, and user-facing reports relate to each other.

**Why this priority**: The project will span multiple agent sources and report
surfaces. Contributors need a shared map before adding new features.

**Independent Test**: A new contributor can identify where to add a new source,
analyzer, or report surface without reading unrelated modules.

**Acceptance Scenarios**:

1. **Given** a developer wants to add a source, **When** they read the
   architecture docs, **Then** they can identify the source boundary and the
   canonical records it must emit.
2. **Given** a developer wants to add an analyzer, **When** they read the
   architecture docs, **Then** they understand that analyzers consume canonical
   records rather than provider-specific payloads.

---

### User Story 2 - Add Features Without Top-Level Sprawl (Priority: P1)

A developer can add new capture, analysis, or report behavior inside a clear
ownership area instead of adding more files to the top level.

**Why this priority**: The MVP source tree already has large files and mixed
responsibilities. Clear module boundaries reduce accidental coupling.

**Independent Test**: Move one existing capability into its target ownership area
while preserving behavior and tests.

**Acceptance Scenarios**:

1. **Given** an existing large module, **When** a focused responsibility is moved,
   **Then** public behavior remains unchanged.
2. **Given** a new module is added, **When** tests run, **Then** no analyzer imports
   provider-specific source code.

---

### User Story 3 - Preserve Incremental Delivery (Priority: P2)

A developer can migrate the source tree in small slices without blocking active
feature work.

**Why this priority**: A broad rewrite would make the project harder to review
and risk breaking working capture/report flows.

**Independent Test**: Complete one migration slice while existing CLI commands
and reports continue to work.

**Acceptance Scenarios**:

1. **Given** the source tree is partially migrated, **When** existing CLI commands
   run, **Then** they continue to work.
2. **Given** a remaining old module exists, **When** a developer reviews the
   roadmap, **Then** they can see which target area owns it.

### Edge Cases

- Existing command names and imports may be used by external scripts.
- Current JSONL runs must remain readable.
- Some migration slices may touch large files that are already over the
  responsibility guideline.
- Documentation must not imply that future SQLite migration is required before
  current MVP features can work.

## Requirements

### Functional Requirements

- **FR-001**: System MUST document the intended architecture as source capture,
  canonical records, analyzers, and surfaces.
- **FR-002**: System MUST define that provider-specific payloads terminate at
  source boundaries.
- **FR-003**: System MUST define that analyzers consume canonical records only.
- **FR-004**: System MUST provide a migration path from the current MVP source
  tree to clearer ownership areas.
- **FR-005**: System MUST preserve existing CLI behavior during migration.
- **FR-006**: System MUST keep legacy record handling separate from the new
  canonical record contract.

### Key Entities

- **Source Boundary**: The area that knows how to observe or import one provider
  or environment.
- **Canonical Boundary**: The area that owns persisted records and privacy policy.
- **Analyzer Boundary**: The area that derives metrics from canonical records.
- **Surface Boundary**: The area that renders or exports analyzer outputs.
- **Migration Slice**: A small source reorganization that preserves existing
  behavior.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Architecture documentation names all major layers and their
  responsibilities.
- **SC-002**: At least one large existing module is reduced by moving a cohesive
  responsibility into its target ownership area.
- **SC-003**: Existing tests pass after each migration slice.
- **SC-004**: No analyzer module imports provider-specific source modules after
  migration begins.

## Assumptions

- The project will remain local-first.
- JSONL remains acceptable while storage schemas stabilize.
- SQLite remains a preferred future direction, not a prerequisite for this
  migration.
