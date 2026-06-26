# Implementation Plan: Legibility And Task Explorer

**Branch**: `004-legibility-task-explorer` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-legibility-task-explorer/spec.md`

## Summary

Add a structured legibility and task-grouping layer to the analyzer pipeline so token-heavy artifacts can be presented as readable commands, patches, tool calls, messages, files, or unknown work units. The feature enriches analyzer results with stable display labels, artifact drilldown data, tool-call links, task groups, privacy-aware preview states, deterministic ordering, and caveats that keep estimated artifact attribution distinct from provider-reported totals.

This feature consumes canonical records and existing analyzer outputs only. It does not add a new capture provider, a new storage backend, or dashboard infrastructure. CLI legibility and explain views are the first surfaces; the dashboard can consume the same analyzer outputs later.

## Technical Context

**Language/Version**: TypeScript and JavaScript on Node.js 18+

**Primary Dependencies**: Existing runtime dependency `tiktoken`; existing development dependencies `tsx`, `typescript`, and `@types/node`. Do not add new runtime dependencies for this feature.

**Storage**: Existing local JSONL event files under `~/.token-profiler/runs/`. This feature derives in-memory analyzer results from canonical records and does not introduce SQLite or persisted legibility indexes.

**Testing**: `npm test` (`node --import tsx --test`) and `npm run typecheck` (`tsc --noEmit`).

**Target Platform**: Local developer machine with Node.js 18+, macOS-first for current Codex workflows and Node-compatible for fixtures.

**Project Type**: Local CLI/proxy library with report generation.

**Performance Goals**: Keep legibility and task grouping practical for local sessions with hundreds of requests and tens of thousands of artifact events. Analyzer output ordering must be deterministic for fixture comparisons.

**Constraints**: Analyzers consume canonical records and analyzer outputs only. Provider-specific payloads remain in adapters. Metadata-only runs must produce useful labels, details, and task groups without raw content. Preview/raw content display must obey storage mode. Provider-reported usage totals remain authoritative; artifact-level cache and burn attribution remains locally estimated and caveated.

**Scale/Scope**: Build reusable analyzer outputs for readable artifacts, tool-call links, artifact details, and task groups. Update CLI legibility/explain surfaces to consume those outputs. Prepare contracts for future dashboard consumption without implementing the full dashboard from spec 005.

## Constitution Check

- **Local-first observability**: Pass. The feature reads local canonical records and emits local reports only.
- **Privacy modes**: Pass. Metadata-only behavior is a baseline requirement; preview/raw details are explicitly gated by storage mode.
- **Provider-agnostic insight**: Pass if implementation consumes canonical records and metadata only, with provider-specific parsing remaining upstream in adapters.
- **Architecture boundaries**: Pass if legibility and task grouping live under `src/analysis/*` and surfaces render analyzer outputs instead of recomputing metrics.
- **Explainability over raw numbers**: Pass. The feature directly improves labels, drilldowns, task phases, persistence context, and caveats.
- **Documentation separation**: Pass. Technical module layout and validation live in plan/design artifacts rather than `spec.md`.
- **Code organization**: Pass if existing legibility formatting is split into analyzer result construction plus surface rendering, keeping each file cohesive.

## Project Structure

### Documentation (this feature)

```text
specs/004-legibility-task-explorer/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── legibility-task-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── analysis/
│   ├── legibility.ts           # readable artifact/detail analyzer output and legacy-compatible formatting during migration
│   ├── task-groups.ts          # task group analyzer output over canonical requests/artifacts
│   ├── pipeline.ts             # analyzer orchestration includes legibility/task results
│   ├── types.ts                # shared result, artifact detail, tool link, and task group types
│   ├── caveats.ts              # shared caveat messages for estimates, privacy, and partial data
│   └── sort.ts                 # deterministic tie-breaking helpers
├── core/
│   └── events/                 # canonical event types and validation
├── surfaces/
│   ├── cli/
│   │   ├── report-commands.ts  # CLI orchestration consumes analyzer results
│   │   └── report-renderer.ts  # text rendering only
│   └── html-report.ts          # future dashboard/report surface consumes analyzer outputs
└── index.js                    # public exports only

test/
├── legibility.test.js
├── task-groups.test.js
├── analyzer-pipeline.test.js
├── privacy.test.js
└── fixtures/
    └── events/
```

**Structure Decision**: Use the existing single-project shape. Analyzer logic belongs under `src/analysis/`; canonical record definitions remain under `src/core/`; CLI and HTML/report surfaces should render analyzer outputs without owning label, detail, task grouping, privacy, or attribution logic. Existing `src/analysis/legibility.ts` may be migrated in place as long as analyzer output construction is separated from text formatting.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not import `src/adapters/*` from legibility or task-group analyzers.
- Do not parse provider-specific raw payloads in analyzer modules.
- Do not add label or grouping logic inside CLI command handlers or HTML rendering.
- Do not require raw content for baseline labels, artifact details, or task groups.
- Do not display preview/raw text unless storage mode allows it.
- Do not label artifact-level cache/uncached attribution as provider-reported.
- Do not make spec 005 dashboard work a prerequisite for this feature.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/legibility-task-contract.md](./contracts/legibility-task-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Design artifacts keep execution local and file-backed.
- **Privacy modes**: Pass. Data model and contract include preview permission states and hidden/unavailable caveats.
- **Provider-agnostic insight**: Pass. Contracts require canonical inputs and disallow provider-payload dependencies.
- **Architecture boundaries**: Pass. Source layout separates analyzers from surfaces and adapters.
- **Explainability over raw numbers**: Pass. Readable artifacts, details, tool links, task groups, grouping confidence, and caveats are first-class outputs.
- **Documentation separation**: Pass. Implementation structure remains in planning artifacts, not the product spec.
- **Code organization**: Pass. Planned files split display labels, task grouping, shared caveats, and rendering responsibilities.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
