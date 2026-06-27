# Quickstart: Current Dashboard Surface Cleanup

## Prerequisites

- Spec 007 dashboard API is implemented.
- Spec 008 isolated dashboard app is implemented.
- Root dependencies are installed.
- Dashboard dependencies are installed if validating the frontend package.

## Validate Supported Dashboard Workflow

From the repository root:

```bash
node src/cli.js dashboard-api serve --port 8788 --origin http://127.0.0.1:5173
```

From `dashboard/`:

```bash
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

Expected outcome:

- The API serves local read-only dashboard data.
- The dashboard app consumes the API over HTTP.

## Validate Static Surface Cleanup

```bash
rg -n "renderDashboardHtml|DASHBOARD_CSS|DASHBOARD_SCRIPT|createHtmlReport|runHtml|runDashboard" src test README.md
```

Expected outcome:

- No live source, test, or README reference advertises the retired static dashboard renderer.

## Run Root Validation

```bash
npm test
npm run typecheck
```

Expected outcome:

- Dashboard API/model/session tests still pass.
- Non-dashboard CLI and analyzer tests still pass.
- Architecture-boundary tests prove the API does not depend on static renderer modules.

## Run Dashboard Package Validation

From `dashboard/`:

```bash
npm run typecheck
npm test
npm run build
```

Expected outcome:

- The isolated dashboard app remains the supported browser UI.
