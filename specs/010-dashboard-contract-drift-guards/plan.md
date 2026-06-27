# Implementation Plan: Dashboard Contract Drift Guards

> Superseded by expanded spec 008. Retained as an audit/reference artifact; do not implement as a separate feature unless spec 008 is later split again.

**Branch**: `010-dashboard-contract-drift-guards` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-dashboard-contract-drift-guards/spec.md`

## Summary

Audit the contract drift guards that expanded spec 008 now owns. The work verifies API-real baseline fixtures captured from actual local dashboard API responses, curated edge fixtures, and isolated dashboard fixture-consuming tests while preserving the no-root-`src/` import boundary and the no-production-fixture-import boundary.

The dashboard package owns the HTTP fixture capture script, fixture-consuming tests, and duplicated API-facing type validation. This reference does not implement the dashboard API or the dashboard app and should not be run as a separate queue unless spec 008 is split again.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+ for dashboard-owned capture helpers and dashboard tests.

**Primary Dependencies**: Existing root dashboard API implementation from spec 007 and dashboard frontend package from spec 008. Prefer built-in Node fetch/file APIs or existing project test tooling.

**Storage**: Generated JSON fixtures committed under a reviewable fixture location. Dashboard tests read fixture files only; no direct reads from local profiler run storage.

**Testing**: Dashboard-owned fixture capture validation plus dashboard-owned contract tests, privacy no-leak tests, unsupported-version tests, structured-error tests, and import-boundary tests.

**Target Platform**: Local developer machine with completed dashboard API and isolated dashboard app.

**Project Type**: Audit reference for cross-boundary validation between a root local API surface and a separate dashboard frontend package.

**Performance Goals**: Fixture-consuming dashboard tests should run without a live API process. Fixture generation should complete against a local fixture run within normal repository test expectations.

**Constraints**: Do not import root `src/` from dashboard source or tests. Do not import `dashboard/test/**` from production `dashboard/src/**`. Do not replace dashboard behavior fixtures from spec 008. Do not generate baselines from private raw local data. Normalize or document volatile fields.

**Scale/Scope**: Cover `GET /api/status`, `GET /api/sessions`, `GET /api/runs/:runId`, `GET /api/runs/:runId/artifacts/:artifactId`, structured errors, privacy edge cases, empty/partial/stale states, unsupported versions, and large-run shape.

## Constitution Check

- **Local-first observability**: Pass. Fixture generation and tests run locally.
- **Privacy modes**: Pass if generated and edge fixtures are validated to exclude hidden raw content.
- **Provider-agnostic insight**: Pass. Fixtures represent dashboard API records derived from canonical/analyzer outputs, not provider payloads.
- **Architecture boundaries**: Pass if dashboard tests read fixture JSON without importing root `src/`.
- **Explainability over raw numbers**: Pass. Fixtures include caveats, privacy states, and structured errors, not only metrics.
- **Documentation separation**: Pass. Contract fixture rules are documented in contracts and quickstart.
- **Code organization**: Pass if generation, fixture data, dashboard consumers, and validation tests remain explicitly owned.

## Project Structure

### Documentation (this feature)

```text
specs/010-dashboard-contract-drift-guards/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-contract-fixtures.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root, audit target)

```text
dashboard/
├── scripts/
│   └── capture-api-fixtures.ts
├── src/
│   ├── api/
│   │   └── duplicated client contract types from spec 008
│   └── test/
│       ├── contract-fixtures.test.ts
│       └── privacy-fixture-safety.test.ts
├── test/
│   ├── fixtures/
│   │   ├── api-real/
│   │   │   ├── status.json
│   │   │   ├── sessions.json
│   │   │   ├── run.json
│   │   │   └── artifact-detail.json
│   │   ├── edge-fixtures.ts
│   │   └── large-run-fixture.ts
│   └── helpers/
│       └── contract-fixtures.ts
└── README.md
```

**Structure Decision**: Dashboard-owned tooling captures API-real fixtures through documented HTTP endpoints. Dashboard production source consumes only runtime HTTP responses; dashboard tests consume fixture JSON through test-owned helpers and remain isolated from root `src/`.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not make dashboard tests import API implementation types, mappers, analyzers, stores, or helpers from root `src/`.
- Do not generate fixtures from private local runs that contain hidden raw content.
- Do not update generated baselines silently as part of normal dashboard tests.
- Do not treat schema-version drift as a warning.
- Do not replace edge fixtures with only happy-path API-real baselines.
- Do not change the 007 or 008 feature specs as part of this follow-up.
- Do not make a live API process required for ordinary dashboard contract tests after fixtures exist.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-contract-fixtures.md](./contracts/dashboard-contract-fixtures.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Commands and fixtures stay local.
- **Privacy modes**: Pass. The contract requires raw-content leak checks.
- **Provider-agnostic insight**: Pass. Fixture inputs are dashboard API payloads only.
- **Architecture boundaries**: Pass. Dashboard consumes JSON fixtures without root imports.
- **Explainability over raw numbers**: Pass. Fixture coverage includes caveats, structured errors, and privacy states.
- **Documentation separation**: Pass. Fixture contract and commands are separated from product prose.
- **Code organization**: Pass. Planned files separate generator, fixtures, tests, and docs.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
