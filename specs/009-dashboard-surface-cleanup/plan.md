# Implementation Plan: Current Dashboard Surface Cleanup

**Branch**: `009-dashboard-surface-cleanup` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-dashboard-surface-cleanup/spec.md`

## Summary

Retire the old string-rendered static dashboard surface now that the dashboard API and isolated `dashboard/` frontend exist. Preserve dashboard-safe model/session transformation code that the API still uses, but remove embedded browser asset/rendering modules, old static HTML report exports, and stale CLI/documentation paths that tell users to generate dashboard HTML files.

This cleanup keeps the supported dashboard workflow local-first and read-only: start `dashboard-api serve`, then run the isolated dashboard app. Non-dashboard CLI report workflows remain intact.

## Technical Context

**Language/Version**: TypeScript and JavaScript on Node.js 18+.

**Primary Dependencies**: Existing root package dependencies only. No new runtime or dev dependencies.

**Storage**: No storage changes. The dashboard API continues to read local JSONL run data through existing canonical store/analyzer paths.

**Testing**: Root `npm test` and `npm run typecheck`. Keep dashboard API/model/session tests. Remove or replace tests that only validate embedded static dashboard HTML/CSS/JS rendering. Add CLI/help and architecture checks proving obsolete static renderer modules are gone and dashboard guidance points to the API/app workflow.

**Target Platform**: Local developer machine with Node.js 18+.

**Project Type**: Cleanup of root surface modules and CLI/docs after the isolated dashboard frontend implementation.

**Performance Goals**: No new runtime performance target. Existing API and dashboard app validation remain the performance guardrails.

**Constraints**: Do not remove dashboard-safe model, privacy, session, or type code still used by the dashboard API. Do not make root code import `dashboard/src`. Do not change capture, adapters, canonical store, analyzer behavior, or dashboard API response contracts. Preserve privacy no-leak guarantees and attribution caveats.

**Scale/Scope**: Remove static string-rendering surface modules and stale CLI/documentation workflows. Keep `dashboard-api serve`, analyzer/CLI textual reports, dashboard API tests, and isolated dashboard package intact.

## Constitution Check

- **Local-first observability**: Pass. Supported dashboard remains local through the API/app workflow.
- **Privacy modes**: Pass if API privacy tests remain and static raw-content rendering code is removed.
- **Provider-agnostic insight**: Pass. Cleanup does not change analyzer or provider boundaries.
- **Architecture boundaries**: Pass if root source does not import frontend code and static rendering modules are removed without touching adapters/store/analyzers.
- **Explainability over raw numbers**: Pass. Dashboard API/app still expose caveats, artifacts, task groups, and details.
- **Documentation separation**: Pass. Technical cleanup details live in plan/contracts/tasks.
- **Code organization**: Pass if retained dashboard-safe model code remains separate from API and CLI orchestration.

## Project Structure

### Documentation (this feature)

```text
specs/009-dashboard-surface-cleanup/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-surface-cleanup.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── index.js                         # remove static HTML report export
├── surfaces/
│   ├── cli/
│   │   ├── index.ts                 # remove old html/dashboard command dispatch
│   │   ├── report-commands.ts       # remove static dashboard command handlers
│   │   └── utils.ts                 # update help text to API/app workflow
│   ├── dashboard/
│   │   ├── model.ts                 # retained: dashboard-safe model for API
│   │   ├── privacy.ts               # retained: privacy display/model policy
│   │   ├── sessions.ts              # retained: session summaries for API
│   │   └── types.ts                 # retained: dashboard-safe model types
│   ├── dashboard-api/               # retained
│   └── html-report.ts               # removed
test/
├── dashboard-api*.test.js           # retained
├── dashboard-model.test.js          # retained
├── dashboard-sessions.test.js       # retained
├── dashboard-render.test.js         # removed
├── dashboard-privacy.test.js        # replaced by API/model privacy coverage
├── cli-dashboard-cleanup.test.js    # added
└── architecture-boundaries.test.js  # updated
README.md                           # update dashboard workflow docs
```

**Structure Decision**: Treat `src/surfaces/dashboard/` as the retained dashboard-safe model package for now because the API depends on it. Retire only the string-rendered browser surface: `assets.ts`, `render.ts`, `html-report.ts`, old CLI commands, and tests/docs that validate static HTML files as the supported dashboard.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not delete `model.ts`, `privacy.ts`, `sessions.ts`, or `types.ts` while `dashboard-api` imports them.
- Do not move dashboard-safe model code into the top-level `dashboard/` frontend package.
- Do not preserve obsolete static renderer modules as compatibility shims.
- Do not leave CLI help advertising static dashboard HTML generation as the supported dashboard workflow.
- Do not change dashboard API response contracts as part of this cleanup.
- Do not remove privacy/caveat tests; redirect coverage to API/model behavior where needed.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-surface-cleanup.md](./contracts/dashboard-surface-cleanup.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. The replacement dashboard path is local API plus local Vite app.
- **Privacy modes**: Pass. API and dashboard-safe model tests remain the privacy boundary.
- **Provider-agnostic insight**: Pass. Cleanup removes rendering code only.
- **Architecture boundaries**: Pass. No root source imports the isolated dashboard frontend.
- **Explainability over raw numbers**: Pass. API/app remain the supported explanatory dashboard path.
- **Documentation separation**: Pass. User-facing README receives workflow guidance; cleanup mechanics stay here.
- **Code organization**: Pass. Static rendering modules are removed instead of kept as stale compatibility wrappers.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
