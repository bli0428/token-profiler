# Implementation Plan: Local Metrics Dashboard

**Branch**: `005-local-dashboard` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-local-dashboard/spec.md`

## Summary

Extend the existing local HTML report into an interactive local dashboard for captured runs. The dashboard will render a typed dashboard view model built from canonical events and existing analyzer outputs: run overview metrics, readable artifact rows, artifact details, task groups, privacy states, filters, caveats, and recent-session summaries. The first delivery remains local, read-only, and file-backed, with a static dashboard/report path first and a small local session index for recent-run selection.

This feature is surface work over canonical records and analyzer results. It must not introduce provider-specific parsing in the dashboard, recompute analysis in browser code, or bypass privacy states attached to analyzer outputs.

## Technical Context

**Language/Version**: TypeScript and JavaScript on Node.js 18+

**Primary Dependencies**: Existing runtime dependency `tiktoken`; existing development dependencies `tsx`, `typescript`, and `@types/node`. Do not add runtime dependencies for the first dashboard slice. If browser-level testing needs an added dev dependency, document and isolate it before implementation.

**Storage**: Existing local JSONL event files under `~/.token-profiler/runs/`. Dashboard session indexing reads local run directories and event metadata; dashboard views are generated from canonical events plus analyzer outputs. No SQLite or remote storage is introduced.

**Testing**: `npm test` (`node --import tsx --test`) and `npm run typecheck` (`tsc --noEmit`). Add focused node tests for dashboard view-model generation, HTML rendering, privacy filtering, session indexing, and static asset behavior.

**Target Platform**: Local developer machine with Node.js 18+, macOS-first for current Codex workflows and Node-compatible for fixture tests. Browser target is a modern local desktop browser.

**Project Type**: Local CLI/proxy library with report generation and local dashboard surfaces.

**Performance Goals**: Dashboard data generation should remain practical for fixture runs with at least 100 requests and 1,000 artifact rows. Artifact detail and filter updates should complete within one second on typical local developer hardware. Output ordering must be deterministic for fixture comparisons.

**Constraints**: Surfaces consume analyzer outputs and canonical records only. Provider-specific payloads remain in adapters. Dashboard code must not recompute exposure, cache attribution, legibility, task grouping, or privacy permissions. Raw content is hidden by default. Estimated artifact-level attribution remains visibly caveated. All dashboard workflows are local and read-only.

**Scale/Scope**: Build a reusable dashboard view model, static interactive dashboard renderer, recent-session index, CLI generation path, and tests. Do not implement remote sharing, authentication, multi-user collaboration, persistent dashboard preferences, or a separate web service unless later tasks explicitly choose that after the static path proves insufficient.

## Constitution Check

- **Local-first observability**: Pass. The dashboard reads local run data and writes local HTML/assets only.
- **Privacy modes**: Pass if all preview/raw display decisions are driven by analyzer privacy state and raw content remains hidden by default.
- **Provider-agnostic insight**: Pass if dashboard model generation consumes canonical events and analyzer results only, with provider-specific labels already normalized upstream.
- **Architecture boundaries**: Pass if dashboard modules live under `src/surfaces/dashboard/` or `src/surfaces/html-report.ts` and do not import adapter-specific modules except an optional session metadata enrichment path already owned by CLI session listing.
- **Explainability over raw numbers**: Pass. Artifact details, task groups, caveats, privacy state, and attribution notes are first-class dashboard elements.
- **Documentation separation**: Pass. Product behavior remains in `spec.md`; implementation layout and validation live in plan/design artifacts.
- **Code organization**: Pass if view-model construction, session indexing, HTML rendering, browser asset script, and CLI orchestration stay separate and cohesive.

## Project Structure

### Documentation (this feature)

```text
specs/005-local-dashboard/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-view-model-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── analysis/
│   ├── pipeline.ts             # source of analyzer summary consumed by dashboard
│   └── types.ts                # existing analyzer result contracts used by dashboard types
├── core/
│   └── store/
│       └── index.ts            # local JSONL run reads for session/run loading
├── surfaces/
│   ├── dashboard/
│   │   ├── types.ts            # dashboard view-model, filter, session, and privacy types
│   │   ├── model.ts            # analyzer summary -> dashboard view model
│   │   ├── sessions.ts         # recent local run index and session summaries
│   │   ├── render.ts           # static HTML document rendering
│   │   ├── assets.ts           # embedded CSS/client JS for filtering/details
│   │   └── privacy.ts          # surface-level privacy guards for displayed fields
│   ├── cli/
│   │   ├── report-commands.ts  # dashboard/html CLI orchestration
│   │   └── utils.ts            # canonical event loading helpers
│   └── html-report.ts          # compatibility wrapper for static report generation
└── cli.js

test/
├── dashboard-model.test.js
├── dashboard-render.test.js
├── dashboard-privacy.test.js
├── dashboard-sessions.test.js
├── architecture-boundaries.test.js
└── fixtures/
    └── events/
```

**Structure Decision**: Use the existing single-project shape. Dashboard-specific surface code belongs under `src/surfaces/dashboard/`; analyzer modules remain the source of metrics, readable labels, task groups, and caveats; canonical store utilities remain the source of local JSONL reads. Keep `src/surfaces/html-report.ts` as the public static report entry point or compatibility wrapper so existing `html` command behavior can evolve without duplicating rendering logic.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not import `src/adapters/*` from dashboard model/rendering modules, except existing CLI-level Codex session label enrichment if deliberately kept outside reusable dashboard model code.
- Do not parse provider-specific payloads in dashboard modules.
- Do not recompute exposure, replay, cache attribution, readable labels, task boundaries, or privacy permissions in browser JavaScript.
- Do not include hidden raw content in embedded JSON, search indexes, HTML attributes, or client-side state.
- Do not show raw content by default even when analyzer detail says raw content is available.
- Do not suppress artifact-attribution caveats when showing artifact-level cached or uncached estimates.
- Do not add a persistent web server before static generation and local file workflows are validated.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/dashboard-view-model-contract.md](./contracts/dashboard-view-model-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Design artifacts keep run loading, session indexing, and dashboard rendering local.
- **Privacy modes**: Pass. Data model and contract include explicit display visibility and prevent hidden content from entering searchable client payloads.
- **Provider-agnostic insight**: Pass. Contracts depend on canonical/analyzer outputs, not provider payloads.
- **Architecture boundaries**: Pass. Planned modules separate store reads, analyzer execution, view-model construction, rendering, and CLI orchestration.
- **Explainability over raw numbers**: Pass. Overview metrics, artifact rows, details, task groups, caveats, and attribution notes are modeled as user-facing records.
- **Documentation separation**: Pass. Technical module layout is contained in this plan and design artifacts.
- **Code organization**: Pass. Planned files split distinct surface responsibilities and keep browser behavior limited to presentation state.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
