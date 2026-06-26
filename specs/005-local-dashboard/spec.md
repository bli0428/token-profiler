# Feature Specification: Local Metrics Dashboard

**Feature Branch**: `005-local-dashboard`

**Created**: 2026-06-25

**Status**: Ready for Planning

**Input**: User description: "View a local page with metrics, drilldowns, and artifact/task exploration."

## User Scenarios & Testing

### User Story 1 - Run Overview Dashboard (Priority: P1)

A user opens a local dashboard for one captured run and immediately understands overall token usage, cache health, replay exposure, attribution coverage, top contributors, and important caveats without reading raw event files or terminal tables.

**Why this priority**: This is the smallest useful dashboard slice. It gives the user a browser-native summary of the same facts they already trust in command-line reports.

**Independent Test**: Generate or open the dashboard for a fixture run and verify that the primary metric cards, caveats, and top contributor rows match the analyzer results used by the command-line report.

**Acceptance Scenarios**:

1. **Given** a captured run with usage and artifact data, **When** the user opens the dashboard, **Then** the page shows total input, cached input, uncached input, output, exposure, repeated exposure, replay ratio, context efficiency, attribution coverage, and analyzer caveats.
2. **Given** analyzer results include readable artifact labels, **When** top contributors render, **Then** each row shows a readable label, stable identifier, category, exposure, replay, inclusion count, and attribution state.
3. **Given** a run has incomplete usage, attribution, or legibility data, **When** the overview renders, **Then** affected metrics remain visible with clear caveats instead of appearing complete.
4. **Given** a run has no artifact events, **When** the dashboard opens, **Then** the overview still renders available request and usage metrics and explains that artifact exploration is unavailable.

---

### User Story 2 - Artifact Drilldown (Priority: P1)

A user selects an artifact row and inspects what the artifact represents, where it appeared, how much it contributed, how it relates to tools or tasks, and whether any preview or raw content can be shown.

**Why this priority**: The dashboard must answer the user's immediate follow-up question: "What exactly is this row, and why does it matter?"

**Independent Test**: Open a fixture dashboard, select command output, patch, message, file context, and unknown artifact rows, and verify each detail panel shows the correct identity, metrics, relationships, privacy state, and caveats.

**Acceptance Scenarios**:

1. **Given** a command or command-output row, **When** the user opens its detail, **Then** the detail shows command metadata when available, first and last inclusion, exposure, replay, estimated uncached contribution, related tool-call links, preview state, and attribution notes.
2. **Given** a patch row, **When** the user opens its detail, **Then** the detail shows touched files, patch shape, inclusion history, exposure, and privacy-safe preview availability.
3. **Given** an artifact has linked tool calls or outputs, **When** the detail opens, **Then** the relationship is visible as exact, inferred, unmatched call, or unmatched output with confidence or caveats.
4. **Given** an artifact lacks rich metadata, **When** the detail opens, **Then** the user still sees stable identity, available metrics, and why richer detail is missing.

---

### User Story 3 - Session And Task Exploration (Priority: P2)

A user browses recent sessions and narrows a long run by task group, artifact type, search text, or contribution level so they can understand how work evolved across the session.

**Why this priority**: Long agent sessions become difficult to inspect through one flat table; task and session navigation turns the dashboard into an explorer rather than a static report.

**Independent Test**: Load fixture data with multiple runs, multiple task groups, and cross-task artifacts; verify session selection, task filters, artifact filters, and scoped metrics all update coherently.

**Acceptance Scenarios**:

1. **Given** multiple runs exist locally, **When** the dashboard opens to the session list, **Then** the user can choose a recent session by label, timestamp, request count, and headline token metrics.
2. **Given** task groups exist for a selected run, **When** the user selects a task group, **Then** overview metrics and artifact rows update to that task scope while preserving run-level context.
3. **Given** artifacts span multiple task groups, **When** the user filters by a task, **Then** cross-task persistence remains visible rather than hiding repeated context without explanation.
4. **Given** the user applies category or text filters, **When** no rows match, **Then** the page shows an empty state that keeps the current metric scope clear.

---

### User Story 4 - Privacy-Safe Local Use (Priority: P2)

A user can inspect metrics locally with confidence that the dashboard follows the run's storage mode, never reveals raw content accidentally, and clearly distinguishes hidden content from unavailable data.

**Why this priority**: The dashboard is a richer surface than terminal output, so privacy behavior must be visible and trustworthy before broader use.

**Independent Test**: Render equivalent fixture runs in metadata-only, preview, and raw-content modes; verify labels, previews, details, task names, and empty states follow the expected visibility rules.

**Acceptance Scenarios**:

1. **Given** a metadata-only run, **When** the user opens overview, artifact detail, or task views, **Then** raw prompts, command output, patches, file contents, and message text are not displayed.
2. **Given** preview content is available, **When** the user opens detail, **Then** previews are shown only in fields permitted by the run's privacy mode and are labeled as previews.
3. **Given** raw content is available, **When** the user opens detail, **Then** raw content is not exposed by default and requires an explicit user action in the detail view.
4. **Given** data is hidden by privacy mode or absent from the run, **When** the dashboard renders the affected field, **Then** the page distinguishes "hidden by privacy mode" from "not captured" or "not available."

### Edge Cases

