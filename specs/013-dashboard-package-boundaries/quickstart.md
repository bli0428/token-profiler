# Quickstart: Dashboard Package Boundaries

This feature is deferred until spec 008 is complete. Do not run these checks as implementation guidance until the `dashboard/` package exists with its own scripts.

## Validate Dashboard-Owned Commands

```bash
cd dashboard
npm run typecheck
npm test
npm run build
```

The exact script names may be extended by spec 008, but the dashboard package remains the owner of dashboard validation.

## Validate Browser API Base URL

```bash
cd dashboard
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:4319 npm run build
```

Dashboard browser code must use `VITE_DASHBOARD_API_BASE_URL` for API origin override.

## Validate Root Independence

```bash
npm run typecheck
```

Root typecheck must not compile `dashboard/src`. If an all-package root command exists, it should delegate to dashboard-owned scripts rather than duplicating their logic.

## Boundary Checklist

- Dashboard build, typecheck, test, preview, and import-boundary scripts live in `dashboard/package.json`.
- Root scripts only orchestrate dashboard scripts.
- Root `tsconfig` does not include `dashboard/src`.
- Root source does not import dashboard app code.
- Dashboard source does not import root `src`.
- Frontend dependencies are owned by `dashboard/package.json`.
