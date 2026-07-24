# Feature Specification: Large Run Artifact Pages

**Created**: 2026-07-24

## User Scenarios & Testing

### User Story 1 - Inspect a selected request (Priority: P1)

An investigator selects a request from a large-run request page and can page through only that request's included artifacts.

**Independent Test**: A selected request returns artifact pages with stable order, privacy-safe display fields, and no artifacts from another request.

## Requirements

- **FR-001**: Provide a cursor-paginated request-artifact API contract.
- **FR-002**: Preserve metadata-only, preview, and raw-content privacy behavior.
- **FR-003**: Keep full artifact-detail aggregation out of the large-run path.

## Success Criteria

- **SC-001**: An investigator can identify the large context contributors of one request without downloading the run-wide artifact list.
