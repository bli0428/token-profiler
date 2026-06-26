# Feature Specification: Isolated Dashboard Frontend App

**Feature Branch**: `008-dashboard-frontend-app`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Set up the dashboard as a top level folder. This should not touch anything in src and have its own package.json. As far as the rest of the project goes, this should be completely self contained."

## User Scenarios & Testing

### User Story 1 - Run The Dashboard As A Separate App (Priority: P1)

A user can open a dedicated local dashboard application that is self-contained and consumes the dashboard API rather than importing project internals.

**Why this priority**: The dashboard should become a real exploratory UI without entangling the CLI, analyzers, adapters, or canonical store.

**Independent Test**: Start the dashboard app against a local dashboard API and verify it loads sessions using only the API contract.

**Acceptance Scenarios**:

1. **Given** the dashboard API is available locally, **When** the user opens the dashboard app, **Then** the app displays recent sessions from the API.
2. **Given** the API is unavailable, **When** the user opens the app, **Then** the app shows a clear local-connection error and recovery path.
3. **Given** the app source is inspected, **When** imports are checked, **Then** the app does not import files from the main project source tree.

---

### User Story 2 - Explore A Session In The App (Priority: P1)

A user can select a session and inspect meaningful context behavior: overview metrics, task groups, top artifacts, filters, and artifact details.

**Why this priority**: A session list alone is not useful; the app must help explain what consumed context and why.

**Independent Test**: Use fixture API responses and verify a user can select a session, filter artifacts, select a task group, and open artifact details.

**Acceptance Scenarios**:

1. **Given** sessions are listed, **When** the user selects one, **Then** the app shows the selected run overview and artifact explorer.
2. **Given** task groups exist, **When** the user selects a task group, **Then** the visible metrics and artifact rows reflect that scope.
3. **Given** artifact rows exist, **When** the user selects an artifact, **Then** the detail panel shows identity, metrics, metadata sections, relationships, privacy state, and caveats.
4. **Given** filters return no matching rows, **When** the user searches or filters, **Then** the app shows an empty state that keeps the active scope visible.

---

### User Story 3 - Stay Current While Codex Runs (Priority: P2)

A user can keep the dashboard app open while Codex sessions run and see updated session/run data without manually regenerating static HTML files.

**Why this priority**: The dashboard is meant to support live local work, not just post-run inspection.

**Independent Test**: Simulate API data changing and verify the app refreshes session and run views without requiring a page rebuild.

**Acceptance Scenarios**:

1. **Given** a session is being updated, **When** new data appears through the API, **Then** the app refreshes session metadata and selected run data on a predictable interval or user-triggered refresh.
2. **Given** the selected run disappears or becomes unreadable, **When** the app refreshes, **Then** it shows a clear stale or unavailable state.
3. **Given** the user has selected a session, task, artifact, and filters, **When** the app refreshes data, **Then** it preserves valid navigation state where possible.

### Edge Cases

- Dashboard API is offline, restarted, stale, or changes availability while the app is open.
- A selected session or artifact disappears between refreshes.
- Large runs may contain many rows that need responsive filtering and detail navigation.
- Metadata-only data must not be displayed as raw content.
- API response versions may evolve; unsupported versions should fail visibly.
- Browser refresh should keep or restore the current selected session when possible.

## Requirements

### Functional Requirements

- **FR-001**: The dashboard app MUST be a top-level self-contained project.
- **FR-002**: The dashboard app MUST have its own package metadata and development commands.
- **FR-003**: The dashboard app MUST NOT import files from the main project source tree.
- **FR-004**: The dashboard app MUST consume dashboard data through the local dashboard API contract.
- **FR-005**: The dashboard app MUST display recent sessions with safe labels, timestamps, counts, headline metrics, availability, and caveats.
- **FR-006**: The dashboard app MUST display a selected run's overview metrics, artifact rows, task groups, privacy state, and caveats.
- **FR-007**: The dashboard app MUST provide artifact detail drilldown.
- **FR-008**: The dashboard app MUST support session selection, task filtering, category filtering, text search, sorting, and selected artifact state.
- **FR-009**: The dashboard app MUST show loading, offline, stale, not-found, empty, and partial-data states.
- **FR-010**: The dashboard app MUST preserve navigation state across refresh when the selected entities still exist.
- **FR-011**: The dashboard app MUST NOT recompute analyzer metrics, readable labels, task groups, privacy decisions, or attribution caveats.
- **FR-012**: The dashboard app MUST NOT expose hidden raw content when the API marks data hidden or unavailable.
- **FR-013**: The dashboard app MUST remain removable without requiring changes to capture, analyzers, store, adapters, or CLI workflows.

### Key Entities

- **DashboardAppSessionList**: The app's session selection view backed by dashboard API session records.
- **DashboardAppRunExplorer**: The selected run workspace with overview, filters, task navigation, artifact table, and detail panel.
- **DashboardAppArtifactDetailPanel**: The user-facing artifact drilldown view.
- **DashboardAppApiClient**: The app-side adapter for the dashboard HTTP contract.
- **DashboardAppViewState**: Selected session, selected task, filters, sort order, selected artifact, refresh status, and error state.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can open the dashboard app and select a recent session within 10 seconds when the local API is running.
- **SC-002**: A user can identify a selected run's top five artifact contributors within 30 seconds.
- **SC-003**: The app can filter a 1,000 artifact fixture by text, category, and task group with visible results updating within one second.
- **SC-004**: The app does not import any files from the main project source tree in build or test checks.
- **SC-005**: The app displays a useful offline state when the dashboard API is unavailable.
- **SC-006**: Metadata-only fixture responses display zero hidden raw prompt, command output, patch, file-content, or message bodies.

## Assumptions

- The dashboard API surface exists before this app is implemented.
- The app is local-first and does not require remote services.
- The app is independently buildable and testable.
- The app may duplicate small client-side contract types rather than importing internal project types.
- User authentication is out of scope for local-only operation.
