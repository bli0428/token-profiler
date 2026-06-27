# Feature Specification: Isolated Dashboard Frontend App

**Feature Branch**: `008-dashboard-frontend-app`

**Created**: 2026-06-26

**Status**: Ready for Planning

**Input**: User description: "Set up the dashboard as a top level folder. This should not touch anything in src and have its own package.json. As far as the rest of the project goes, this should be completely self contained."

## User Scenarios & Testing

### User Story 1 - Run The Dashboard As A Separate App (Priority: P1)

A user can open a dedicated local dashboard application that is self-contained and consumes the dashboard API rather than importing project internals.

**Why this priority**: The dashboard should become a real exploratory UI without entangling the CLI, analyzers, adapters, canonical store, or static report renderer.

**Independent Test**: Start the dashboard app against a local dashboard API-compatible fixture server and verify it loads service status and sessions using only documented HTTP responses.

**Acceptance Scenarios**:

1. **Given** the dashboard API is available locally, **When** the user opens the dashboard app, **Then** the app verifies the service status and displays recent sessions from the API.
2. **Given** the API is unavailable, **When** the user opens the app, **Then** the app shows a clear local-connection error, the attempted API origin, and a retry path.
3. **Given** the API responds with an unsupported response version, **When** the app receives the response, **Then** the app refuses to render misleading data and shows a version mismatch state.
4. **Given** the app source is inspected, **When** imports are checked, **Then** the app does not import files from the main project source tree.
5. **Given** the main project is inspected, **When** the feature is removed, **Then** capture, analyzer, store, adapter, CLI, and static dashboard workflows do not require changes.

---

### User Story 2 - Explore A Session In The App (Priority: P1)

A user can select a session and inspect meaningful context behavior: overview metrics, task groups, top artifacts, filters, and artifact details.

**Why this priority**: A session list alone is not useful; the app must help explain what consumed context and why.

**Independent Test**: Use fixture API responses and verify a user can select a session, filter artifacts, select a task group, sort artifact rows, and open artifact details.

**Acceptance Scenarios**:

1. **Given** sessions are listed, **When** the user selects one, **Then** the app shows the selected run overview, task groups, artifact explorer, privacy state, and caveats.
2. **Given** task groups exist, **When** the user selects a task group, **Then** visible metrics and artifact rows reflect that scope without recomputing analyzer results.
3. **Given** artifact rows exist, **When** the user searches, filters by category, filters by task, or changes sort order, **Then** the visible rows update while preserving the selected run.
4. **Given** artifact rows exist, **When** the user selects an artifact, **Then** the detail panel shows identity, metrics, metadata sections, relationships, privacy state, and caveats from the API contract.
5. **Given** filters return no matching rows, **When** the user searches or filters, **Then** the app shows an empty state that keeps the active session and scope visible.

---

### User Story 3 - Stay Current While Codex Runs (Priority: P2)

A user can keep the dashboard app open while Codex sessions run and see updated session/run data without manually regenerating static HTML files.

**Why this priority**: The dashboard is meant to support live local work, not just post-run inspection.

**Independent Test**: Simulate API data changing and verify the app refreshes session and run views without requiring a page rebuild.

**Acceptance Scenarios**:

1. **Given** a session is being updated, **When** new data appears through the API, **Then** the app refreshes session metadata and selected run data on a predictable interval or user-triggered refresh.
2. **Given** the selected run disappears or becomes unreadable, **When** the app refreshes, **Then** it shows a clear stale, not-found, or unavailable state.
3. **Given** the user has selected a session, task, artifact, filters, and sort order, **When** the app refreshes data, **Then** it preserves valid navigation state where possible and clears only invalid selections.
4. **Given** the API returns partial data or caveats during refresh, **When** the app updates, **Then** caveats remain visible and partial data is not presented as complete.

### Edge Cases

- Dashboard API is offline, restarted, stale, or changes availability while the app is open.
- The API status endpoint is reachable but session or run endpoints fail.
- A selected session, task group, or artifact disappears between refreshes.
- Large runs may contain many artifact rows that need responsive filtering, sorting, and detail navigation.
- Metadata-only data must not be displayed as raw content.
- Hidden, unavailable, uncaptured, and previewable content states must remain visually distinguishable.
- API response versions may evolve; unsupported versions should fail visibly.
- Browser refresh should keep or restore the current selected session when possible.
- Safe labels, caveats, and privacy states may be missing from older or partial data and need graceful fallback display.

## Requirements

### Functional Requirements

