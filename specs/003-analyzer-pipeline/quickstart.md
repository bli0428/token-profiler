# Quickstart: Modular Analyzer Pipeline

## Prerequisites

- Node.js 18+
- Dependencies installed with `npm install`
- Spec 001 canonical records available
- Spec 006 module-boundary migration complete enough that analyzers live under `src/analysis/` and do not import adapters

## Validate The Feature

### 1. Typecheck

```bash
npm run typecheck
```

Expected result:

- TypeScript completes without errors.
- Analyzer result types compile for CLI/report consumers.

### 2. Run The Test Suite

```bash
npm test
```

Expected result:

- Existing aggregate/report behavior remains green during migration.
- Analyzer fixture tests cover exposure, cache attribution, persistence, partial data, and metadata-only runs.

### 3. Validate Architecture Boundaries

```bash
npm test -- test/architecture-boundaries.test.js
```

Expected result:

- Analysis modules do not import provider-specific adapter, live-proxy, log-import, or surface code.
- Surfaces consume analyzer results rather than source payloads.

### 4. Validate Exposure And Replay

Run the analyzer pipeline against a fixture with repeated artifacts and changed content.

Expected result:

- Total exposure equals the sum of all artifact local token counts.
- Unique exposure counts the first content hash appearance only.
- Repeated exposure counts later appearances of already-seen content.
- Changed content under the same artifact identity increments distinct hash count.
- Top contributors are deterministically ordered.

### 5. Validate Cache Attribution And Coordinate Normalization

Run the cache-attribution analyzer against fixtures for:

- exact local/provider token match
- local artifact estimates lower than provider input tokens
- reconstructed artifact coordinate ranges higher than provider input tokens
- missing provider usage
- missing artifact offsets

Expected result:

- Provider totals are reported separately from local artifact estimates.
- Under-attributed requests expose an unattributed remainder.
- Overlong reconstructed ranges are proportionally normalized before cached/uncached allocation.
- Missing usage or offsets produce partial/unavailable states, not zero-valued complete metrics.
- User-facing output includes the local-estimate attribution caveat.

### 6. Validate Metadata-Only Behavior

Run fixtures that contain canonical metadata without raw content or previews.

Expected result:

- Exposure, replay, top contributors, persistence basics, and attribution availability still render.
- No analyzer requires raw stored content for baseline metrics.
- Missing readable labels do not block metric calculation.

### 7. Validate Surface Parity

Render the CLI report and any structured analyzer export from the same fixture run.

Expected result:

- Headline totals match across consumers.
- Top contributor ordering matches.
- Attribution caveats match.
- Partial/unavailable analyzer states are rendered consistently.

## Expected Artifacts

The implementation should produce or update tests for:

- exact, under-attributed, overlong-normalized, missing-usage, and missing-offset cache attribution
- repeated content and changed content exposure
- continuous and reintroduced persistence
- metadata-only baseline analysis
- analyzer registry/addition behavior
- CLI/report parity with analyzer results

## Out Of Scope For This Feature

- New capture adapters
- SQLite persistence
- Dashboard UI implementation
- Full spec 004 task grouping and artifact drilldown behavior
- Provider-specific analyzer logic
