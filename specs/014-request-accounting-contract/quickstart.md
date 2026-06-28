# Quickstart: Request Accounting Contract

## Prerequisites

- Node.js 18+.
- Repository dependencies installed at the root.
- Local fixture or captured JSONL runs available under the dashboard API data root.

## Validate Existing Baseline

```bash
npm test
npm run typecheck
```

Expected outcome: existing analyzer, privacy, session, and dashboard API tests pass before adding the new request accounting contract.

## Scenario 1: Request Rows Expose Provider Usage

Create or reuse a fixture run with at least two `request_usage` events and matching artifact events.

Run the focused analyzer/API tests after implementation:

```bash
node --import tsx --test test/request-accounting.test.js test/dashboard-api-request-accounting.test.js
```

Expected outcome:

- Request rows are chronological.
- Each usage-complete request exposes input, cached input, uncached input, output, and total tokens exactly as provider usage reports them.
- Highest-total and highest-uncached request IDs are derivable from the request accounting summary.

## Scenario 2: Missing Usage Is Not Fabricated

Use a fixture with one request that has artifact events but no completed usage event.

Expected outcome:

- The request appears in accounting output.
- `availability.usage_status` is `missing` or `incomplete`.
- Provider token fields are absent rather than zero.
- Caveats or missing facts name `request_usage`.

## Scenario 3: Request-Scoped Artifact Inclusions

Use a fixture where one request contains multiple artifacts with `artifact_index`, `token_start`, and `token_end`.

Expected outcome:

- Request detail includes only artifacts included in that request.
- Inclusion order follows request order.
- Local token counts are present.
- Estimated cached/uncached inclusion values appear only when provider usage and offsets are available.
- Attribution caveats are present with estimated inclusion values.

## Scenario 4: Metadata-Only Privacy

Use a metadata-only fixture that contains request usage and artifact metadata but no raw content.

Expected outcome:

- Request accounting is still available.
- No response body includes hidden raw prompt, file, command, tool output, or message body content.
- Inclusion privacy states explain hidden or unavailable content.

## Scenario 5: Session Identity Mapping

Use fixtures that cover a direct Codex session identity and a fallback-routed capture.

Expected outcome:

- `run_id` remains the dashboard route identifier.
- Codex-facing identity or diagnostic label is exposed when available.
- Non-one-to-one mappings use `probable`, `best_effort`, or `unknown` confidence with limitations.

## Full Validation

After implementation, run:

```bash
npm test
npm run typecheck
cd dashboard && npm test
cd dashboard && npm run typecheck
```

Expected outcome: all root validation passes, including request accounting contract tests and existing dashboard API privacy tests.
If the sandbox blocks local loopback binding during root proxy tests, rerun `npm test` with permission to bind `127.0.0.1`.
