# Quickstart: Dashboard Contract Drift Guards

## Prerequisites

- Spec 007 dashboard API surface is complete and passing.
- Spec 008 isolated dashboard frontend app is complete and passing.
- Node.js 18+.
- Safe local fixture run data is available and contains no private raw content.

## Generate API-Real Baseline Fixtures

From `dashboard/`, run the fixture capture command owned by spec 008:

```bash
cd dashboard
npm run fixtures:capture -- --api http://127.0.0.1:8788 --run <safe-run-id> --artifact <safe-artifact-id>
```

Expected outcome:

- API-real fixture files are written for status, sessions, run, and artifact detail responses.
- The command fails if the API is unavailable, the schema version is unsupported, or generated fixtures contain hidden raw content.
- Volatile fields are normalized or documented in generation metadata.

## Review Generated Fixture Diff

```bash
git diff -- dashboard/test/fixtures/api-real
```

Expected outcome:

- Endpoint shape, schema version, caveats, privacy states, and field changes are visible.
- Timestamp or local-label changes are normalized or clearly documented.

## Run Dashboard Contract Tests

```bash
cd dashboard
npm test -- contract-drift
npm test -- contract-edge-fixtures
npm test -- privacy-fixture-safety
```

Expected outcome:

- Tests pass using fixture files without a live API process.
- Tests fail if duplicated dashboard API types or parsing logic drift from fixture shape.
- Metadata-only and hidden fixtures render or validate without leaking hidden raw content.

## Validate Import Boundary

```bash
cd dashboard
npm test -- import-boundary
```

Expected outcome:

- Dashboard source and tests do not import root `src/`.
- Production dashboard source does not import `dashboard/test/**`.
- Fixture-consuming tests depend only on dashboard-owned code and JSON fixture data.

## Final Validation

From `dashboard/`:

```bash
npm run typecheck
npm test
npm run build
```

From the repository root:

```bash
npm test
```

Expected outcome:

- Root/API checks pass.
- Dashboard checks pass.
- Contract drift fixtures remain reviewable and safe to commit.
