# Feature Specification: Local Metrics Dashboard

**Feature Branch**: `005-local-dashboard`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "View a local page with metrics, drilldowns, and artifact/task exploration."

## User Scenarios & Testing

### User Story 1 - Local Report Page (Priority: P1)

A user can open a local page for a captured run and see token usage, cache health, attribution quality, top contributors, and legibility rows.

**Why this priority**: Large text tables become hard to explore as sessions grow.

**Independent Test**: Generate a dashboard for a fixture run and verify all primary metrics render from analyzer results.

**Acceptance Scenarios**:

1. **Given** a captured run, **When** the user starts or generates the dashboard, **Then** the page shows total input, cached, uncached, exposure, replay, and attribution coverage.
2. **Given** readable artifact metadata exists, **When** top contributors render, **Then** rows use readable labels and show stable IDs on detail.

---

### User Story 2 - Artifact Drilldown UI (Priority: P1)

A user can click an artifact row to inspect details, first/last inclusions, metadata, previews if available, and attribution notes.

**Why this priority**: The dashboard must answer "what exactly is this row?"

**Independent Test**: Use Playwright or equivalent browser testing against a local fixture page.

**Acceptance Scenarios**:

1. **Given** a command output row, **When** the user opens it, **Then** the detail panel shows command, workdir, output preview, exposure, replay, and uncached estimate.
2. **Given** a patch row, **When** the user opens it, **Then** the detail panel shows touched files and patch shape.

---

### User Story 3 - Session And Task Navigation (Priority: P2)

A user can browse recent sessions and drill into task groups to understand how a long agent session evolved.

**Why this priority**: The tool is most useful for long sessions where CLI output is too flat.

**Independent Test**: Load fixture data with multiple sessions and task groups; verify navigation and filters.

**Acceptance Scenarios**:

1. **Given** multiple runs under the data directory, **When** the dashboard opens, **Then** the user can choose a session.
2. **Given** task groups exist, **When** the user filters by task, **Then** artifact tables and metrics update to that task scope.

### Edge Cases

- Dashboard must not expose raw content unless the run captured it or preview mode permits it.
- Very large runs should not freeze the browser.
- Old runs may lack legibility metadata.
- The proxy may be running, stopped, or stale while the dashboard is open.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a local-only dashboard surface.
- **FR-002**: Dashboard metrics MUST be derived from the same analyzer results as CLI reports.
- **FR-003**: Dashboard MUST support artifact drilldown.
- **FR-004**: Dashboard MUST document that local artifact attribution is estimated based on local tokenizer counts.
- **FR-005**: Dashboard MUST respect storage/privacy mode when showing previews or raw content.
- **FR-006**: Dashboard SHOULD support recent session selection.
- **FR-007**: Dashboard SHOULD support filtering by artifact type and task group.

### Key Entities

- **DashboardRunSummary**: Top-level run metrics and attribution notes.
- **DashboardArtifactRow**: Table row combining metrics and legibility.
- **DashboardArtifactDetail**: Drilldown data for one artifact.
- **DashboardSessionIndex**: Recent runs and labels.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can inspect a run's top artifacts in a browser without reading raw JSONL.
- **SC-002**: Dashboard and CLI totals match for the same run fixture.
- **SC-003**: Artifact detail opens in under one second for fixture runs comparable to current 100-request sessions.
- **SC-004**: Raw content is hidden unless the run was captured in raw mode and the UI explicitly exposes it.

## Assumptions

- A static HTML report is acceptable for early delivery; a local server can follow.
- The dashboard can start as read-only.
- Browser verification should be added once interactive UI exists.
