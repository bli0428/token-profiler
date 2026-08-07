# Feature Specification: Session Catalog

**Created**: 2026-07-25

## User Scenarios & Testing

### User Story 1 - Open the dashboard promptly (Priority: P1)

An investigator opening the dashboard sees the newest session page promptly, regardless of how many old runs or event bytes are stored locally.

**Independent Test**: A root containing an oversized event file returns a session page without reading that file.

### User Story 2 - See indexed session metrics (Priority: P2)

After catalog indexing completes, an investigator sees persisted request, artifact, and token summaries without re-analyzing event logs on every refresh.

**Independent Test**: A second session-index request reads the catalog and does not invoke the event reader.

## Requirements

- **FR-001**: Session-list reads MUST use a root-level persisted catalog when it is current.
- **FR-002**: A missing or stale catalog MUST return a newest-first stat-only page immediately and rebuild the catalog without blocking that response.
- **FR-003**: Catalog entries MUST be invalidated when an event file's size or modified time changes.
- **FR-004**: Catalog rebuild MUST reuse the canonical large-run summary path and retain existing privacy-safe session fields.

## Success Criteria

- **SC-001**: Initial session-list rendering does not read event-file contents.
- **SC-002**: A warm session-list request performs no per-run event analysis.

## Assumptions

- A first dashboard visit may show stat-only rows while catalog indexing occurs in the local process.
- Large-run request and artifact paging remain owned by features 020–022.
