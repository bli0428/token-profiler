# Implementation Plan: Codex Session Routing

**Branch**: `016-codex-session-routing` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-codex-session-routing/spec.md`

## Summary

Route new live Codex proxy traffic by Codex-provided session identity before any provider cache or prompt-derived fallback. The implementation stays inside the Codex live-proxy adapter and canonical capture boundary: parse the observed Codex request shape, normalize safe identity facts, choose a deterministic session grouping decision, and persist only canonical events plus privacy-safe routing metadata. Historical `codex-cache-*` or fallback-routed runs are explicitly out of scope.

## Technical Context

**Language/Version**: TypeScript on Node.js 18+.

**Primary Dependencies**: Existing root runtime plus `zod` for adapter-boundary request validation.

**Storage**: Existing local JSONL event store under per-run directories. No migration, backfill, database change, or historical rewrite.

**Testing**: `npm run typecheck`, focused Node test runner coverage for session routing, and root `npm test` for proxy/canonical-store regressions.

**Target Platform**: Local Codex live proxy on loopback with local filesystem storage.

**Project Type**: Local-first CLI/proxy capture adapter feeding canonical store and analyzers.

**Performance Goals**: Request routing should add negligible overhead relative to JSON body parsing and artifact extraction. Session lookup must remain O(1) per request after parsing.

**Constraints**: Preserve `Adapters -> Canonical Store -> Analyzers -> Surfaces`. Provider-specific request payloads stop in the Codex adapter. Metadata-only mode must not store raw `instructions`, `input`, `tools`, message bodies, command output, or prompt content merely to group sessions.

**Scale/Scope**: New live Codex traffic after proxy restart. Covers multiple concurrent Codex sessions in one proxy process. Excludes dashboard rendering, historical run migration, and import/backfill behavior.

## Constitution Check

- **Local-first observability**: Pass. Routing happens inside the local live proxy and writes to local stores only.
- **Privacy modes**: Pass if grouping uses identity metadata and safe routing source fields only, without requiring raw request content retention.
- **Provider-agnostic insight**: Pass if Codex-specific request shape remains adapter-owned and downstream records receive only canonical events plus explicit safe metadata.
- **Architecture boundaries**: Pass if analyzers and dashboard code do not parse Codex request payloads and consume only canonical/session summaries.
- **Explainability over raw numbers**: Pass. The grouping decision records its source so users can understand why traffic grouped together.
- **Documentation separation**: Pass. This plan contains implementation details; the spec stays user-value focused.
- **Code organization**: Pass if request-shape parsing, normalization, and routing decision logic remain separate adapter responsibilities.

## Project Structure

### Documentation (this feature)

```text
specs/016-codex-session-routing/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── session-routing.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── adapters/
│   └── codex/
│       └── live-proxy/
│           ├── codex-envelope.ts       # observed Codex request schema, normalization, route mapping
│           ├── session-router.ts       # route precedence and profiler session selection
│           ├── recording.ts            # canonical artifact/usage persistence with safe route metadata
│           └── server.ts               # live proxy ingestion path
├── core/
│   ├── capture/
│   ├── events/
│   ├── privacy/
│   └── store/
└── analysis/                           # consumes canonical records only; no Codex payload parsing

test/
├── session-router.test.js              # routing precedence, schema validation, fallback behavior
├── proxy.test.js                       # live proxy capture behavior
└── architecture-boundaries.test.js     # provider-specific boundary guardrails
```

**Structure Decision**: Implement as an adapter/capture change. The Codex live proxy owns observed request parsing and routing decisions. Canonical store continues to own persisted events, while analyzers and surfaces remain consumers of canonical records and safe session metadata.

## Architectural Pass

Implementation should avoid these shortcuts:

- Do not add historical migration or rewrite existing `codex-cache-*` runs.
- Do not let provider-specific request bodies cross into analyzers, dashboard API, or browser code.
- Do not compute dashboard grouping in browser code for this feature.
- Do not store raw request content just to decide session grouping.
- Do not allow provider cache keys to merge two distinct Codex sessions when Codex session identity exists.
- Do not collapse `client_metadata`, direct headers, and request body hints before diagnostics can show what was observed.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/session-routing.md](./contracts/session-routing.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. Quickstart validation uses local tests and local proxy fixtures.
- **Privacy modes**: Pass. Data model uses identity and route-source metadata, not raw payload retention.
- **Provider-agnostic insight**: Pass. Codex-specific schemas remain in adapter modules and are mapped to canonical/safe records.
- **Architecture boundaries**: Pass. Contract defines adapter output, not analyzer/browser parsing of provider payloads.
- **Explainability over raw numbers**: Pass. Grouping decisions include source/confidence/fallback information.
- **Documentation separation**: Pass. Design artifacts describe contracts and validation; implementation tasks remain for task generation.
- **Code organization**: Pass. Parsing, normalization, route choice, recording, and transport remain separately owned modules.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
