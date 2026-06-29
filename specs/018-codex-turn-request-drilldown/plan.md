# Implementation Plan: Codex Turn Request Drilldown

**Branch**: `018-codex-turn-request-drilldown` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-codex-turn-request-drilldown/spec.md`, with required planning inputs from [`sub-specs/`](./sub-specs/) and [`contracts/`](./contracts/).

## Summary

Introduce a first-class canonical turn identity for new Codex captures, then expose run detail as a three-level hierarchy: turns, requests, and artifacts. The plan is intentionally split by module boundary: Codex capture maps source turn metadata into canonical facts; analyzers derive turn hierarchy and privacy-aware titles from canonical records; the dashboard API owns the response contract; the frontend renders the API-provided hierarchy without parsing provider payloads.

## Technical Context

**Language/Version**: TypeScript/Node.js 18+ for capture, core, analysis, and dashboard API; React 19 with Vite/Vitest in `dashboard/`.

**Primary Dependencies**: Existing project dependencies only: TypeScript, Node test runner, `tsx`, React, Vite, Vitest, Testing Library, existing JSONL store and privacy helpers.

**Storage**: Local JSONL event store under run directories. This feature adds an explicit canonical request-level turn fact/event for new captures; no historical migration, compatibility shim, or backfill.

**Testing**: Root `npm run typecheck`; root `node --import tsx --test` suites for adapter/canonical/analyzer/API behavior; dashboard `npm run typecheck`; targeted dashboard Vitest for turn/request/artifact rendering.

**Target Platform**: Local-first Codex live proxy, local dashboard API, and browser dashboard.

**Project Type**: Local observability CLI/proxy plus dashboard web app.

**Performance Goals**: Turn grouping and title selection run in the existing analysis pass without extra dashboard round trips. Run detail remains responsive at current fixture scale.

**Constraints**: Preserve `Adapters -> Canonical Store -> Analyzers -> Surfaces`. Provider-specific Codex metadata terminates at the adapter. Analyzers consume canonical records only. Dashboard renders API-owned fields and must not infer turns from payloads, artifact IDs, cache keys, or headers.

**Scale/Scope**: New live Codex captures after proxy restart. Existing JSONL without first-class turn identity is not a target for migration or emulation; fallback states apply to new analyzed requests that genuinely lack turn identity.

## Required Planning Inputs

Planning and tasks must preserve these domain boundaries:

- [Capture and canonical turn identity](./sub-specs/01-capture-canonical-turn-id.md)
- [Analyzer turn hierarchy](./sub-specs/02-analyzer-turn-hierarchy.md)
- [Dashboard API turn drilldown contract](./sub-specs/03-dashboard-api-contract.md)
- [Dashboard surface](./sub-specs/04-dashboard-surface.md)
- [Canonical turn facts contract](./contracts/canonical-turn-facts.md)
- [Turn drilldown dashboard contract](./contracts/turn-drilldown-dashboard.md)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-first observability**: Pass. Capture, storage, analysis, API, and dashboard remain local.
- **Privacy modes are product behavior**: Pass. Turn identity is non-content metadata; user/assistant titles use previews only when capture policy permits.
- **Provider-agnostic insight**: Pass if Codex-specific turn metadata is mapped to canonical fields at the adapter and downstream contracts avoid Codex payload shapes.
- **Architecture boundaries**: Pass if work remains split across capture/canonical, analyzer, dashboard API, and frontend. Dashboard must not parse provider metadata.
- **Explainability over raw numbers**: Pass. The hierarchy explains what user turn and assistant request phase caused artifacts to appear.
- **Documentation separation**: Pass. The main spec stays behavior-focused; this plan and sub-specs hold implementation structure.
- **Code organization**: Pass if new helpers stay owned by their layers and no mixed "capture and render" module emerges.

## Project Structure

### Documentation (this feature)

```text
specs/018-codex-turn-request-drilldown/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── README.md
├── contracts/
│   ├── canonical-turn-facts.md
│   └── turn-drilldown-dashboard.md
├── sub-specs/
│   ├── 01-capture-canonical-turn-id.md
│   ├── 02-analyzer-turn-hierarchy.md
│   ├── 03-dashboard-api-contract.md
│   └── 04-dashboard-surface.md
└── tasks/
    ├── 01-capture-canonical-turn-id.tasks.md
    ├── 02-analyzer-turn-hierarchy.tasks.md
    ├── 03-dashboard-api-contract.tasks.md
    └── 04-dashboard-surface.tasks.md
