# Data Model: Dashboard Shell State Architecture

## DashboardShell

Top-level dashboard composition boundary.

**Fields / state**:

- `controllerState`: App-ready, offline, version mismatch, loading, selected-run, and error states from the controller.
- `controllerActions`: Explicit user actions for retry, refresh, session selection, task selection, artifact selection, filter changes, and sort changes.

**Relationships**:

- Mounted by `App.tsx`.
- Renders app-wide status and delegates run-specific UI to `RunExplorerBoundary`.

**Validation rules**:

- Does not fetch dashboard data directly.
- Does not calculate filtered artifact rows.
- Does not construct API routes.

## DashboardController

Route/controller layer that composes hooks and pure state rules.

**Fields / state**:

- `selectedRunId`: API-routable run ID.
- `selectedTaskId`: Selected task scope, if any.
- `selectedArtifactId`: Selected artifact detail, if any.
- `filters`: Search text, category, task, and visibility filters.
- `sort`: Artifact table sort key and direction.
- `refresh`: In-flight, last successful refresh, stale, partial, offline, not-found, or version mismatch state.

**Relationships**:

- Uses focused hooks for status, sessions, run data, artifact detail, URL state, and refresh lifecycle.
- Calls `DashboardStateReconciler` after successful refreshes.
- Provides `RunExplorerBoundary` view models.

**Validation rules**:

- Selection state stores `run_id`, never `canonical_run_id`.
- Browser URLs and API calls are derived only from `run_id`.
- Reconciliation clears only selections that no longer exist.

## RunExplorerBoundary

Run-scoped user interface contract.

**Fields**:

- `run`: Selected run view model.
- `visibleArtifacts`: Filtered and sorted artifact rows.
- `selectedTaskId`: Current task selection.
- `selectedArtifactId`: Current artifact selection.
- `privacyDisplay`: Privacy display view models from the policy module.
- `caveats`: Run, artifact, and attribution caveats.
- `actions`: Run-scoped callbacks.

**Relationships**:

- Receives data from `DashboardController`.
- Uses presentational components for overview, task groups, filters, table, and detail panel.

**Validation rules**:

- Does not own URL parsing.
- Does not fetch status or sessions.
- Does not use `canonical_run_id` for selection or routing.

## DashboardHooks

Small hooks split by responsibility.

**Members**:

- `useDashboardStatus`: Service status, capability, and version readiness.
- `useSessions`: Session list loading and errors.
- `useRunData`: Selected run loading by `run_id`.
- `useArtifactDetail`: Artifact detail loading for selected run/artifact.
- `useRefreshLifecycle`: Manual and interval refresh state.
- `useUrlRunState`: Browser URL read/write for routable state.

**Validation rules**:

- No hook owns unrelated data domains.
- Hooks expose explicit return types.
- Hooks do not recompute analyzer facts.

## RunViewUtilities

Pure functions for local view operations.

**Functions**:

- Filter artifact rows by safe text, category, task, and privacy-compatible visibility.
- Sort artifact rows by supported display columns.
- Build filter option lists from API-provided safe fields.

**Validation rules**:

- Inputs and outputs are immutable.
- Missing metrics remain missing, not zero.
- Search uses safe display fields only.

## PrivacyDisplayPolicy

Centralized dashboard privacy display rules.

**Fields / outputs**:

- `label`: User-facing privacy label.
- `severity`: Neutral, warning, restricted, unavailable, or preview.
- `fallbackText`: Safe text when raw content is hidden or absent.
- `canDisplayRawContent`: Boolean derived from API privacy state.

**Validation rules**:

- Hidden, metadata-only, unavailable, uncaptured, previewable, and raw-available states are distinct.
- Unknown privacy state falls back to a restricted display.
- No component invents raw-content eligibility outside this policy.

## DashboardStateReconciler

Pure state transition rules after data refresh.

**Inputs**:

- Previous dashboard state.
- Refreshed sessions.
- Refreshed selected run, if available.
- Refreshed artifact detail availability.

**Outputs**:

- Reconciled selected run, task, artifact, filters, and sort state.
- Displayable reconciliation reason when selections are cleared.

**Validation rules**:

- Preserve selected run when its `run_id` still exists.
- Clear selected task when the refreshed run no longer contains it.
- Clear selected artifact when the refreshed run no longer contains it.
- Preserve filters and sort unless their selected option is no longer valid.
