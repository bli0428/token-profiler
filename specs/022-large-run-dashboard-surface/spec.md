# Feature Specification: Large Run Dashboard Surface

**Created**: 2026-07-24

## User Scenarios & Testing

### User Story 1 - Explore an available large run (Priority: P1)

An investigator selecting a large session sees an explicit paged-run experience, can load more requests, and can expand request artifacts.

**Independent Test**: A dashboard fixture renders the paged overview and uses only API-provided fields.

## Requirements

- **FR-001**: Render an explicit large-run state instead of the normal full-run explorer.
- **FR-002**: Load subsequent request and artifact pages on user action.
- **FR-003**: Do not infer grouping or privacy facts in the browser.

## Success Criteria

- **SC-001**: A user can navigate a large session without a browser response containing all artifacts.
