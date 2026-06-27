# Quickstart: Dashboard Style System

## Prerequisites

- Spec 008 is complete.
- The top-level `dashboard/` app exists and its baseline checks pass.
- Dashboard dependencies are installed under `dashboard/`.

## Baseline Before Migration

```bash
cd dashboard
npm run typecheck
npm test
npm run build
```

Expected outcome:

- The spec 008 dashboard app is working before style files move.

## Inspect Current Styling

```bash
cd dashboard
find src/styles -maxdepth 2 -type f
```

Expected outcome:

- Existing style files are identified.
- `dashboard/src/styles/app.css` is treated as an entrypoint or app-shell file, not as a migration source for broad component styles.

## Implement Style Split

Create dashboard-owned style modules under `dashboard/src/styles/` for:

- `tokens.css`
- `layout.css`
- `states.css`
- `sessions.css`
- `run-explorer.css`
- `tables.css`
- `detail.css`

Expected outcome:

- `dashboard/src/styles/app.css` imports the modules in a documented order.
- Component-specific rules stay out of the entrypoint.

## Run Style Boundary Checks

```bash
cd dashboard
npm test -- style-boundary
```

Expected outcome:

- The check fails if dashboard CSS imports files outside `dashboard/`.
- The check fails if dashboard styles import root project styles or generated static dashboard styles.

## Run State And Visual Checks

```bash
cd dashboard
npm test -- style-states
```

If screenshot or browser visual checks are added:

```bash
cd dashboard
npm test -- visual-regression
```

Expected outcome:

- Normal, empty, offline, version mismatch, metadata-only, partial, stale, large-table, and detail-panel states remain covered.
- Screenshot checks use deterministic fixtures.

## Final Validation

```bash
cd dashboard
npm run typecheck
npm test
npm run build
```

Expected outcome:

- Dashboard checks pass.
- No files outside `dashboard/` need to change for implementation.
