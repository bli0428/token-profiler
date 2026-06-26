# Implementation Plan: Source Adapters And Capture Boundaries

**Branch**: `002-source-adapters-capture` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-source-adapters-capture/spec.md`

## Summary

Finish the capture-side module-boundary migration by moving existing Codex live capture, Codex config support, session routing, log import, and canonical event writing out of legacy top-level JavaScript modules and into the architecture domains defined by specs 001 and 006. This feature does not build Claude Code functionality; it proves the future-source seam with a fixture-only non-Codex adapter stub so later adapters can be added without touching Codex-specific code or analyzers.

## Technical Context

**Language/Version**: TypeScript and JavaScript on Node.js 18+

**Primary Dependencies**: Existing runtime dependencies: `tiktoken`; existing development dependencies: `tsx`, `typescript`, `@types/node`. Do not add a new runtime dependency for this feature.

**Storage**: Existing local JSONL event files under `~/.token-profiler/runs/`. No SQLite migration in this feature.

**Testing**: `npm test` (`node --import tsx --test`) and `npm run typecheck` (`tsc --noEmit`).

**Target Platform**: Local developer machine, macOS-first for Codex app/config workflows and Node-compatible for core capture/import tests.

**Project Type**: Local CLI/proxy library with report generation.

**Performance Goals**: Preserve live proxy streaming behavior without capture-visible mutation, truncation, or ordering changes. Keep request-body observation bounded by the existing body-size guard.

**Constraints**: Metadata-only remains the default privacy mode. Provider-specific payloads terminate in ingestors. Analyzers consume canonical records only. Existing public CLI behavior should remain stable. Top-level legacy capture implementation files must be moved, split, removed, or reduced to thin compatibility re-exports.

**Scale/Scope**: Existing local sessions with hundreds of requests and tens of thousands of artifact events should remain practical. Fixture coverage must include live Codex capture, Codex log import, mixed-quality import entries, and a fixture-only non-Codex adapter stub.

## Constitution Check

- **Local-first observability**: Pass. Capture/import and storage remain local; no hosted dependency introduced.
- **Privacy modes**: Pass. Source adapters must honor metadata, preview, and raw modes from the canonical core.
- **Provider-agnostic insight**: Pass. This feature strengthens the source boundary and prevents analyzer imports of provider-specific modules.
- **Architecture boundaries**: Pass if implementation lands source behavior under `src/ingest/*`, canonical writing under `src/core/*`, and CLI orchestration under `src/surfaces/cli/*`.
- **Explainability over raw numbers**: Pass. Source limitation records and tool metadata remain visible to reports.
- **Documentation separation**: Pass. This plan contains technical migration choices; `spec.md` remains product-facing.
- **Code organization**: Pass if mixed legacy files are split by responsibility instead of moved wholesale into new large files.

## Project Structure

### Documentation

```text
specs/002-source-adapters-capture/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── source-adapter-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
src/
├── core/
│   ├── capture/              # canonical capture writer replacing top-level profiler implementation
│   ├── events/
│   ├── privacy/
│   ├── store/
│   └── tokenization/         # token counting/hash helpers that are not provider-specific
├── ingest/
│   ├── codex-proxy/          # live Codex proxy, config support, session routing, request/usage recording
│   ├── codex-log-import/     # Codex rollout/log import and Codex session metadata reading
│   └── fixture-source/       # fixture-only non-Codex seam validation, not user-facing Claude functionality
├── analysis/
└── surfaces/
    └── cli/                  # command parsing and orchestration only
```

**Compatibility policy**: `src/profiler.js`, `src/session-router.js`, `src/codex-config.js`, and `src/codex-sessions.js` should not remain as implementation files. If retained temporarily, they must be thin re-exports to domain-owned modules and covered by an architecture-boundary test.

## Architectural Pass

The implementation should avoid these short-term fixes:

- Do not create a generic `adapters.js` catch-all. Source seams belong in explicit `src/ingest/<source>/` folders.
- Do not move `TokenProfiler` wholesale into an ingestor. Canonical event writing is source-agnostic and belongs in `src/core/capture/`.
- Do not let the CLI own import parsing. CLI commands should delegate to ingestor functions.
- Do not encode future Claude Code behavior. Use a fixture-only non-Codex source to test the seam and limitation model.
- Do not let source-specific metadata become analyzer requirements. Analyzers may display generic limitation metadata, but should continue to operate on canonical events.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/source-adapter-contract.md](./contracts/source-adapter-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Local-first observability**: Pass. All design artifacts retain local capture/import and JSONL storage.
- **Privacy modes**: Pass. The adapter contract requires adapters to pass all artifacts through canonical privacy handling.
- **Provider-agnostic insight**: Pass. Future-source acceptance is based on canonical events and limitation records, not provider payloads.
- **Architecture boundaries**: Pass. Legacy file retirement is a named success criterion and task target.
- **Explainability over raw numbers**: Pass. Source limitations are explicit design entities.
- **Code organization**: Pass. The plan splits mixed legacy modules by responsibility.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Temporary compatibility re-exports | Existing tests and public imports may still reference top-level modules during migration | Removing all top-level imports at once would make this feature harder to review and could break package consumers unnecessarily |
