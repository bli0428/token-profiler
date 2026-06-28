# Implementation Plan: Request Accounting Contract

**Branch**: `014-request-accounting-contract` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-request-accounting-contract/spec.md`

## Summary

Expose request-level accounting as an analyzer-owned, dashboard API-consumed contract. The feature makes provider-reported request usage visible as the authoritative request total, carries Codex/session identity diagnostics through the session list, and adds request-scoped artifact inclusions with local cache attribution estimates and caveats. Dashboard browser code consumes the contract only; it must not recompute request totals or per-request attribution.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+ for root analyzer/API code; dashboard package remains TypeScript/React but only consumes the API contract in later UI work.

**Primary Dependencies**: Existing root dependencies only (`tsx`, `typescript`, `tiktoken`). No new runtime or dev dependencies for the contract/analyzer layer.

**Storage**: Existing local JSONL canonical event files. No new database, migration, or raw-content storage requirement. Request accounting is derived from canonical `artifact` and `request_usage` events.

**Testing**: Root `npm test` and `npm run typecheck`. Add focused analyzer/API contract tests for request rows, incomplete usage, request-scoped artifact inclusions, privacy behavior, deterministic ordering, and session identity mapping. Dashboard package tests are only needed when spec 015 consumes the new contract visually.

**Target Platform**: Local developer machine with Node.js 18+.

**Project Type**: Root TypeScript analyzer/API contract extension for a local observability tool.

**Performance Goals**: Request accounting generation should be linear in canonical events for a run and fit into the existing dashboard API freshness path. Fixture-scale runs should respond within existing dashboard API validation expectations.

**Constraints**: Preserve `Adapters -> Canonical Store -> Analyzers -> Surfaces`. Provider payload details must stop at adapters. Request totals come from provider usage events when available. Artifact attribution is local and estimated. Privacy modes must not require raw content. Browser surfaces consume the exposed contract and do not recompute request totals, uncached totals, or attribution.

**Scale/Scope**: Add request-first analyzer/view-model output and dashboard API contract fields/endpoints for one captured session/run. Do not redesign capture, replace canonical storage, add new dashboard rendering, or change aggregate artifact views beyond linking to request accounting where needed.

## Constitution Check

- **Local-first observability**: Pass. Request accounting is derived from local JSONL canonical event data and exposed through the local dashboard API.
- **Privacy modes**: Pass if request artifact inclusions expose metadata, token estimates, privacy state, and caveats without requiring raw prompt, file, command, tool output, or message bodies.
- **Provider-agnostic insight**: Pass. Provider-specific usage is normalized into canonical request usage before analyzers consume it; source limitations are disclosed as availability/caveats.
- **Architecture boundaries**: Pass if implementation adds analyzer/API-owned contract types and keeps browser code as a consumer.
- **Explainability over raw numbers**: Pass. Request totals are paired with request-scoped artifact inclusions, attribution availability, and caveats.
- **Documentation separation**: Pass. This plan and its design artifacts contain implementation details; the spec remains user-value focused.
- **Code organization**: Pass if request accounting logic is isolated from dashboard rendering and uses owned contract types at analyzer/API boundaries.

## Project Structure

### Documentation (this feature)

```text
specs/014-request-accounting-contract/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── request-accounting-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── analysis/
│   ├── request-accounting.ts        # new analyzer-owned request accounting projection
│   ├── cache-attribution.ts         # reuse request-local cache attribution facts; keep totals authoritative
│   ├── pipeline.ts                  # include request accounting result in run summary
│   └── types.ts                     # owned analyzer result/entity types
├── core/
│   └── events/
│       └── types.ts                 # canonical event/request summary types if additional owned fields are needed
└── surfaces/
    └── dashboard-api/
        ├── types.ts                 # API-owned request accounting response types
        ├── view-model.ts            # explicit mapping from analyzer result to dashboard API model
        ├── responses.ts             # response envelope remains unchanged
        └── routes.ts                # expose request accounting through run response or request endpoint

test/
├── request-accounting.test.js       # analyzer-level request rows and inclusions
├── dashboard-api-request-accounting.test.js
├── dashboard-api-privacy.test.js    # extend metadata-only/no-raw assertions
└── codex-sessions.test.js           # extend identity mapping coverage if needed
```

**Structure Decision**: Add request accounting below `src/analysis/` as an analyzer-owned projection over canonical events and enriched request summaries. Expose owned API types under `src/surfaces/dashboard-api/`. Keep dashboard browser implementation out of this feature; spec 015 can render the new contract after it exists.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not compute request totals inside `dashboard/src`.
- Do not infer provider totals from artifact estimates when usage is missing.
- Do not expose raw request payloads, prompt bodies, command output bodies, or hidden file content to make attribution easier.
- Do not conflate dashboard route IDs with Codex session IDs; expose identity and confidence as separate fields.
- Do not leak provider-specific payloads or rollout shapes past adapter/canonical boundaries.
- Do not reuse dashboard-internal view types as analyzer contracts.
- Do not change aggregate artifact ranking semantics as part of this feature.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/request-accounting-contract.md](./contracts/request-accounting-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. All validation scenarios use local fixture JSONL and the local dashboard API.
- **Privacy modes**: Pass. Request artifact inclusions carry privacy and availability states and never require raw content.
- **Provider-agnostic insight**: Pass. Request usage facts remain canonical; source/session identity limitations are explicit.
- **Architecture boundaries**: Pass. The contract separates analyzer production from dashboard consumption.
- **Explainability over raw numbers**: Pass. Expensive request rows can be expanded into request-scoped contributing artifacts with caveats.
- **Documentation separation**: Pass. Implementation choices are documented in plan/research/design artifacts.
- **Code organization**: Pass. New code is scoped to analyzer/API model boundaries with tests guarding browser non-recomputation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
