# Feature Specification: Dashboard API Surface

**Feature Branch**: `007-dashboard-api-surface`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Set up the dashboard-api surface. This should set up the dashboard HTTP API contract."

## User Scenarios & Testing

### User Story 1 - Open A Local Dashboard API (Priority: P1)

A user can start a local read-only dashboard API and retrieve the available profiling sessions from a browser client without using command-line output.

**Why this priority**: The dashboard frontend needs a stable local data source before it can become a real application.

**Independent Test**: Start the local API, request the sessions endpoint, and verify it returns recent local runs with identifiers, timestamps, counts, headline metrics, availability, and caveats.

**Acceptance Scenarios**:

1. **Given** local profiler runs exist, **When** the client requests the session list, **Then** the API returns sessions ordered by recent activity with safe summary fields.
2. **Given** a local run is unreadable or incomplete, **When** the client requests sessions, **Then** the affected session is marked partial or unavailable with a visible caveat.
3. **Given** no profiler runs exist, **When** the client requests sessions, **Then** the API returns an empty session list without error.

---

### User Story 2 - Inspect One Run Through The API (Priority: P1)

A user can open one session through the dashboard API and retrieve overview metrics, artifact rows, task groups, artifact details, privacy states, and caveats.

**Why this priority**: The frontend must be able to drill into real session data, not merely list run counts.

**Independent Test**: Request a fixture run through the API and verify the response includes the same analyzer-derived facts as the command-line and static dashboard outputs.

**Acceptance Scenarios**:

1. **Given** a valid run identifier, **When** the client requests the run view, **Then** the API returns overview metrics, artifact rows, task groups, details, filter options, privacy state, and caveats.
2. **Given** artifact details exist, **When** the client requests one artifact by stable identifier, **Then** the API returns that artifact's detail without requiring the client to inspect raw event files.
3. **Given** a run has no task groups or no artifacts, **When** the client requests the run view, **Then** the API returns available data and clear empty states.

---

### User Story 3 - Keep API Boundaries Clean (Priority: P2)

A maintainer can evolve dashboard, CLI, and analyzers independently because the dashboard API exposes a stable surface contract and does not leak provider-specific payloads.

**Why this priority**: This preserves the project architecture and keeps the dashboard removable.

**Independent Test**: Run boundary checks proving the dashboard API consumes canonical store/analyzer outputs and that frontend clients consume only the HTTP contract.

**Acceptance Scenarios**:

1. **Given** dashboard API modules are inspected, **When** imports are checked, **Then** they do not import provider-specific adapter internals except through canonical local run loading paths.
2. **Given** the frontend client requests API data, **When** the client renders a page, **Then** it does not import analysis, adapter, store, or CLI modules directly.
3. **Given** analyzer internals change while the API contract remains stable, **When** the dashboard client requests data, **Then** the client-facing response shape remains compatible.

### Edge Cases

- The proxy may be running, stopped, stale, or writing a run while the API reads it.
- A run may be deleted between session listing and run-detail retrieval.
- A run may contain malformed JSONL or legacy unsupported event records.
- Large sessions may contain hundreds of requests and thousands of artifacts.
- Metadata-only runs must not expose hidden raw content through API responses, search fields, logs, or errors.
- API consumers may request unknown sessions, unknown artifacts, unsupported paths, or malformed identifiers.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a local-only read API for dashboard clients.
- **FR-002**: The API MUST expose a sessions collection with safe identifiers, timestamps, counts, headline metrics, availability, and caveats.
- **FR-003**: The API MUST expose a run view with overview metrics, artifact rows, artifact details, task groups, filter options, privacy state, and caveats.
- **FR-004**: The API MUST expose artifact detail retrieval by stable artifact identity.
- **FR-005**: The API MUST derive dashboard data from canonical local runs and analyzer outputs only.
- **FR-006**: The API MUST NOT expose provider-specific payloads to dashboard clients.
- **FR-007**: The API MUST respect storage/privacy mode and exclude hidden raw content from all responses.
- **FR-008**: The API MUST distinguish privacy-hidden data from unavailable or uncaptured data.
- **FR-009**: The API MUST distinguish provider-reported totals from locally estimated artifact-level attribution.
- **FR-010**: The API MUST provide clear not-found, unreadable, partial-data, and empty-state responses.
- **FR-011**: The API MUST be read-only for captured run data.
- **FR-012**: The API MUST be usable by a browser dashboard without requiring command-line parsing.
- **FR-013**: The API MUST support bounded local operation without remote services, remote authentication, or exporting captured data.

### Key Entities

- **DashboardApiSession**: A safe summary of one local run available to dashboard clients.
- **DashboardApiRun**: A complete analyzer-derived dashboard payload for one selected run.
- **DashboardApiArtifactDetail**: Drilldown data for one artifact, including identity, metrics, metadata sections, relationships, privacy state, and caveats.
- **DashboardApiTaskGroup**: A work phase within a run with rollup metrics, artifact membership, confidence, and caveats.
- **DashboardApiError**: Structured client-facing error or empty-state payload that avoids leaking raw local content.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A browser client can retrieve the session list and a selected run view from the local API without reading files directly.
- **SC-002**: API run overview totals match command-line analyzer totals for the same fixture run.
- **SC-003**: Metadata-only fixture responses contain zero raw prompt, command output, patch, file-content, or message bodies.
- **SC-004**: A fixture run with at least 100 requests and 1,000 artifacts returns a run view within one second on a typical local developer machine.
- **SC-005**: Unknown run and unknown artifact requests return structured not-found responses without process failure.
- **SC-006**: Boundary tests confirm dashboard API modules do not import frontend code and frontend code does not import project internals.

## Assumptions

- The API is local-only and read-only.
- The first client is the new dashboard frontend, but the API contract should also support future local surfaces.
- Existing analyzer outputs remain the source of truth for metrics, labels, task groups, details, privacy states, and caveats.
- Authentication is out of scope while the API binds to a local-only address.
