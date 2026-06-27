# Contract: Dashboard Package Boundary

## Status

Deferred until spec 008 is complete.

## Ownership Rules

### Dashboard Package Owns

- `dashboard/package.json` scripts for dashboard build, typecheck, tests, preview, and import-boundary validation.
- Dashboard frontend dependencies and dev dependencies.
- Dashboard source, tests, fixtures, styles, Vite config, TypeScript config, and browser API client configuration.
- Validation that dashboard source does not import root `src` or root internal modules.

### Root Package May Own

- Root-only typecheck and tests for root source.
- Optional all-package orchestration scripts that invoke dashboard-owned scripts.
- Validation that root source and root TypeScript configuration do not depend on `dashboard/src`.

### Root Package Must Not Own

- Dashboard frontend dependencies.
- Dashboard build pipeline internals.
- Dashboard component, fixture, or browser API test logic.
- TypeScript compilation of `dashboard/src` as part of root source typecheck.

## Environment Contract

The browser app API origin override is:

```text
VITE_DASHBOARD_API_BASE_URL
```

No other browser API base URL name is supported by this feature.

## Import Contract

Dashboard source must not import:

- `src/`
- `src/adapters/`
- `src/core/`
- `src/analysis/`
- `src/surfaces/cli/`
- `src/surfaces/dashboard/`
- root package internals through aliases or relative escapes

Root source must not import:

- `dashboard/src`
- dashboard app components, hooks, fixtures, styles, or Vite-specific modules

## Dependency Contract

Frontend runtime and tooling dependencies belong in `dashboard/package.json`. Root dependencies are reserved for root-owned capture, store, analyzer, CLI, API, and non-dashboard app code.

## Validation Contract

- Dashboard import-boundary validation is invoked from `dashboard/package.json`.
- Root independence validation may live in root tooling, but it checks only that root source does not include or import dashboard app code.
- A root all-check command may invoke dashboard validation by running dashboard package scripts.
