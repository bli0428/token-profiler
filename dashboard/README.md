# Token Profiler Dashboard

This is a self-contained frontend app for the local dashboard API. It owns its package metadata, dependency lockfile, source, tests, fixtures, styles, and validation commands under `dashboard/`.

For boundary rules and allowed inputs/outputs, see [contract.md](contract.md).

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run test:contracts
npm run test:boundaries
npm run test:styles
npm run build
```

For normal local use, build the dashboard and let the dashboard API serve the
static bundle:

```bash
npm run build
cd ..
node src/cli.js daemon ensure
open http://127.0.0.1:8788
```

From the repository root, `scripts/quickstart-dashboard.sh` performs those
steps. Pass `--configure-codex` only when you want it to edit Codex routing
config for new captures.

For frontend development, use `VITE_DASHBOARD_API_BASE_URL` to point the Vite
dev server at a local API origin:

```bash
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

## Local Services

The built dashboard is served by the read-only dashboard API:

- `http://127.0.0.1:8788`: dashboard UI plus read-only dashboard API
- `http://127.0.0.1:8787`: Codex proxy that captures/forwards model traffic

The frontend should target the dashboard API on `8788`, not the proxy on `8787`.
When served from `8788`, the browser client uses same-origin API requests. Vite
on `5173` is only needed for frontend development.

Start the API from the repository root:

```bash
node src/cli.js dashboard-api serve --port 8788 --origin http://127.0.0.1:5173
```

## Real API Contract

The app follows the implemented dashboard API contract in `src/surfaces/dashboard-api/types.ts` and duplicates those HTTP-facing types in `dashboard/src/api/types.ts`. All successful responses use this envelope:

```ts
{
  schema_version: 1;
  generated_at: string;
  data: T;
  caveats: DashboardApiCaveat[];
}
```

Important field names from the real contract:

- Status uses `service: "token-profiler-dashboard-api"`, `local_only`, `read_only`, `data_root_label`, `data.schema_version`, and `capabilities`.
- Sessions use `run_id` for routing, optional `canonical_run_id` for display/diagnostics only, optional `label`, token totals, and `availability.status`.
- Runs expose `overview`, `artifacts`, `artifact_details`, `task_groups`, `filters`, `privacy`, and `caveats`.
- Artifact rows use flat metric fields such as `total_exposure`, `repeated_exposure`, `inclusion_count`, `estimated_cached_input_tokens`, `estimated_uncached_input_tokens`, plus `task_group_ids`, `preview_state`, `detail_available`, and `search_text`.
- Artifact detail uses `title`, structured `identity`, `metadata_sections`, `tool_links`, `task_group_ids`, `privacy`, optional `content.preview`, and optional `content.raw`.
- Availability is an object, for example `{ status: "complete" }`; it is not a plain string.

Do not implement against plan-only or fixture-only names such as `safe_label`, `privacy_state`, nested row `metrics`, or `categories` at the run root unless the API contract actually adds them.

## API Fixtures

API-real baseline fixtures live in `test/fixtures/api-real/` and are validated by dashboard-owned tests. They cover status, sessions, run view, and artifact detail response envelopes. Edge fixtures cover empty, offline, not-found, partial, stale, metadata-only, hidden-content, and version-mismatch states.

Capture fresh API-real fixtures over HTTP only:

```bash
npm run fixtures:capture -- --api http://127.0.0.1:8788 --run-id <run-id> --artifact-id <artifact-id>
```

The capture command fails unless the API reports ready, local-only, read-only schema version 1 responses. It writes `source.json` beside the baseline fixtures with the selected run/artifact IDs, endpoint paths, validation results, and volatile-field notes. If `--run-id` or `--artifact-id` is omitted, the command selects the first session run and first detail-available artifact and records that selection policy in `source.json`.

Review fixture refreshes before committing:

```bash
git diff -- test/fixtures/api-real
npm run test:contracts
```

Meaningful diffs should be endpoint shape, caveat, privacy, schema, or field changes. Timestamp churn is expected only in API `generated_at` fields and `source.json` capture metadata.

## Isolation Rules

Dashboard production source must not import root `src/`, root surfaces, local JSONL run files, or `dashboard/test/**`. The frontend consumes only HTTP JSON from the dashboard API contract and duplicates client contract types in `src/api/types.ts`, guarded by fixture tests.

Styles are split by responsibility:

- `tokens.css`: shared values
- `layout.css`: shell and panes
- `states.css`: loading, errors, privacy, caveats, availability
- `sessions.css`: session list
- `run-explorer.css`: overview, filters, task groups
- `tables.css`: artifact table
- `detail.css`: artifact detail panel

Root commands should not compile or execute `dashboard/src`; dashboard validation is owned here.
