# Contract: Dashboard App Architecture

This contract applies after spec 008 is complete. It defines internal dashboard app boundaries only; it does not change the dashboard API contract.

## Source Isolation

- All implementation files for this feature live under `dashboard/`.
- Dashboard source must not import root `src/`, analyzer, adapter, canonical store, CLI, or static dashboard modules.
- Contract-facing types are owned by the dashboard app.

## App Boundary

`dashboard/src/App.tsx` is the app mount point.

Allowed responsibilities:

- Mount `DashboardShell`.
- Attach app-level providers if the dashboard package already uses them.
- Load global CSS.

Disallowed responsibilities:

- Fetch sessions, runs, or artifact details.
- Parse or write dashboard route state.
- Filter, search, sort, or reconcile run data.
- Render privacy labels directly.

## Shell Boundary

`dashboard/src/shell/DashboardShell.tsx` owns top-level dashboard composition.

Inputs:

- Controller state.
- Controller actions.

Responsibilities:

- Render app-wide loading, offline, version mismatch, and retry states.
- Lay out session navigation and selected-run workspace.
- Pass run-scoped state into the run explorer boundary.

Non-responsibilities:

- API client setup.
- Browser route parsing.
- Artifact row filtering or sorting.
- Privacy decision logic.

## Controller Boundary

`dashboard/src/controllers/DashboardController.tsx` composes stateful app behavior.

Responsibilities:

- Compose focused hooks.
- Own URL state transitions.
- Own selected session, task, artifact, filters, sort, and refresh actions.
- Call the reconciliation utility after data refresh.
- Provide view models to shell and run explorer.

Rules:

- `run_id` is the only routable run identifier.
- `canonical_run_id` may be displayed or logged only when clearly labeled as non-routable metadata.
- Controller outputs must be explicit app-owned types.

## Run Explorer Boundary

`dashboard/src/explorer/RunExplorer.tsx` owns selected-run rendering.

Inputs:

- Selected run view model.
- Visible artifact rows.
- Selected task and artifact IDs.
- Privacy display values.
- Run-scoped actions.

Responsibilities:

- Render overview, task groups, filters, artifact table, detail panel, caveats, and run-scoped empty states.
- Emit explicit actions rather than mutating route state directly.

Non-responsibilities:

- Fetch status or sessions.
- Parse browser URLs.
- Construct API paths.
- Reconcile refresh state.

## Hook Boundary

Hooks are split by responsibility:

- `useDashboardStatus`
- `useSessions`
- `useRunData`
- `useArtifactDetail`
- `useRefreshLifecycle`
- `useUrlRunState`

Rules:

- A hook may own one data domain or browser-state concern.
- Cross-domain orchestration belongs in the controller.
- Hooks must expose explicit return types.

## Pure Utility Boundary

`dashboard/src/utils/run-view-utils.ts` owns filter, search, sort, and option-building helpers.

Rules:

- Utilities are pure and deterministic.
- Utilities consume API-provided safe fields only.
- Utilities do not calculate analyzer metrics, task groups, caveats, or privacy decisions.

## Privacy Display Boundary

`dashboard/src/policy/privacy-display-policy.ts` owns privacy display.

Rules:

- All components use policy outputs for labels, severity, fallback text, and raw-content eligibility.
- Unknown privacy states are treated as restricted.
- Hidden raw content is never displayed unless the API state explicitly allows raw display.

## Reconciliation Boundary

`dashboard/src/state/reconcile-dashboard-state.ts` owns refresh reconciliation.

Rules:

- Preserve valid selected run, task, artifact, filters, and sort state.
- Clear invalid selections with displayable reasons.
- Do not silently substitute `canonical_run_id` for missing `run_id`.
