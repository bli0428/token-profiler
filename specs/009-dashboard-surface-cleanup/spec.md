# Feature Specification: Current Dashboard Surface Cleanup

**Feature Branch**: `009-dashboard-surface-cleanup`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "A spec to make sure we can clean up the current implementation of surfaces/dashboard."

## User Scenarios & Testing

### User Story 1 - Retire Static String-Based Dashboard Rendering (Priority: P1)

A maintainer can remove the current static dashboard implementation that stores browser code as embedded strings once the dashboard API and isolated app replace it.

**Why this priority**: The current surface was a useful bridge, but it is not the right long-term implementation for an interactive dashboard.

**Independent Test**: Remove the obsolete static dashboard path and verify the remaining dashboard workflows use the new API/app path without relying on embedded string assets.

**Acceptance Scenarios**:

1. **Given** the replacement dashboard API and app are available, **When** the static dashboard files are removed or deprecated, **Then** dashboard users still have a supported way to browse sessions and inspect runs.
2. **Given** the codebase is searched, **When** obsolete string-based dashboard asset modules are inspected, **Then** no live workflow depends on them.
3. **Given** command help is displayed, **When** dashboard commands are shown, **Then** users are directed to the supported dashboard app workflow rather than stale static files.

---

### User Story 2 - Preserve Useful Shared View-Model Behavior (Priority: P1)

A maintainer can preserve any reusable dashboard-safe model transformation while removing rendering code that belongs to the old static surface.

**Why this priority**: Cleanup should remove the wrong surface code without discarding useful privacy-safe adaptation logic.

**Independent Test**: Verify the replacement dashboard API returns equivalent analyzer-derived fields for sessions, runs, artifacts, details, task groups, privacy states, and caveats.

**Acceptance Scenarios**:

1. **Given** existing dashboard model behavior is useful, **When** cleanup occurs, **Then** that behavior is either moved behind the dashboard API or proven redundant before deletion.
2. **Given** metadata-only fixtures, **When** cleanup is complete, **Then** hidden raw content remains absent from dashboard-facing responses.
3. **Given** artifact attribution estimates, **When** cleanup is complete, **Then** caveats remain visible anywhere estimated artifact-level values are exposed.

---

### User Story 3 - Keep Removal Safe And Reversible (Priority: P2)

A maintainer can review a clear compatibility decision for current static commands and know what is removed, what is redirected, and what remains supported.

**Why this priority**: Users may already run static dashboard commands; cleanup should not create confusing broken paths.

**Independent Test**: Run command help, supported dashboard commands, and existing analyzer/CLI tests to confirm static cleanup does not break non-dashboard workflows.

**Acceptance Scenarios**:

1. **Given** the old static session index command exists, **When** cleanup is performed, **Then** it is either removed with clear help text or redirected to the new local dashboard app.
2. **Given** the old per-run HTML command exists, **When** cleanup is performed, **Then** it is either preserved as a simple report, redirected, or explicitly deprecated.
3. **Given** non-dashboard CLI commands exist, **When** cleanup is complete, **Then** summarize, legibility, explain, sessions, proxy, and capture workflows continue to work.

### Edge Cases

- Users may have bookmarked old file-based dashboard paths.
- Existing generated HTML files may remain on disk after code cleanup.
- Static dashboard tests may overlap with new dashboard API/app tests.
- Cleanup may accidentally remove privacy-safe transformation logic still needed by the API.
- Command names may be reused or redirected in confusing ways.
- The API/app specs may not yet be fully implemented when cleanup planning begins.

## Requirements

### Functional Requirements

- **FR-001**: Cleanup MUST identify every live dependency on the current dashboard surface implementation.
- **FR-002**: Cleanup MUST remove or retire embedded browser-code string assets from the supported dashboard path.
- **FR-003**: Cleanup MUST preserve dashboard-safe model transformation behavior that is still needed by the dashboard API.
- **FR-004**: Cleanup MUST remove obsolete tests or update them to target the new dashboard API/app behavior.
- **FR-005**: Cleanup MUST update command help and documentation to reflect the supported dashboard workflow.
- **FR-006**: Cleanup MUST keep non-dashboard CLI workflows working.
- **FR-007**: Cleanup MUST keep privacy guarantees for metadata-only, preview, and raw-content modes.
- **FR-008**: Cleanup MUST keep estimated artifact-attribution caveats visible in supported dashboard-facing outputs.
- **FR-009**: Cleanup MUST document whether old static dashboard commands are removed, redirected, or deprecated.
- **FR-010**: Cleanup MUST leave no source-root compatibility shims or obsolete dashboard modules whose only purpose was the removed static implementation.

### Key Entities

- **DashboardSurfaceInventory**: The list of current dashboard modules, commands, tests, docs, and generated-output assumptions that must be kept, moved, or removed.
- **DashboardCompatibilityDecision**: The chosen behavior for existing static dashboard commands and links.
- **DashboardCleanupResult**: The final supported dashboard path, removed modules, retained model behavior, and validation evidence.

## Success Criteria

### Measurable Outcomes

- **SC-001**: No supported dashboard workflow depends on embedded JavaScript or CSS string blocks.
- **SC-002**: Static dashboard cleanup removes or redirects all obsolete current-surface tests and docs.
- **SC-003**: `summarize`, `legibility`, `explain`, `sessions`, `proxy`, and capture commands continue to pass their existing tests.
- **SC-004**: Metadata-only dashboard-facing fixture validation still shows zero hidden raw content after cleanup.
- **SC-005**: A maintainer can remove the isolated dashboard app later without touching adapters, canonical store, analyzers, or non-dashboard CLI commands.
- **SC-006**: Documentation clearly tells users the supported way to open the dashboard after cleanup.

## Assumptions

- Dashboard API and isolated dashboard app implementation precede or accompany this cleanup.
- Generated static files already on user machines do not need migration.
- This cleanup should not change capture, adapter, canonical store, or analyzer behavior.
- The supported dashboard workflow should remain local-first and read-only.
