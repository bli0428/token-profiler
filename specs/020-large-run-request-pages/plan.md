# Implementation Plan: Large Run Request Pages

**Branch**: `main` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-large-run-request-pages/spec.md`

## Summary

Expose a local, read-only, cursor-paginated request list for a large captured run. Reuse the streaming canonical-store reader and analyzer-owned compact request projection established by feature 019; the dashboard API owns cursor validation and explicit transport mapping. A page contains only canonical request usage, turn identity, timestamps, and aggregate artifact counts—never provider payloads or artifact history.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+.

**Primary Dependencies**: Node stream support and existing TypeScript/Zod dashboard API stack; no new runtime dependency.

**Storage**: Existing local JSONL event file; optional local compact summary cache keyed by source file metadata. No migration or second database.

**Testing**: Node test runner with `tsx`; root TypeScript check. Dashboard contract/client tests only if the client route/type changes.

**Target Platform**: Local dashboard API and local browser dashboard.

**Project Type**: Local observability CLI/proxy with a dashboard web application.

**Performance Goals**: Return no more than the requested page size (maximum 500); opening or paging must not allocate complete artifact history or read a run JSONL file as one string.

**Constraints**: Preserve Adapters -> Canonical Store -> Analyzers -> Surfaces. Cursors are API-owned, opaque, run-bound, and invalidated when their source changes. Provider payloads must not cross the adapter boundary.

**Scale/Scope**: 1 GB+ / million-event captures; request-level rows only. Artifact pages, artifact detail, and browser-side aggregation are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-first observability**: Pass. The route reads only local capture data and writes, at most, a local derived cache.
- **Privacy modes are product behavior**: Pass. Rows contain canonical non-content request facts; they neither expose artifact content nor bypass privacy mapping.
- **Provider-agnostic insight**: Pass. The analyzer reads canonical usage and turn identity only; source payloads remain in adapters.
- **Architecture boundaries**: Pass. Store streams canonical records, analyzer derives request facts, API maps/paginates them, and the dashboard consumes the declared response.
- **Explainability over raw numbers**: Pass. Rows connect provider usage, request identity, turn identity, and artifact inclusion counts.
- **Documentation separation**: Pass. Implementation and transport decisions are recorded here and in the design artifacts, not in the feature spec.
- **Code organization**: Pass. The request-page concern remains a focused analyzer projection plus API route/response ownership.

## Project Structure

### Documentation (this feature)

```text
specs/020-large-run-request-pages/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── large-run-request-pages-api.md
```

### Source Code (repository root)

```text
src/
├── core/store/index.ts                    # Incremental canonical JSONL reader (feature 019 prerequisite)
├── analysis/
│   ├── large-run.ts                       # Compact per-request projection and slicing
│   └── index.ts                           # Public analyzer exports
└── surfaces/dashboard-api/
    ├── large-runs.ts                      # Summary cache, cursor encoding/validation, response mapping
    ├── routes.ts                          # GET /api/runs/{run_id}/large/requests
    ├── types.ts                           # HTTP response types
    └── contract.md                        # Surface public contract

dashboard/src/api/
├── client.ts                              # Typed request-page client method
└── types.ts                               # Mirrored transport types

test/
└── large-run-dashboard-api.test.js        # Page boundaries, ordering, invalid cursors, canonical-only fields
```

**Structure Decision**: Feature 019 supplies the bounded streaming/projection primitive. This feature adds only the API-owned request-page transport seam and the dashboard client contract needed to consume it; it does not introduce a request-artifact or content-detail seam.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/large-run-request-pages-api.md](./contracts/large-run-request-pages-api.md), and [quickstart.md](./quickstart.md).

## Workstream Boundaries

1. **Canonical store (prerequisite)**: Stream complete canonical JSONL lines and report malformed complete records precisely. It must not know pagination or HTTP.
2. **Analyzer**: Retain one compact row per request while scanning; order deterministically newest-first; slice already-derived rows by offset. It must not encode cursors or return HTTP shapes.
3. **Dashboard API**: Validate limits and opaque cursors, bind cursors to a run/source version, map analyzer rows explicitly, and translate unreadable runs to documented errors.
4. **Dashboard client/surface**: Request a first or subsequent API page and render only returned fields. It must not parse raw JSONL, decode cursors, or infer provider facts.

## Post-Design Constitution Check

- **Local-first observability**: Pass. Validation uses local temporary JSONL fixtures and local API handlers.
- **Privacy modes are product behavior**: Pass. The contract excludes artifact and payload content, so all page fields are canonical metadata/usage facts.
- **Provider-agnostic insight**: Pass. The row schema names canonical concepts rather than provider payload fields.
- **Architecture boundaries**: Pass. Cursor and response mapping remain in the surface; request aggregation remains in analysis.
- **Explainability over raw numbers**: Pass. A row exposes its request and turn context alongside usage and artifact count.
- **Code organization**: Pass. Artifact paging is not folded into this module and stays for feature 021.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
