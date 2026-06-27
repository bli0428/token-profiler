# Research: Dashboard Contract Drift Guards

## Decision: Use API-real baseline fixtures generated from the completed local API

**Rationale**: The frontend duplicates API-facing types by design, so generated fixtures from real `/api/status`, `/api/sessions`, `/api/runs/:runId`, and `/api/runs/:runId/artifacts/:artifactId` responses are the most direct guard against drift.

**Alternatives considered**:

- Import root API types into the dashboard package: rejected because it breaks the isolation requirement from spec 008.
- Hand-maintain only synthetic fixtures: useful for edges, but insufficient to prove the frontend still matches real API output.

## Decision: Keep fixture-consuming tests inside the dashboard package

**Rationale**: The drift guard must exercise the same boundary as the app: static JSON or HTTP-shaped data entering the dashboard client. Dashboard tests should parse and render fixtures without root implementation knowledge.

**Alternatives considered**:

- Validate fixtures only in root tests: rejected because it would miss dashboard-side duplicated type drift.
- Run all dashboard tests against a live API: rejected because ordinary frontend tests should remain deterministic and not depend on local run state.

## Decision: Keep fixture capture dashboard-owned and HTTP-only

**Rationale**: Generating API-real baselines only requires the completed dashboard API's public HTTP contract. Keeping the capture script under `dashboard/scripts/` exercises the same external-client boundary as the app and avoids adding root/API helper code solely for frontend fixtures.

**Alternatives considered**:

- Put the generator under root `src/surfaces/dashboard-api/`: rejected because spec 008 now owns HTTP fixture capture and root/API helper code would add avoidable coupling.
- Require manual curl commands only: simple, but less repeatable and easier to refresh inconsistently.

## Decision: Normalize or document volatile fields

**Rationale**: API responses naturally include `generated_at`, freshness markers, and local labels. Reviewable fixtures need stable output or explicit volatile-field handling so meaningful contract changes stand out.

**Alternatives considered**:

- Snapshot raw responses exactly: high fidelity but noisy and likely to create unreviewable timestamp diffs.
- Strip all metadata: rejected because schema version, generated time, caveats, and local/read-only status are part of the contract.

## Decision: Maintain both baseline and edge fixtures

**Rationale**: API-real baselines prove current happy-path shape. Edge fixtures prove privacy, structured errors, empty states, partial data, stale data, large-run shape, and unsupported versions that may be hard to generate on demand.

**Alternatives considered**:

- Use only generated real fixtures: insufficient coverage for rare but important states.
- Use only edge fixtures: insufficient proof that the real API and duplicated frontend types remain aligned.
