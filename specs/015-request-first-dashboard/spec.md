# Feature Specification: Request-First Dashboard

**Feature Branch**: `015-request-first-dashboard`

**Created**: 2026-06-27

**Status**: Ready for Planning

**Input**: User description: "Keep the dashboard session list on the left, ideally one-to-one with Codex sessions. Change the center from artifact-first to request-first, sorted chronologically. Each request shows cached and uncached tokens, and expands to show artifacts with estimated token counts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See Token-Heavy Sessions First (Priority: P1)

A user opens the dashboard and uses the left session list to identify sessions that consumed a lot of tokens, with session identity aligned to Codex sessions whenever the data supports it.

**Why this priority**: The top-level workflow starts by finding the expensive session before drilling into requests or artifacts.

**Independent Test**: Open the dashboard with multiple sessions and verify each session displays request/token totals, any available Codex-facing identity, and clear availability when identity or usage is partial.

**Acceptance Scenarios**:

1. **Given** multiple captured sessions exist, **When** the dashboard loads, **Then** the left pane lists sessions with token totals and stable selection behavior.
2. **Given** a session has a Codex-derived identity or label, **When** it appears in the session list, **Then** that identity is visible without breaking existing run routing.
3. **Given** a session has incomplete usage or uncertain Codex mapping, **When** it appears in the session list, **Then** the limitation is visible.

---

### User Story 2 - Inspect Requests Chronologically (Priority: P1)

A user selects a session and sees requests in chronological order in the main pane, with cached and uncached input token counts shown for each request.

**Why this priority**: The core diagnosis is "which request in this session burned the tokens?"

**Independent Test**: Select a session with several provider requests and verify the main pane is request-first, chronological, and displays provider token totals without requiring artifact expansion.

**Acceptance Scenarios**:

1. **Given** a selected session has request accounting, **When** the main pane renders, **Then** requests appear in chronological order by default.
2. **Given** a request has provider usage, **When** it appears in the request list, **Then** cached input, uncached input, total input, output, and total tokens are visible or reachable in the row.
3. **Given** a request has missing usage, **When** it appears in the request list, **Then** unavailable values are labeled as unavailable rather than zero.
4. **Given** a user changes selection between sessions, **When** they return to a session, **Then** request ordering and default visibility remain predictable.

---

### User Story 3 - Expand A Request To Explain Contributors (Priority: P2)

A user expands an expensive request and sees the artifacts included in that request with local estimated token counts and attribution caveats.

**Why this priority**: After finding an expensive request, the user needs a likely explanation without confusing estimates with provider-authoritative totals.

**Independent Test**: Expand a request with multiple artifacts and verify the expanded content shows request-scoped artifacts, estimated token counts, privacy state, and caveats.

**Acceptance Scenarios**:

1. **Given** a request row is expandable, **When** the user expands it, **Then** request-scoped artifacts appear beneath that request.
2. **Given** request-scoped artifact estimates are available, **When** artifacts are shown, **Then** estimated local, cached, and uncached token counts are visible as estimates.
3. **Given** artifact content is metadata-only or hidden, **When** the expanded request renders, **Then** hidden raw content is not displayed.
4. **Given** a user expands or collapses request details, **When** they navigate by mouse or keyboard, **Then** expansion state, focus, and artifact detail access remain understandable.

---

### User Story 4 - Preserve Artifact Detail As Secondary Diagnosis (Priority: P3)

A user can still inspect an artifact after finding it inside a request, but artifact aggregation no longer drives the default center pane.

**Why this priority**: Existing artifact detail remains useful, but the primary workflow should be session -> request -> artifact.

**Independent Test**: Select or open an artifact from an expanded request and verify artifact detail remains available without changing the default request-first ordering.

**Acceptance Scenarios**:

1. **Given** an artifact appears in a request expansion, **When** the user selects it, **Then** artifact detail is available if the API reports detail support.
2. **Given** aggregate artifact sorting exists, **When** the dashboard first opens a run, **Then** the main pane still defaults to chronological requests.
3. **Given** an artifact detail panel is open, **When** the user changes requests or sessions, **Then** the selected artifact state updates without showing stale detail for a different request.

### Edge Cases

