# Quickstart: Request-First Dashboard

## Prerequisites

- Spec 014 request accounting contract is implemented or representative fixtures are available.
- Root and dashboard dependencies are installed.

## Validate API contract and fixtures

```bash
npm test
cd dashboard
npm run test:contracts
```

Expected outcome:

- Root dashboard API tests include request accounting payloads.
- Dashboard contract tests accept additive `requests` and session identity fields.
- Fixtures do not include hidden raw content for metadata-only cases.

## Validate dashboard type safety

```bash
npm run typecheck
cd dashboard
npm run typecheck
```

Expected outcome:

- Root API contract types and dashboard API consumption types compile.
- Request-first components use dashboard-owned types rather than analyzer-internal types.

## Validate request-first rendering

```bash
cd dashboard
npm test -- src/test/request-first-dashboard.test.tsx src/test/run-explorer.test.tsx
```

Expected outcome:

- The selected-run center pane defaults to chronological request rows.
- Request rows display cached, uncached, input, output, total, and unavailable states.
- Expanding a request shows only request-scoped artifact inclusions with estimated counts and caveats.
- Artifact detail remains available as a secondary drilldown.

## Validate privacy behavior

```bash
cd dashboard
npm test -- src/test/privacy-rendering.test.tsx src/test/privacy-display.test.ts src/test/privacy-fixture-safety.test.ts
```

Expected outcome:

- Metadata-only and hidden-content fixtures render no raw prompt, file, command, patch, tool output, or message bodies.
- Request artifact rows show privacy state and safe display labels only.

## Validate styling and responsiveness

```bash
cd dashboard
npm run test:styles
npm run build
```

Expected outcome:

- Request rows and expanded artifact rows fit the existing dashboard style system.
- Narrow viewport tests or manual browser checks show no overlapping metric labels, controls, or artifact names.
- Build completes without introducing new dependencies.

## Manual Smoke Scenario

1. Start the dashboard against a fixture or local API payload with request accounting.
2. Select the highest-token session from the left list.
3. Confirm the center pane shows chronological requests by default.
4. Expand the highest-token request.
5. Confirm nested artifacts show estimated local token contribution, attribution caveats, and privacy state.
6. Open artifact detail from one nested artifact and confirm returning to requests preserves the selected session and valid expansion state.
