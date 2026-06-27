# Feature Specification: Dashboard Shell State Architecture

**Feature Branch**: `011-dashboard-shell-state-architecture`

**Created**: 2026-06-26

**Status**: Superseded by expanded spec 008; retained as an audit reference

**Input**: User description: "Prevent App.tsx or a broad dashboard data hook from becoming an integration sink. Define a mature dashboard app architecture after 008."

**Supersession Note**: The implementation-critical shell, controller, hook, utility, and privacy-policy guardrails from this spec have been folded into `specs/008-dashboard-frontend-app` so they are built from the start. This document is retained only as a future audit/reference checklist.

## User Scenarios & Testing

### User Story 1 - Keep The Dashboard Shell Small (Priority: P1)

A maintainer can add dashboard views without turning `App.tsx` into the owner of routing, data loading, filter behavior, privacy display, and rendering decisions.

**Why this priority**: The dashboard app from spec 008 needs a stable shell before more workflows are added.

**Independent Test**: Inspect the dashboard app and verify `App.tsx` delegates to a shell/controller boundary, with focused modules owning route state, data orchestration, and rendering.

**Acceptance Scenarios**:

1. **Given** spec 008 is complete, **When** the dashboard app initializes, **Then** `App.tsx` mounts the dashboard shell without owning run exploration state.
2. **Given** a user changes sessions, filters, sort order, or selected artifact, **When** state changes, **Then** a controller or route layer owns the transition rules.
3. **Given** new dashboard views are added, **When** they need app state, **Then** they consume owned controller outputs rather than reaching into low-level hooks.

---

### User Story 2 - Protect The Run Explorer Boundary (Priority: P1)

A maintainer can evolve the run exploration experience while keeping run-specific UI, derived view lists, and detail selection out of the global shell.

**Why this priority**: Run exploration will grow fastest and needs a clear boundary before it absorbs unrelated app concerns.

**Independent Test**: Verify the run explorer receives explicit inputs and callbacks, uses pure filter/sort utilities, and does not own global routing or API client setup.

**Acceptance Scenarios**:

1. **Given** a selected run is loaded, **When** the run explorer renders, **Then** it receives a scoped view model and emits explicit user actions.
2. **Given** filters or sort order change, **When** artifact rows update, **Then** pure utilities calculate visible rows from API-provided safe fields only.
3. **Given** no run is selected or the selected run is unavailable, **When** the shell renders, **Then** the run explorer boundary is not forced to interpret app-wide loading, offline, or version states.

---

### User Story 3 - Make Privacy And Refresh Rules Consistent (Priority: P2)

A user sees consistent privacy labels and stable navigation across refreshes, even as sessions, tasks, and artifacts change while Codex runs.

**Why this priority**: Privacy display and state reconciliation must be centralized before more surfaces reuse dashboard records.

**Independent Test**: Use fixture updates to verify privacy labels come from one display policy and refresh reconciliation preserves only valid selected entities.

**Acceptance Scenarios**:

1. **Given** an artifact is hidden, metadata-only, unavailable, uncaptured, previewable, or raw-available, **When** any dashboard component displays it, **Then** it uses the centralized privacy display policy.
2. **Given** a refresh removes the selected session, task, or artifact, **When** state reconciles, **Then** only invalid selections are cleared and the reason is displayable.
3. **Given** API records include both `run_id` and `canonical_run_id`, **When** routes, URLs, API calls, or selection state are updated, **Then** only `run_id` is used for routing.

### Edge Cases

- Spec 008 is incomplete or the dashboard app source does not yet exist.
- `App.tsx` already contains mixed shell, controller, data, filter, and display logic after 008.
- A broad dashboard data hook already fetches status, sessions, runs, artifact details, refresh state, and reconciliation together.
- A selected run disappears during refresh.
- A selected task or artifact no longer exists in the refreshed run.
- A response includes `canonical_run_id` but no routable `run_id`.
- Privacy states are missing, unknown, or partial in older fixture data.
- Searchable text fields are absent because metadata-only privacy is active.

## Requirements

### Functional Requirements

- **FR-001**: This feature MUST depend on completion of spec 008 before any dashboard source changes begin.
- **FR-002**: Dashboard source changes for this feature MUST remain isolated under `dashboard/`.
- **FR-003**: `App.tsx` MUST become a minimal mount point for the dashboard shell and must not own run exploration orchestration.
- **FR-004**: The dashboard MUST define a shell boundary that owns app layout, top-level status states, and controller wiring.
- **FR-005**: The dashboard MUST define a controller or route/controller layer that owns routable state, user actions, refresh orchestration, and state reconciliation.
- **FR-006**: The dashboard MUST define a Run Explorer boundary that receives explicit run-scoped state and callbacks.
- **FR-007**: Dashboard hooks MUST be split by responsibility instead of concentrating API access, URL state, refresh state, filters, detail loading, and reconciliation in one hook.
- **FR-008**: Filter, search, sort, and artifact visibility calculations MUST be pure utilities with fixture-backed tests.
- **FR-009**: Privacy display labels, severity, safe fallback text, and raw-content display decisions MUST be centralized in one app-owned policy module.
- **FR-010**: `canonical_run_id` MUST NOT be used for browser routing, URL state, API route construction, selected-run state, or test fixture routing.
- **FR-011**: State reconciliation MUST preserve valid selected session, task, artifact, filters, and sort state across refresh and clear only invalid selections.
- **FR-012**: Dashboard components MUST consume explicit app-owned types or view models at boundaries.
- **FR-013**: The architecture MUST continue to consume analyzer/dashboard API outputs without recomputing analyzer facts.
- **FR-014**: Tests MUST prove shell/controller boundaries, pure utilities, privacy policy behavior, routable `run_id` usage, and refresh reconciliation.

### Key Entities

- **DashboardShell**: Top-level dashboard surface responsible for layout, app-wide status states, and wiring controller output to views.
- **DashboardController**: Route/controller layer responsible for URL state, selected run/task/artifact, refresh lifecycle, and user action handling.
- **RunExplorerBoundary**: Run-scoped boundary that renders overview, filters, artifacts, tasks, details, privacy, and caveats through explicit props.
- **DashboardHooks**: Small hooks split by status/session loading, selected run loading, artifact detail loading, refresh lifecycle, and URL state.
- **RunViewUtilities**: Pure filter, search, sort, and row visibility functions.
- **PrivacyDisplayPolicy**: Central policy for privacy labels, severity, fallbacks, and raw-content display decisions.
- **DashboardStateReconciler**: Pure reconciliation rules for preserving or clearing selected entities after data refresh.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `App.tsx` contains only shell mounting and app-level provider wiring, with no artifact filtering, run detail fetching, or reconciliation logic.
- **SC-002**: No single dashboard hook owns status loading, session loading, run loading, artifact detail loading, URL state, refresh state, filter/sort logic, and reconciliation together.
- **SC-003**: Unit tests cover filter/sort utilities, privacy display policy, `run_id` routing, and refresh reconciliation rules.
- **SC-004**: Existing spec 008 dashboard behavior remains available after any architecture audit fixes.
- **SC-005**: All source, tests, fixtures, and documentation changes for implementation remain under `dashboard/`, except this spec directory.

## Assumptions

- Spec 008 has completed and the dashboard app exists before implementation begins.
- Spec 007 dashboard API contracts remain the data source.
- The dashboard remains local-first and read-only.
- The architecture may add new files under `dashboard/src/` but must not move code into root `src/`.
- Cleanup of legacy static dashboard code remains out of scope.