- A session may have request usage but no artifact inclusions; the request row must remain useful.
- A session may have artifact events but missing provider usage; the request row must show partial availability.
- A request may include many artifacts; expansion must remain scannable without shifting the whole dashboard layout unexpectedly.
- Multiple requests may have identical timestamps; display order must still be stable.
- Metadata-only, preview, raw-available, and unavailable artifact states must be visually distinct without exposing hidden content.
- Historical runs captured before request offsets or usage were available may support only partial request detail.
- The request accounting contract may be absent from an older local API; the dashboard must show a compatible empty or unsupported state.
- Very small viewports may not fit all request metrics in a single line; the dashboard must preserve readability instead of truncating key values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST keep the session list as the primary left-side navigation.
- **FR-002**: Session rows MUST display token totals that help users identify high-cost sessions.
- **FR-003**: Session rows MUST display available Codex-facing identity or mapping limitations when provided by the data contract.
- **FR-004**: Selecting a session MUST show a request-first main pane by default.
- **FR-005**: The request list MUST be chronological by default and remain deterministic when timestamps tie.
- **FR-006**: Each request row MUST show cached input tokens, uncached input tokens, total input tokens, output tokens, and total tokens when available.
- **FR-007**: Missing request metrics MUST be displayed as unavailable or partial, never silently as zero.
- **FR-008**: Request rows MUST support expansion to show request-scoped artifact inclusions.
- **FR-009**: Expanded request artifacts MUST show request-specific estimated token counts and attribution caveats when provided.
- **FR-010**: Expanded request artifacts MUST preserve privacy display states and must not reveal hidden raw content.
- **FR-011**: The dashboard MUST consume request accounting from the dashboard data contract and MUST NOT recompute provider usage, request chronology, or artifact attribution in browser code.
- **FR-012**: Existing artifact detail MAY remain accessible, but aggregate artifact tables MUST NOT be the default center-pane workflow for a selected session.
- **FR-013**: The dashboard MUST make estimated artifact values visually or textually distinguishable from provider-reported request totals.
- **FR-014**: The request-first view MUST provide explicit empty, unsupported, partial, and error states for request accounting data.
- **FR-015**: Request expansion controls MUST be usable with keyboard navigation and MUST expose expanded/collapsed state to assistive technologies.
- **FR-016**: The dashboard MUST preserve stable session selection and artifact detail behavior when moving between session, request, and artifact scopes.
- **FR-017**: The dashboard MUST keep request metrics readable on desktop and narrow viewport sizes without overlapping labels, controls, or artifact rows.

### Key Entities *(include if feature involves data)*

- **SessionListItem**: A selectable session summary showing identity, availability, and headline token totals.
- **RequestRow**: A chronological provider request row showing request identity, timing, availability, and provider token totals.
- **RequestExpansion**: The expanded view of one request's included artifacts and request-scoped estimates.
- **RequestArtifactDisplayItem**: A privacy-aware artifact row nested under a request, showing local estimated token contribution and available detail navigation.
- **RequestAccountingViewState**: Surface-owned state for selected session, expanded requests, selected artifact, loading, unsupported, and partial-data presentation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can identify the highest-token session, highest-token request, and largest visible request-scoped artifact contributor in one dashboard flow.
- **SC-002**: A selected session with request accounting displays chronological request rows without the user changing sort settings.
- **SC-003**: Provider-reported cached and uncached token counts are visible for request rows with completed usage.
- **SC-004**: Expanding a request shows artifacts scoped to that request, not only aggregate artifact totals across the full session.
- **SC-005**: Metadata-only fixtures render zero hidden raw prompt, tool output, file, patch, or message bodies.
- **SC-006**: Users can distinguish provider-reported request totals from estimated artifact attribution values.
- **SC-007**: A keyboard-only user can select a session, move through request rows, expand a request, and open artifact detail without losing their place.
- **SC-008**: Older or partial runs display a clear unsupported, empty, or partial request-accounting state rather than an artifact-first default.
- **SC-009**: At common desktop and narrow viewport sizes, request rows and expanded artifact rows remain readable with no overlapping text or controls.

## Assumptions

- The request accounting contract from spec 014 is available before this dashboard workflow is implemented.
- The left session list remains the top-level navigation pattern.
- Chronological request ordering is supplied by the data contract; the dashboard only renders and preserves that ordering.
- Existing artifact detail behavior can remain as a secondary drilldown rather than the default center-pane organization.
