# Feature Specification: Codex Session Dashboard Grouping

**Feature Branch**: `017-codex-session-dashboard-grouping`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Keep dashboard changes separate from underlying source changes. Add grouping by Codex session id for new traffic after restarting the proxy, and make the dashboard reflect those grouped sessions without backward-compatibility concerns."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See One Row Per New Codex Session (Priority: P1)

A user opens the dashboard after capturing new live traffic and sees sessions grouped by Codex session identity rather than by provider cache key.

**Why this priority**: The dashboard is where the user verifies whether grouping is meaningful and one-to-one with Codex sessions.

**Independent Test**: Load dashboard data from new traffic containing multiple requests from the same Codex session and verify the session list presents one selectable session row for that Codex session.

**Acceptance Scenarios**:

1. **Given** new capture data contains several requests from one Codex session, **When** the dashboard session list loads, **Then** it shows one session entry for that Codex session.
2. **Given** new capture data contains requests from two Codex sessions, **When** the dashboard session list loads, **Then** it shows two separate session entries.
3. **Given** a session row represents Codex-session grouping, **When** the user reads the row, **Then** the row clearly identifies the Codex session grouping source.

---

### User Story 2 - Drill Into Requests Within The Grouped Session (Priority: P1)

A user selects a Codex-session row and sees only requests that belong to that selected Codex session.

**Why this priority**: Grouping is only useful if the request drilldown respects the same identity boundary.

**Independent Test**: Select a grouped Codex session and verify the request list excludes requests from other Codex sessions even when cache keys or prompt hints overlap.

**Acceptance Scenarios**:

1. **Given** a selected Codex session has multiple requests, **When** the user selects it, **Then** the request list contains that session's requests.
2. **Given** another Codex session shares a provider cache key, **When** the first session is selected, **Then** the other session's requests do not appear.
3. **Given** a request has token usage, **When** it appears under the selected session, **Then** its request metrics remain visible as before.

---

### User Story 3 - Surface Grouping Limitations For Non-Codex Fallbacks (Priority: P2)

A user can distinguish true Codex-session grouped rows from fallback-grouped rows when a request lacks Codex session identity.

**Why this priority**: The feature should not imply one-to-one Codex grouping when the source data did not provide a Codex session identity.

**Independent Test**: Load dashboard data that includes both Codex-session grouped traffic and fallback-grouped traffic, and verify the session list labels the distinction.

**Acceptance Scenarios**:

1. **Given** a session row was grouped by Codex session identity, **When** it is displayed, **Then** it is labeled as Codex-session grouped.
2. **Given** a session row was grouped by fallback identity, **When** it is displayed, **Then** it is labeled as fallback or partial rather than Codex-session grouped.
3. **Given** only new Codex-session grouped traffic is present, **When** the dashboard loads, **Then** no historical compatibility or migration notice is required.

### Edge Cases

- Multiple requests in the same Codex session may have different prompt cache keys; the dashboard must still show one session row.
- Different Codex sessions may share similar titles, timestamps, or cache hints; selection must remain stable and separate.
- A capture may include a fallback-grouped request with no Codex identity; it should not be hidden, but it should not be labeled as Codex-session grouped.
- A selected session may have usage but no extracted artifacts; the request list should remain useful.
- A selected session may have no completed usage yet; the dashboard should preserve unavailable or partial states.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST group and display new captured traffic by Codex session identity when the data contract provides that identity.
- **FR-002**: The dashboard MUST show one session row for requests sharing the same Codex session identity.
- **FR-003**: The dashboard MUST show separate session rows for requests with different Codex session identities.
- **FR-004**: Selecting a session row MUST show only requests belonging to that grouped session.
- **FR-005**: Session rows MUST make Codex-session grouping distinguishable from fallback grouping.
- **FR-006**: The dashboard MUST continue to show request-level token totals and request detail for the selected grouped session.
- **FR-007**: The dashboard MUST NOT merge sessions because of shared provider cache keys, prompt text, fallback fingerprints, or visual labels when Codex session identity differs.
- **FR-008**: The dashboard MUST NOT require migration or backfill display behavior for traffic captured before Codex-session grouping.
- **FR-009**: The dashboard MUST preserve privacy display rules and MUST NOT reveal hidden raw content while showing grouped sessions.
- **FR-010**: The dashboard MUST consume grouping identity and grouping confidence from the data contract rather than recomputing provider-specific request identity in browser behavior.

### Key Entities *(include if feature involves data)*

- **DashboardSessionGroup**: A selectable dashboard row representing one Codex-session group or one explicitly labeled fallback group.
- **SessionGroupingLabel**: A user-visible indication of whether a row is grouped by Codex session identity or by fallback identity.
- **GroupedRequestList**: The requests belonging to the selected dashboard session group.
- **SessionSelectionState**: Surface state that keeps the selected grouped session stable while the user drills into requests and artifacts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new capture with three requests from one Codex session displays as one dashboard session row.
- **SC-002**: A new capture with requests from two Codex sessions displays as two separate dashboard session rows.
- **SC-003**: Selecting a Codex-session row displays only requests from that Codex session.
- **SC-004**: A shared cache key across two Codex sessions does not cause the dashboard to merge them.
- **SC-005**: True Codex-session grouped rows and fallback-grouped rows are distinguishable in the session list.
- **SC-006**: Metadata-only captures show grouped sessions and request metrics without exposing hidden raw content.

## Assumptions

- The underlying Codex session routing/data contract feature is completed before this dashboard feature is implemented.
- This dashboard feature targets new traffic captured after the proxy restart and does not need historical migration behavior.
- Request-first dashboard behavior from existing specs remains the primary drilldown once a session group is selected.
- The dashboard receives grouping identity and grouping source from upstream local data contracts.
