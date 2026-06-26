# Quickstart: Dashboard API Surface

## Prerequisites

- Node.js 18+
- Dependencies installed with `npm install`
- Local profiler data under `~/.token-profiler/runs/`, or fixture data created by tests

## Baseline Checks

```bash
npm run typecheck
npm test
```

Expected outcome:

- Typecheck passes.
- Existing tests pass.

## Start The Dashboard API

The implementation should provide a local dashboard API serve command. Expected usage:

```bash
node src/cli.js dashboard-api serve --port 8788
```

Expected outcome:

- The command starts a local read-only API.
- The API does not replace or conflict with the Codex proxy port.
- The API logs the local URL and data root.

## Check Status

```bash
curl http://127.0.0.1:8788/api/status
```

Expected outcome:

- Response includes `schema_version`.
- Response says the service is read-only and local-only.
- Response includes supported capabilities.

## List Sessions

```bash
curl http://127.0.0.1:8788/api/sessions
```

Expected outcome:

- Response includes a `sessions` array.
- Existing runs appear with safe labels, timestamps, counts, metrics, availability, and caveats.

## Inspect A Run

```bash
curl http://127.0.0.1:8788/api/runs/<run-id>
```

Expected outcome:

- Response includes overview metrics, artifacts, artifact details, task groups, filters, privacy state, and caveats.
- Overview totals match `node src/cli.js summarize ~/.token-profiler/runs/<run-id> --json`.

## Inspect One Artifact

```bash
curl http://127.0.0.1:8788/api/runs/<run-id>/artifacts/<artifact-id>
```

Expected outcome:

- Response includes one artifact detail.
- Unknown artifacts return a structured not-found error.

## Validate Privacy

Run the dashboard API privacy tests:

```bash
node --import tsx --test test/dashboard-api-privacy.test.js
```

Expected outcome:

- Metadata-only fixture responses contain no hidden raw prompt, command output, patch, file-content, or message bodies.
- Hidden and unavailable fields remain distinguishable.

## Validate Freshness

Run the dashboard API freshness tests:

```bash
node --import tsx --test test/dashboard-api-freshness.test.js
```

Expected outcome:

- New fixture sessions appear on subsequent session-list requests without restarting the API.
- Updated fixture runs return updated counts and metrics on subsequent requests.

## Final Validation

```bash
npm run typecheck
npm test
```

Expected outcome:

- Typecheck passes.
- Dashboard API tests pass.
- Existing CLI, analyzer, proxy, and dashboard static tests continue to pass.
