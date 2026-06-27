# Quickstart: Isolated Dashboard Frontend App

## Prerequisites

- Node.js 18+
- Dashboard API from spec 007 available locally, or dashboard app fixture mode available for tests
- Root repository dependencies installed if running repo-wide checks

## Install Dashboard Dependencies

```bash
cd dashboard
npm install
```

Expected outcome:

- `dashboard/package-lock.json` is created or updated.
- Frontend dependencies are installed under `dashboard/node_modules/`, not the root package.

## Run Dashboard Checks

```bash
cd dashboard
npm run typecheck
npm test
npm run test:contracts
npm run test:boundaries
npm run test:styles
npm run build
```

Expected outcome:

- Typecheck passes.
- App tests pass.
- API-real contract fixture tests pass.
- Import/package/style boundary tests pass.
- Production build succeeds.

## Validate Import Boundary

```bash
cd dashboard
npm test -- import-boundary
npm test -- package-boundary
```

Expected outcome:

- The check passes when dashboard source imports only app-local modules and external packages.
- The check fails if dashboard source imports root `src/`.
- The package-boundary check fails if root source or root TypeScript configuration includes `dashboard/src`.

## Validate Contract Fixtures

```bash
cd dashboard
npm run test:contracts
```

Expected outcome:

- API-real status, sessions, run, and artifact detail fixtures match the duplicated dashboard API types.
- Edge fixtures cover offline, structured errors, empty data, metadata-only privacy, large runs, and unsupported versions.
- No dashboard test imports root `src/`.

## Capture API-Real Fixtures

With the spec 007 dashboard API running and at least one usable run available:

```bash
cd dashboard
npm run fixtures:capture -- --api http://127.0.0.1:8788 --run <run-id> --artifact <artifact-id>
```

Expected outcome:

- Fixture JSON is written under `dashboard/test/fixtures/api-real/`.
- The capture script requests only documented HTTP endpoints.
- The capture script does not import root `src/` files or read local run JSONL directly.

## Start The Dashboard API

From the repository root, start the API planned by spec 007:

```bash
node src/cli.js dashboard-api serve --port 8788 --origin http://127.0.0.1:5173
```

Expected outcome:

- The API serves `GET /api/status`, `GET /api/sessions`, `GET /api/runs/:runId`, and artifact detail endpoints locally.

## Start The Dashboard App

```bash
cd dashboard
npm run dev -- --host 127.0.0.1 --port 5173
```

Expected outcome:

- The dev server prints a local URL.
- Opening the URL shows dashboard status and session data when the API is available.

## Configure API Origin

If needed, point the app at the local API:

```bash
cd dashboard
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

Expected outcome:

- The app requests the configured local API origin.
- Offline or CORS failures are displayed as local-connection errors.

## Validate Main User Flows

1. Open the app with the API running.
2. Confirm service status is ready and local/read-only.
3. Select a session.
4. Filter artifacts by task, category, text search, and sort order.
5. Open an artifact detail panel.
6. Trigger manual refresh or wait for interval refresh.

Expected outcome:

- The app preserves valid selection state across refresh.
- Caveats and privacy states remain visible.
- Hidden raw content never appears for metadata-only runs.

## Validate Offline And Version States

```bash
cd dashboard
npm test -- app-offline
npm test -- version
```

Expected outcome:

- Offline fixtures show a retryable local-connection state.
- Unsupported response-version fixtures show a version mismatch state and do not render stale data as valid.

## Final Validation

From `dashboard/`:

```bash
npm run typecheck
npm test
npm run test:contracts
npm run test:boundaries
npm run test:styles
npm run build
```

From the repository root, if root orchestration includes dashboard checks:

```bash
npm run typecheck
npm test
```

Expected outcome:

- Dashboard checks pass.
- Root checks continue to pass without requiring root source imports from the dashboard app. The root `npm test` command is intentionally scoped to root-owned `test/*.test.js`; dashboard tests run from `dashboard/`.
