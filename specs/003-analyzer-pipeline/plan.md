# Implementation Plan: Modular Analyzer Pipeline

**Branch**: `003-analyzer-pipeline` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-analyzer-pipeline/spec.md`

## Summary

Split the current aggregate report behavior into explicit analyzer modules that consume canonical records and emit reusable, typed results for CLI reports, future dashboard views, and exports. Preserve the existing exposure, replay, top contributor, prompt-cache attribution, and proportional overlong-coordinate normalization behavior while adding clear availability states and attribution caveats.

This is an analyzer-only feature. It does not add new capture sources, change canonical storage format, or move provider-specific payload logic into analysis.

## Technical Context

**Language/Version**: TypeScript and JavaScript on Node.js 18+

**Primary Dependencies**: Existing runtime dependency `tiktoken`; existing development dependencies `tsx`, `typescript`, and `@types/node`. Do not add a new runtime dependency for this feature.

**Storage**: Existing local JSONL event files under `~/.token-profiler/runs/`. This feature reads canonical records and produces derived in-memory/report results; it does not introduce SQLite or a new persisted analyzer-result store.

**Testing**: `npm test` (`node --import tsx --test`) and `npm run typecheck` (`tsc --noEmit`).

**Target Platform**: Local developer machine with Node.js 18+, macOS-first for current Codex workflows and Node-compatible for analyzer fixtures.

**Project Type**: Local CLI/proxy library with report generation.

**Performance Goals**: Preserve current report practicality for local sessions with hundreds of requests and tens of thousands of artifact events. Analyzer output ordering must be deterministic for fixture comparisons.

**Constraints**: Analyzers consume canonical records only. Provider-specific payloads remain in adapters. Metadata-only runs must produce baseline analyzer results without raw content. Provider-reported usage totals remain authoritative when present; artifact-level attribution remains locally estimated and must be labeled that way.

**Scale/Scope**: Modularize the current aggregate behavior into reusable analyzer results covering exposure, cache/burn attribution, persistence/replay, context clutter, top contributors, and availability/caveats. Legibility/task grouping from spec 004 may later plug into the same pipeline but is not required for this feature.

## Constitution Check

- **Local-first observability**: Pass. The feature reads local canonical records and introduces no hosted service.
- **Privacy modes**: Pass. Baseline analyzers work from metadata and do not require raw content.
- **Provider-agnostic insight**: Pass. Analyzer inputs are canonical records only; provider-specific payloads remain upstream.
- **Architecture boundaries**: Pass if implementation keeps analyzer modules under `src/analysis/*` and report surfaces consume analyzer results rather than recomputing metrics.
- **Explainability over raw numbers**: Pass. Attribution notes, availability states, and clutter-vs-persistence distinctions are explicit planning targets.
- **Documentation separation**: Pass. Product behavior remains in `spec.md`; this plan captures implementation structure and validation.
- **Code organization**: Pass if the existing aggregate behavior is split into cohesive analyzer modules rather than moved into one larger registry file.

## Project Structure

### Documentation (this feature)

```text
specs/003-analyzer-pipeline/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── analyzer-result-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── analysis/
│   ├── pipeline.ts              # analyzer registry/orchestration and combined run analysis
│   ├── types.ts                 # analyzer result, availability, caveat, and aggregate types
│   ├── caveats.ts               # shared analyzer caveats and attribution note text
│   ├── run-data.ts              # canonical event validation/grouping for analyzer inputs
│   ├── exposure.ts              # exposure, unique/repeated, replay ratio, top contributors
│   ├── cache-attribution.ts     # provider usage totals, attribution coverage, coordinate scaling
│   ├── persistence.ts           # first/last seen, span, continuous vs reintroduced replay
│   └── context-clutter.ts       # possible clutter classification over exposure/persistence/burn
├── core/
│   └── events/                  # canonical event validation and event types
├── surfaces/
│   ├── cli/
│   │   ├── report-commands.ts   # CLI orchestration consumes analyzer results
│   │   └── report-renderer.ts   # text report rendering only
│   └── html-report.ts           # HTML report rendering only
└── index.js                     # public exports only

test/
├── analyzer-pipeline.test.js
├── cache-attribution.test.js
├── exposure-analyzer.test.js
├── persistence-analyzer.test.js
└── aggregate.test.js            # legacy parity tests during migration
```

**Structure Decision**: Use the existing single-project shape. New analyzer modules belong under `src/analysis/`; canonical record handling stays under `src/core/`; CLI and HTML surfaces render analyzer outputs but do not own metric derivation. Root-level renderer files are migration leftovers and should be retired once surface-owned renderers exist.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not let analyzer modules import `src/adapters/*` or Codex-specific live/log modules.
- Do not add report-only calculations to `src/report.js`, `src/html-report.js`, or CLI command handlers.
- Do not keep root-level renderer files as long-term compatibility wrappers after surface modules consume analyzer results.
- Do not remove proportional coordinate normalization when splitting cache attribution out of `aggregate.ts`.
- Do not require raw or preview content to compute baseline exposure, attribution availability, or persistence metrics.
- Do not turn spec 004 legibility/task work into a prerequisite for this feature.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/analyzer-result-contract.md](./contracts/analyzer-result-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Design artifacts keep analyzer execution local and file-backed.
- **Privacy modes**: Pass. Metadata-only baseline behavior and raw-content independence are specified in the contract and quickstart.
- **Provider-agnostic insight**: Pass. Contracts require canonical event inputs and no adapter imports.
- **Architecture boundaries**: Pass. Source layout separates analysis modules from surfaces and adapters.
- **Explainability over raw numbers**: Pass. Caveats, attribution basis, and persistence classifications are first-class entities.
- **Documentation separation**: Pass. Technical module layout lives in plan/design artifacts, not the product spec.
- **Code organization**: Pass. The plan splits current aggregate responsibilities into focused modules.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
