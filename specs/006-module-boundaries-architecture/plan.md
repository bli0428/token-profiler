# Implementation Plan: Module Boundaries And Architecture Migration

**Branch**: `006-module-boundaries-architecture` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-module-boundaries-architecture/spec.md`

## Summary

Document the Hybrid Local Observability Core as the project's architecture
north star and migrate the source tree toward explicit ownership boundaries:
core, ingest, analysis, and surfaces. This is an incremental refactor plan, not a
rewrite.

This is the next architecture step after `001`. Do it before building out the
remaining adapter, analyzer, legibility, or dashboard specs.

## Technical Context

**Language/Version**: TypeScript for new architecture modules on Node.js 18+,
with thin JavaScript compatibility wrappers where needed.

**Primary Dependencies**: Existing runtime dependencies plus TypeScript, tsx, and
Node type definitions for typechecking and no-build execution.

**Storage**: Keep JSONL for current runtime behavior. Do not migrate to SQLite in
this spec unless a later task explicitly scopes that work.

**Testing**: `node --import tsx --test`

**Target Platform**: Local developer machine.

**Project Type**: Local CLI/proxy library with report generation.

**Constraints**: Public CLI commands should remain stable. Legacy import remains
separate from the new canonical event contract.

## Architecture Target

```text
src/
  core/
    events/
    privacy/
    store/
  ingest/
    codex-proxy/
    codex-log-import/
    claude-telemetry-import/
    openai-proxy/
    manual-jsonl-import/
  analysis/
    exposure/
    cache-attribution/
    replay/
    legibility/
    task-grouping/
    context-composition/
  surfaces/
    cli/
    dashboard/
    exports/
```

## First Migration Slice

Move code in the smallest useful order:

1. Move event/privacy/store helpers into `src/core/`.
2. Move aggregation and legibility modules into `src/analysis/`.
3. Move proxy extraction/usage handling into `src/ingest/codex-proxy/`.
4. Move CLI command handlers into `src/surfaces/cli/commands/`.

Each slice should keep compatibility exports where needed so existing tests and
imports remain stable during the migration.

## Constitution Check

- **Local-first observability**: Pass. No hosted dependency introduced.
- **Privacy modes**: Pass. Privacy remains in the canonical core boundary.
- **Provider-agnostic insight**: Pass. Source-specific code is isolated from
  analyzers.
- **Explainability over raw numbers**: Pass. Reports continue to derive from
  analyzer outputs.
- **Documentation separation**: Pass. Product goals remain in `spec.md`;
  technical migration details live here.
- **Code organization**: Pass. This spec directly addresses large mixed modules.