- A selected run is missing, deleted, partially written, or unreadable while the dashboard is open.
- The capture process may be running, stopped, or stale while the dashboard reads local data.
- Old runs may lack usage totals, legibility rows, task groups, preview states, or attribution data.
- Very large runs may contain hundreds of requests and thousands of artifacts.
- Artifact labels may collide, be unavailable, or contain sensitive-looking text that privacy mode must suppress.
- Estimated artifact-level attribution may not reconcile exactly with provider-reported request totals.
- Filters may produce no matching artifacts or task groups.
- Browser refresh, deep links, and back/forward navigation should keep the selected run, artifact, and filters understandable.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a local-only dashboard surface for inspecting captured runs.
- **FR-002**: The dashboard MUST show a run overview with input, cached input, uncached input, output, exposure, repeated exposure, replay ratio, context efficiency, request count, artifact count, and attribution coverage when available.
- **FR-003**: Dashboard totals and row metrics MUST be derived from the same analyzer results as command-line reports.
- **FR-004**: The dashboard MUST show analyzer caveats next to affected overview metrics, artifact rows, task groups, and details.
- **FR-005**: The dashboard MUST present top contributor and replay hotspot artifact rows with readable label, stable identifier, category, exposure, replay, inclusion count, preview state, and attribution state.
- **FR-006**: Users MUST be able to open an artifact detail view from artifact rows.
- **FR-007**: Artifact detail MUST include stable identity, available metadata, exposure metrics, first and last inclusion, persistence across requests or tasks, related tool-call links, privacy state, and attribution notes.
- **FR-008**: The dashboard MUST distinguish provider-reported run/request totals from locally estimated artifact-level attribution.
- **FR-009**: The dashboard MUST respect the run's storage/privacy mode for all labels, previews, details, search indexes, and task names.
- **FR-010**: Raw content MUST be hidden by default even when raw content is available.
- **FR-011**: The dashboard MUST distinguish privacy-hidden content from unavailable or uncaptured data.
- **FR-012**: Users MUST be able to select a recent local session when multiple sessions are available.
- **FR-013**: Session selection MUST show enough summary information to identify a run, including label or identifier, timestamp when available, request count, artifact count, and headline token metrics.
- **FR-014**: Users MUST be able to filter artifact rows by artifact category, task group, and text that is safe to search under the current privacy mode.
- **FR-015**: Selecting a task group MUST scope overview metrics and artifact rows to that task while preserving visible context that the view is filtered.
- **FR-016**: Cross-task artifacts MUST remain identifiable when a task filter is active.
- **FR-017**: The dashboard MUST provide clear empty, loading, stale, and error states for missing runs, unreadable data, no artifacts, no task groups, and no filter matches.
- **FR-018**: The dashboard MUST support direct navigation back to the selected run and artifact detail state after refresh.
- **FR-019**: The dashboard MUST remain read-only for captured run data.
- **FR-020**: The dashboard MUST not require remote services, remote authentication, or exporting captured content.

### Key Entities

- **DashboardSession**: A locally available run that can be selected, identified, and summarized before opening.
- **DashboardRunOverview**: Headline run metrics, analyzer availability, attribution coverage, and caveats for the selected scope.
- **DashboardArtifactRow**: A privacy-safe row representing one readable artifact with metrics, category, stable identity, and preview state.
- **DashboardArtifactDetail**: Drilldown information for one artifact, including identity, metadata, metrics, relationships, privacy state, and caveats.
- **DashboardTaskGroup**: A chronological work group with label, confidence, request range, artifact membership, rollup metrics, and caveats.
- **DashboardFilterState**: Current session, task, artifact category, search text, sort order, and selected artifact.
- **DashboardPrivacyState**: Per-run and per-field visibility status that determines whether content is hidden, previewable, raw-available, or unavailable.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can open a local dashboard for a fixture run and identify the top five token contributors within 30 seconds without reading raw event files.
- **SC-002**: For the same fixture run, dashboard overview totals match command-line report totals for input, cached input, uncached input, output, exposure, repeated exposure, replay ratio, and context efficiency.
- **SC-003**: Artifact detail opens within one second for fixture runs with at least 100 requests and 1,000 artifact rows on a typical local developer machine.
- **SC-004**: Metadata-only fixture runs display zero raw prompt, command output, patch, file-content, or message bodies across overview, search, filters, and detail views.
- **SC-005**: At least 95% of artifact rows in rich fixture runs show a readable label, category, stable identifier, and either a usable detail payload or a visible caveat explaining missing detail.
- **SC-006**: Users can filter a fixture run by task group and artifact category and see scoped metrics and matching rows update within one second.
- **SC-007**: Session selection allows a user to choose among at least 20 local runs without reading filesystem paths directly.
- **SC-008**: Estimated artifact attribution is visibly caveated anywhere artifact-level cached or uncached values are shown.

## Assumptions

- The first dashboard release is local and read-only.
- Static report generation is acceptable for the first vertical slice; a local interactive server may be added when session browsing and refresh behavior require it.
- The dashboard consumes canonical records and analyzer outputs already produced by the project.
- Privacy modes and analyzer caveats are authoritative for deciding what the dashboard may display.
- Mobile-specific optimization is out of scope; the dashboard should remain usable on common laptop and desktop browser sizes.
- Exporting, sharing, authentication, and multi-user collaboration are out of scope for this feature.
