# Quickstart: Local Metrics Dashboard

## Prerequisites

- Node.js 18+
- Dependencies installed with `npm install`
- A local run directory containing `events.jsonl`, or the existing fixture/demo data used by tests

## Baseline Validation

Run the existing checks before dashboard work:

```bash
npm run typecheck
npm test
```

## Generate A Dashboard For One Run

Use the existing HTML command path for the first vertical slice:

```bash
node src/cli.js html ~/.token-profiler/runs/demo --out /tmp/token-profiler-dashboard.html
```

Expected outcome:

- The command writes an HTML file.
- The page shows overview metrics, top artifact rows, caveats, and request/task context derived from analyzer results.
- The page remains usable when opened locally in a browser.

## Validate Analyzer Parity

Generate JSON and dashboard output for the same run:

```bash
node src/cli.js summarize ~/.token-profiler/runs/demo --json > /tmp/token-profiler-summary.json
node src/cli.js html ~/.token-profiler/runs/demo --out /tmp/token-profiler-dashboard.html
```

Expected outcome:

- Dashboard overview totals match the JSON summary for input, cached input, uncached input, output, exposure, repeated exposure, replay ratio, and context efficiency when those values are available.
- Dashboard artifact rows use analyzer legibility labels and stable IDs.
- Artifact-level cached or uncached estimates display attribution caveats.

## Validate Privacy Modes

Run dashboard model/render tests against metadata-only, preview, and raw-content fixtures:

```bash
node --import tsx --test test/dashboard-privacy.test.js
```

Expected outcome:

- Metadata-only output contains no raw prompt, command output, patch, file-content, or message bodies.
- Preview fields appear only when permitted.
- Raw content is not included by default.
- Hidden and unavailable fields are distinguishable.

## Validate Session Browsing

Run session indexing tests:

```bash
node --import tsx --test test/dashboard-sessions.test.js
```

Expected outcome:

- Recent runs sort by update time.
- At least 20 local sessions can be listed when present.
- Unreadable or partial runs produce visible availability caveats.

Generate a static session index manually:

```bash
node src/cli.js dashboard --out /tmp/token-profiler-sessions.html
```

Expected outcome:

- The command writes an HTML file listing recent local runs.
- The page shows each run's label, timestamp, request count, artifact count, headline token metrics, and availability state when available.

## Final Validation

Before marking the feature complete:

```bash
npm run typecheck
npm test
```

Expected outcome:

- Typecheck passes.
- Dashboard tests pass.
- Existing analyzer and CLI tests continue to pass.

## Implementation Notes

- Implemented as a removable surface under `src/surfaces/dashboard/`.
- `src/surfaces/html-report.ts` is now a compatibility wrapper that renders the dashboard view model.
- The `dashboard` CLI command writes a static recent-session index; `html` writes a static dashboard for one run.
