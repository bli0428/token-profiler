# Quickstart: Validate Codex Turn Request Drilldown

## Prerequisites

- Install project dependencies in the root and dashboard workspaces.
- Restart any already-running live proxy before validating; only traffic captured after restart emits request-level turn identity facts.
- Use new captured Codex traffic after the proxy has been restarted with this feature.
- For deterministic validation, add or update fixtures that include direct turn identity, missing turn identity, user previews, assistant previews, and metadata-only capture.

## Validation Flow

### 1. Capture And Canonical Contract

Run targeted root tests that cover Codex turn metadata parsing and canonical turn fields:

```bash
node --import tsx --test test/session-router.test.js
```

Expected outcome:

- Requests with source turn identity produce canonical turn facts.
- Requests with the same turn identity share the same turn grouping key.
- Missing turn identity is explicit.

### 2. Analyzer Hierarchy

Run analyzer/model tests for turn grouping and title selection:

```bash
node --import tsx --test test/dashboard-model.test.js
```

Expected outcome:

- One run can produce `turns -> requests -> artifacts`.
- Turn titles prefer user previews when allowed.
- Request titles prefer assistant previews when allowed.
- Metadata-only fixtures still group by turn id without exposing hidden content.

### 3. Dashboard API Contract

Run dashboard API contract tests:

```bash
node --import tsx --test test/dashboard-api-request-accounting.test.js
```

Expected outcome:

- Run detail includes a `turns` collection.
- Request accounting remains available.
- Artifact details remain keyed by artifact id.

### 4. Dashboard Surface

Run dashboard typecheck and targeted UI tests:

```bash
cd dashboard
npm run typecheck
npm test -- src/test/turn-drilldown-dashboard.test.tsx
```

Expected outcome:

- The run explorer renders turns as the top drilldown layer.
- Expanding a turn shows request rows with assistant-preview titles.
- Expanding a request reaches artifact detail rendering.
- Fallback/missing-turn states remain visible.

### 5. Full Verification

Run the normal root and dashboard checks after targeted tests pass:

```bash
npm run typecheck
npm test
cd dashboard
npm run typecheck
npm test
```

Expected outcome:

- All relevant root checks pass.
- Dashboard tests pass or only report known unrelated failures documented in the implementation summary.

## Manual Dashboard Check

1. Restart the proxy after implementation so new traffic records first-class turn identity.
2. Capture a Codex session with at least two user turns.
3. Open the dashboard and select the captured session.
4. Verify the run detail shows:
   - turn rows titled by user previews,
   - request rows titled by assistant previews,
   - artifact expansion below each request,
   - explicit fallback labels for any request missing turn identity.
