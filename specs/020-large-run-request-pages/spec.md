# Feature Specification: Large Run Request Pages

**Created**: 2026-07-24

## User Scenarios & Testing

### User Story 1 - Page through recent requests (Priority: P1)

An investigator opens an available large session and receives a newest-first, bounded request page showing provider token usage, turn identity, and artifact count.

**Independent Test**: Adjacent pages return distinct requests in stable order without loading the complete artifact history.

## Requirements

- **FR-001**: Provide an API-owned, opaque-cursor request page for a large run.
- **FR-002**: Return at most the requested page size and reject invalid cursors clearly.
- **FR-003**: Preserve canonical provider-usage and turn-identity facts without exposing provider payloads.

## Success Criteria

- **SC-001**: An investigator can identify the newest high-input request in a 1 GB+ run from the first page.
