# Implementation Plan: Request-First Dashboard

**Branch**: `015-request-first-dashboard` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-request-first-dashboard/spec.md`

## Summary

Make the local dashboard default to the workflow users actually follow when investigating token spend: session list, chronological provider requests, then request-scoped artifact contributors. The implementation consumes the request accounting dashboard API contract from spec 014, adds dashboard-owned types and fixture coverage, replaces the artifact-first center pane with request-first rendering, and preserves artifact detail as a secondary drilldown without recomputing analyzer logic in browser code.

## Technical Context

**Language/Version**: TypeScript with React 19 in `dashboard/`; root TypeScript/Node.js 18+ only as needed for fixture/API contract validation.

**Primary Dependencies**: Existing dashboard dependencies (`react`, `react-dom`, `vite`, `vitest`, Testing Library). No new runtime dependency expected; use existing CSS and component patterns.

**Storage**: Browser consumes dashboard API JSON and generated fixtures. No new local persistence, database, or raw content storage.

**Testing**: `npm run typecheck`, root `npm test` for API contract regressions if fixtures change, and dashboard `npm run typecheck`, `npm test`, `npm run test:contracts`, `npm run test:styles`, plus targeted React tests for request-first rendering and keyboard expansion.

**Target Platform**: Local dashboard in modern desktop browsers, with responsive behavior for narrow browser widths.

**Project Type**: Frontend dashboard surface over an existing local analyzer/API contract.

**Performance Goals**: Fixture-scale runs should render request rows and expansion toggles without noticeable delay. Expanding a request with many artifacts should update only the relevant request section and keep layout stable.

**Constraints**: Preserve `Adapters -> Canonical Store -> Analyzers -> Surfaces`. Browser code must render the spec 014 contract and must not recompute provider usage, request chronology, cache attribution, or session identity confidence. Privacy display rules must continue to hide raw prompt, file, command, tool output, patch, and message bodies unless an existing explicit detail contract allows safe display.

**Scale/Scope**: Update the dashboard session list and selected-run center pane for one selected run/session. Include unsupported/partial states for older API payloads. Do not add new capture paths, analyzer algorithms, storage migrations, API endpoints beyond fixture/type consumption, or aggregate artifact-ranking changes outside secondary drilldown behavior.

## Constitution Check

- **Local-first observability**: Pass. The dashboard remains a local surface over local API/fixture data.
- **Privacy modes**: Pass if request expansions use dashboard privacy display policy and never introduce raw hidden content.
- **Provider-agnostic insight**: Pass. Provider limitations are rendered from contract availability/caveats rather than source-specific payloads.
- **Architecture boundaries**: Pass if browser code consumes API-owned request accounting fields and does not derive analyzer facts.
- **Explainability over raw numbers**: Pass. Request rows show provider totals, while expansion explains likely artifact contributors with caveats.
- **Documentation separation**: Pass. This plan contains implementation details; the spec remains user-value focused.
- **Code organization**: Pass if request-first components and view state are kept surface-owned and cohesive, without growing `RunExplorer` into unrelated responsibilities.

## Project Structure

### Documentation (this feature)

```text
specs/015-request-first-dashboard/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── request-first-dashboard.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
dashboard/
├── scripts/
│   └── capture-api-fixtures.ts          # refresh request-accounting fixture snapshots if API payload changes
└── src/
    ├── api/
    │   ├── types.ts                     # add dashboard-owned request accounting response/view input types
    │   └── client.ts                    # preserve additive compatibility with older payloads
    ├── components/
    │   └── CaveatList.tsx               # reuse for request and inclusion caveats
    ├── policy/
    │   └── privacy-display.ts           # reuse privacy display mapping for nested artifacts
    ├── run-explorer/
    │   ├── RunExplorer.tsx              # make request-first center pane the default composition
    │   ├── RequestList.tsx              # new chronological request list
    │   ├── RequestRow.tsx               # new request metrics and expansion control
    │   ├── RequestArtifacts.tsx         # new request-scoped artifact inclusions
    │   └── ArtifactDetailPanel.tsx      # preserve secondary detail drilldown
    ├── sessions/
    │   └── SessionList.tsx              # render token totals and identity availability from contract
    ├── state/
    │   └── view-state.ts                # add expanded request / selected artifact state helpers if needed
    ├── styles/
    │   ├── run-explorer.css             # request list layout and expansion styles
    │   ├── sessions.css                 # session token and identity display
    │   └── tables.css                   # keep shared tabular styling consistent
    └── test/
        ├── api-client.test.ts
        ├── contract-fixtures.test.ts
        ├── privacy-rendering.test.tsx
        ├── run-explorer.test.tsx
        ├── request-first-dashboard.test.tsx
        └── style-boundary.test.ts

test/
├── dashboard-api-request-accounting.test.js
└── dashboard-api-privacy.test.js
```

**Structure Decision**: Implement this as a dashboard surface change. Request accounting facts stay in root analyzer/API code from spec 014. The dashboard owns only API consumption types, rendering components, surface state, styles, and fixture-oriented tests.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not compute cached, uncached, total, chronology, attribution, identity confidence, or caveat facts in `dashboard/src`.
- Do not replace unavailable metrics with `0`.
- Do not make aggregate artifact tables the default selected-run center pane.
- Do not expose hidden raw content through request expansion rows.
- Do not use route run IDs and Codex session IDs interchangeably; render both only as the contract supplies them.
- Do not couple request-first components to root analyzer internals or provider payload shapes.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/request-first-dashboard.md](./contracts/request-first-dashboard.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Validation uses local fixtures and local dashboard commands.
- **Privacy modes**: Pass. The design reuses privacy display state and tests metadata-only rendering.
- **Provider-agnostic insight**: Pass. Request rows render normalized API fields and caveats only.
- **Architecture boundaries**: Pass. Browser code remains a surface and consumes contract fields without recomputation.
- **Explainability over raw numbers**: Pass. Request expansion presents artifact contributors and attribution limitations.
- **Documentation separation**: Pass. Spec remains implementation-agnostic; implementation details are in planning artifacts.
- **Code organization**: Pass. New components separate request list, row, nested artifacts, and existing detail panel responsibilities.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
