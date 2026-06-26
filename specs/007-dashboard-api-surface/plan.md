# Implementation Plan: Dashboard API Surface

**Branch**: `007-dashboard-api-surface` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-dashboard-api-surface/spec.md`

## Summary

Add a local read-only dashboard API surface that exposes versioned JSON for service status, session lists, run views, and artifact detail. The API adapts existing canonical local run data and analyzer/dashboard-safe view-model outputs into a stable HTTP contract for an isolated dashboard frontend. The frontend must consume this API over HTTP and must not import project internals.

The API is a surface layer. It does not capture provider traffic, parse provider-specific payloads, recompute analyzer metrics, or write captured run data. It reads local JSONL run data through canonical store utilities, invokes the analyzer pipeline, applies dashboard-safe privacy/model transformations, and returns client-facing JSON.

## Technical Context

**Language/Version**: TypeScript and JavaScript on Node.js 18+

**Primary Dependencies**: Existing runtime dependency `tiktoken`; existing development dependencies `tsx`, `typescript`, and `@types/node`. Use Node's built-in HTTP primitives for the first API surface; do not add runtime web framework dependencies unless planning later justifies them.

**Storage**: Existing local JSONL event files under `~/.token-profiler/runs/`. The API reads run data on request and does not introduce SQLite, persisted API caches, or remote storage.

**Testing**: `npm test` (`node --import tsx --test`) and `npm run typecheck` (`tsc --noEmit`). Add focused node tests for API route handling, response contracts, privacy no-leak behavior, not-found/error responses, freshness after local data changes, and architecture boundaries.

**Target Platform**: Local developer machine with Node.js 18+, macOS-first for current Codex workflows and Node-compatible for tests.

**Project Type**: Local CLI/proxy library with local HTTP dashboard API surface.

**Performance Goals**: Session list and selected run API responses should be usable for local runs with at least 100 requests and 1,000 artifact rows. A fixture run of that size should return a run view within one second on a typical local developer machine.

**Constraints**: API binds locally by default, is read-only, and exposes dashboard-safe JSON only. Provider-specific payloads terminate at adapters. Analyzers consume canonical records only. Dashboard API modules must not import frontend code. Hidden raw content must not be serialized in API payloads, search text, logs, or errors. Artifact-level cached/uncached attribution remains estimated and caveated.

**Scale/Scope**: Implement a local HTTP API with status, sessions, run view, artifact detail, and health/not-found responses. Reuse or move the current dashboard-safe model transformation behind the API. Do not implement the isolated frontend app in this feature. Do not remove the current static dashboard implementation in this feature; cleanup is spec 009.

## Constitution Check

- **Local-first observability**: Pass. The API reads local run data and binds locally by default.
- **Privacy modes**: Pass if responses reuse dashboard privacy guards and tests prove metadata-only payloads contain no hidden raw content.
- **Provider-agnostic insight**: Pass. The API exposes analyzer outputs and canonical session summaries only.
- **Architecture boundaries**: Pass if the API is under `src/surfaces/dashboard-api/`, consumes `src/core/store`, `src/analysis/pipeline`, and dashboard-safe model code, and does not import adapters or frontend code.
- **Explainability over raw numbers**: Pass. Run, artifact, task, caveat, privacy, and attribution fields remain first-class API data.
- **Documentation separation**: Pass. Endpoint names and schemas live in plan/contracts, not product-only spec prose.
- **Code organization**: Pass if server, routing, response building, error responses, and reusable view-model transformation stay in separate cohesive files.

## Project Structure

### Documentation (this feature)

```text
specs/007-dashboard-api-surface/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-api-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── core/
│   └── store/
│       └── index.ts              # canonical local run reads
├── analysis/
│   ├── pipeline.ts               # analyzer summary source
│   └── types.ts                  # analyzer result contracts
├── surfaces/
│   ├── dashboard-api/
│   │   ├── types.ts              # versioned API response and error types
│   │   ├── responses.ts          # summary/run/detail response builders
│   │   ├── routes.ts             # request routing and URL parsing
│   │   ├── server.ts             # local HTTP server lifecycle
│   │   └── errors.ts             # structured API errors
│   ├── dashboard/
│   │   ├── model.ts              # existing dashboard-safe model may be reused or moved later
│   │   ├── privacy.ts
│   │   └── types.ts
│   └── cli/
│       ├── index.ts              # dashboard API serve command dispatch
│       └── report-commands.ts    # CLI orchestration if command is added here
└── cli.js

test/
├── dashboard-api.test.js
├── dashboard-api-privacy.test.js
├── dashboard-api-freshness.test.js
├── architecture-boundaries.test.js
└── helpers/
    └── dashboard-fixtures.js
```

**Structure Decision**: Add a new surface under `src/surfaces/dashboard-api/`. Keep it separate from `src/surfaces/cli/` and from the future top-level `dashboard/` frontend. The current `src/surfaces/dashboard/` model may be consumed during this transition because it already adapts analyzer summaries into dashboard-safe records; spec 009 will later clean up or move static-rendering leftovers.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not import `src/adapters/*` from dashboard API modules.
- Do not import files from the future top-level `dashboard/` app into `src/`.
- Do not make the React/Vite frontend a prerequisite for this API feature.
- Do not parse provider-specific raw payloads in API modules.
- Do not serialize hidden raw content into successful responses, errors, debug fields, or search text.
- Do not recompute analyzer metrics in route handlers.
- Do not write captured run data from API handlers.
- Do not replace the proxy's port or lifecycle with the dashboard API; the dashboard API should use a separate local port.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-api-contract.md](./contracts/dashboard-api-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Design keeps API local, read-only, and file-backed.
- **Privacy modes**: Pass. Data model and contract include explicit privacy states and no hidden raw content in responses.
- **Provider-agnostic insight**: Pass. Response contract is based on analyzer/dashboard-safe records.
- **Architecture boundaries**: Pass. The frontend consumes HTTP only; the API remains a surface over canonical store and analyzers.
- **Explainability over raw numbers**: Pass. Artifact details, task groups, caveats, attribution notes, and privacy states remain modeled.
- **Documentation separation**: Pass. Technical endpoint and schema details are in planning artifacts.
- **Code organization**: Pass. Planned files split server lifecycle, routing, response mapping, types, and errors.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