```

### Source Code (repository root)

```text
src/
├── adapters/codex/live-proxy/
│   ├── codex-envelope.ts
│   ├── recording.ts
│   └── session-router.ts
├── core/events/
│   ├── index.ts
│   └── types.ts
├── analysis/
│   ├── index.ts
│   ├── legibility.ts
│   ├── request-accounting.ts
│   ├── task-groups.ts
│   └── types.ts
└── surfaces/dashboard-api/
    ├── view-model.ts
    ├── view-model-types.ts
    └── responses.ts

dashboard/src/
├── api/
│   └── types.ts
├── run-explorer/
│   ├── RequestList.tsx
│   ├── RequestRow.tsx
│   └── RunExplorer.tsx
├── styles/
│   └── run-explorer.css
└── test/
    └── turn-drilldown-dashboard.test.tsx

test/
├── session-router.test.js
├── dashboard-model.test.js
├── dashboard-api-request-accounting.test.js
└── fixtures/events/
```

**Structure Decision**: Implement as four coordinated workstreams matching the sub-specs. Capture/canonical code owns extraction and persistence of turn facts. Analysis owns hierarchy and titles. Dashboard API owns transport/view-model shape. React owns rendering only.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/canonical-turn-facts.md](./contracts/canonical-turn-facts.md), [contracts/turn-drilldown-dashboard.md](./contracts/turn-drilldown-dashboard.md), and [quickstart.md](./quickstart.md).

## Workstream Boundaries

### 1. Capture And Canonical

- Extract source turn identity from the already parsed Codex turn metadata.
- Map source fields into canonical request-level turn facts.
- Persist turn fields as explicit request-level canonical facts/events for new captures.
- Keep source-specific field names and raw metadata inside the Codex adapter.

### 2. Analyzer

- Build a turn hierarchy from canonical turn facts and existing request/artifact data.
- Choose turn titles from privacy-permitted user previews.
- Choose request titles from privacy-permitted assistant previews, then action labels, then explicit fallbacks.
- Reuse request accounting and artifact detail ownership by reference when deriving turn groups, without requiring the dashboard API to preserve a separate request-first contract for compatibility.

### 3. Dashboard API

- Extend the run detail view model with a `turns` collection.
- Map the request metrics needed by turn children explicitly, and avoid keeping competing request-first response structures solely for compatibility.
- Include grouping source, title source, confidence, privacy, caveats, and artifact references.

### 4. Dashboard Frontend

- Render turns as the top run-detail layer.
- Render request children using API-provided titles.
- Reuse artifact expansion/detail rendering under request rows.
- Display fallback/missing-turn states without browser-side inference.

## Post-Design Constitution Check

- **Local-first observability**: Pass. All validation scenarios use local fixtures, local capture, and local dashboard API.
- **Privacy modes are product behavior**: Pass. The design separates non-content turn identity from privacy-controlled previews.
- **Provider-agnostic insight**: Pass. Codex-specific turn metadata is mapped once into canonical fields.
- **Architecture boundaries**: Pass. Each sub-spec maps to one layer boundary; dashboard receives a view model and does not reconstruct provider facts.
- **Explainability over raw numbers**: Pass. User turns and assistant request titles become the primary explanatory structure.
- **Documentation separation**: Pass. Main spec states behavior; plan/contracts/sub-specs state implementation boundaries.
- **Code organization**: Pass. No new cross-layer module is planned.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
