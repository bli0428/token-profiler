# Contract: Dashboard Surface Cleanup

## Supported Dashboard Workflow

After cleanup, the supported dashboard workflow is:

```bash
node src/cli.js dashboard-api serve --port 8788 --origin http://127.0.0.1:5173
cd dashboard
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

The root package owns the local read-only API. The `dashboard/` package owns the browser app.

## Retained Root Dashboard Surface

The root source may retain dashboard-safe model modules used by the API:

```text
src/surfaces/dashboard/model.ts
src/surfaces/dashboard/privacy.ts
src/surfaces/dashboard/sessions.ts
src/surfaces/dashboard/types.ts
```

Rules:

- These modules may consume analyzer and canonical-store outputs.
- These modules must not import `dashboard/src`.
- These modules must not render embedded browser HTML, CSS, or JS.

## Removed Static Surface

The following are not supported after cleanup:

```text
src/surfaces/dashboard/assets.ts
src/surfaces/dashboard/render.ts
src/surfaces/html-report.ts
token-profiler html ...
token-profiler dashboard ...
```

Rules:

- Root exports must not expose `createHtmlReport`.
- CLI help must not list static dashboard HTML generation as a supported workflow.
- Tests must not assert embedded dashboard HTML/CSS/JS markers as supported behavior.

## Required Validation

- Root tests pass.
- Root typecheck passes.
- Dashboard API tests still pass.
- Metadata-only dashboard-facing API/model checks still prove no hidden raw content leak.
- Architecture checks fail if dashboard API imports static renderer modules.
- Documentation points users to the API/app dashboard workflow.