- **FR-001**: The dashboard app MUST be a top-level self-contained project.
- **FR-002**: The dashboard app MUST have its own package metadata and development commands.
- **FR-003**: The dashboard app MUST NOT import files from the main project source tree.
- **FR-004**: The dashboard app MUST consume dashboard data only through the local dashboard API contract.
- **FR-005**: The dashboard app MUST verify service status, local/read-only capability, and response version before presenting session data.
- **FR-006**: The dashboard app MUST display recent sessions with safe labels, timestamps, counts, headline metrics, availability, and caveats.
- **FR-007**: The dashboard app MUST display a selected run's overview metrics, artifact rows, task groups, privacy state, filter options, and caveats.
- **FR-008**: The dashboard app MUST provide artifact detail drilldown using the API detail contract rather than local event files.
- **FR-009**: The dashboard app MUST support session selection, task filtering, category filtering, text search, sorting, and selected artifact state.
- **FR-010**: The dashboard app MUST show loading, offline, version-mismatch, stale, not-found, empty, partial-data, and retry states.
- **FR-011**: The dashboard app MUST preserve navigation state across refresh when the selected entities still exist.
- **FR-012**: The dashboard app MUST NOT recompute analyzer metrics, readable labels, task groups, privacy decisions, or attribution caveats.
- **FR-013**: The dashboard app MUST NOT expose hidden raw content when the API marks data hidden, metadata-only, unavailable, or uncaptured.
- **FR-014**: The dashboard app MUST distinguish provider-reported totals from locally estimated artifact-level attribution when the API exposes caveats.
- **FR-015**: The dashboard app MUST remain removable without requiring changes to capture, analyzers, store, adapters, CLI workflows, or static report generation.
- **FR-016**: The dashboard app MUST support fixture-backed validation so UI behavior can be tested without live profiler data.
- **FR-017**: The dashboard app MUST include at least one API-real baseline fixture set captured from the completed dashboard API for status, sessions, run view, and artifact detail responses.
- **FR-018**: The dashboard app MUST keep API transport, URL/view state, refresh reconciliation, filter/sort logic, and rendering concerns in separate app-owned modules.
- **FR-019**: The dashboard app MUST provide a minimal app mount, a shell/controller boundary, and a run explorer boundary rather than concentrating dashboard orchestration in the top-level app component.
- **FR-020**: The dashboard app MUST centralize privacy display policy for hidden, metadata-only, unavailable, uncaptured, preview, and raw-available states.
- **FR-021**: The dashboard app MUST organize styling by dashboard-owned responsibility modules instead of growing a single catch-all stylesheet.
- **FR-022**: The dashboard app MUST use Vite-exposed browser configuration for the API base URL.
- **FR-023**: Dashboard validation MUST be owned by the dashboard package; root commands may orchestrate dashboard-owned scripts but root source and root TypeScript configuration MUST NOT include dashboard source.

### Key Entities

- **DashboardAppApiClient**: The app-owned client for status, sessions, run view, artifact detail, structured errors, response version checks, and retry state.
- **DashboardAppContractFixtures**: API-real and edge fixture data used to keep duplicated frontend contract types aligned with the real API.
- **DashboardAppShell**: The app layout and top-level status boundary that wires controller state to views.
- **DashboardAppController**: The app-owned controller for URL state, selected entities, refresh lifecycle, and state reconciliation.
- **DashboardAppSessionList**: The app's session selection view backed by dashboard API session records.
- **DashboardAppRunExplorer**: The selected run workspace with overview, filters, task navigation, artifact table, privacy/caveat display, and detail panel.
- **DashboardAppArtifactDetailPanel**: The user-facing artifact drilldown view for identity, metrics, metadata, relationships, privacy state, and caveats.
- **DashboardAppViewState**: Selected session, selected task, filters, sort order, selected artifact, refresh status, version state, and error state.
- **DashboardAppPrivacyPolicy**: Centralized display policy for privacy states, safe fallback labels, and raw-content visibility.
- **DashboardAppStyleSystem**: Dashboard-owned tokens, layout primitives, state styles, and feature/component styles.
- **DashboardAppFixtureDataset**: API-compatible local fixture data used to validate empty, normal, large, metadata-only, partial, offline, and version-mismatch scenarios.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can open the dashboard app and select a recent session within 10 seconds when the local API is running.
- **SC-002**: A user can identify a selected run's top five artifact contributors within 30 seconds.
- **SC-003**: The app can filter and sort a 1,000 artifact fixture by text, category, and task group with visible results updating within one second.
- **SC-004**: App build or test checks fail when dashboard source imports files from the main project source tree.
- **SC-005**: The app displays a useful offline state when the dashboard API is unavailable.
- **SC-006**: Metadata-only fixture responses display zero hidden raw prompt, command output, patch, file-content, or message bodies.
- **SC-007**: Unsupported response-version fixtures produce a visible version mismatch state before session or run data is rendered.
- **SC-008**: Refresh validation preserves selected session, task, artifact, filters, and sort order whenever those entities still exist after updated data arrives.
- **SC-009**: API-real fixture tests fail when required status, sessions, run, artifact detail, envelope, schema-version, privacy, or caveat fields drift incompatibly.
- **SC-010**: The top-level app component remains a mount point and does not own artifact filtering, run-detail fetching, privacy display decisions, or refresh reconciliation.
- **SC-011**: A maintainer can identify the owning style file for sessions, run explorer, artifact table, artifact detail, filters, privacy states, and caveats within two minutes.
- **SC-012**: Dashboard package validation can run without root source importing or compiling `dashboard/src`.

## Assumptions

- The dashboard API surface from spec 007 exists before this app is implemented.
- The app is local-first and does not require remote services.
- The app is independently buildable and testable.
- The app may duplicate small client-side contract types rather than importing internal project types.
- User authentication is out of scope for local-only operation.
- Polling plus manual refresh is acceptable for the first live-refresh experience.
- Clean architecture guardrails should be implemented as part of this feature, not deferred to follow-up cleanup.
