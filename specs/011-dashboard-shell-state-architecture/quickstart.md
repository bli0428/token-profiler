# Quickstart: Dashboard Shell State Architecture

This feature is deferred until spec 008 is complete.

## Preconditions

1. Complete `/specs/008-dashboard-frontend-app/tasks.md`.
2. Confirm `dashboard/` exists and has its own package metadata.
3. Confirm dashboard tests from spec 008 pass.
4. Confirm dashboard source imports no root `src/` modules.

## Implementation Workflow

1. Read [contracts/dashboard-app-architecture.md](./contracts/dashboard-app-architecture.md).
2. Inspect current post-008 files:
   - `dashboard/src/App.tsx`
   - `dashboard/src/shell/`
   - `dashboard/src/hooks/`
   - `dashboard/src/state/view-state.ts`
   - `dashboard/src/run-explorer/`
   - `dashboard/src/test/`
3. Add characterization tests for current behavior before moving logic.
4. Introduce pure utilities and policy modules first.
5. Introduce controller and shell boundaries.
6. Move run-scoped rendering behind the run explorer boundary.
7. Split broad hooks by responsibility.
8. Remove obsolete integration-sink code only after tests pass.

## Validation Commands

Run the commands defined by the completed dashboard package:

```bash
cd dashboard
npm run typecheck
npm test
npm run build
```

If the root project has validation that orchestrates the dashboard package, run it after dashboard-local validation.

## Manual Checks

- `App.tsx` only mounts shell/provider wiring.
- Browser URLs and API calls use `run_id`, not `canonical_run_id`.
- Privacy labels match across session list, artifact table, and detail panel.
- Refresh preserves valid state and clears invalid selections with a visible reason.
- No implementation files outside `dashboard/` are required.
