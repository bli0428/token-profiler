# Token Profiler Specs

This directory contains the product roadmap as Spec Kit feature specifications.
The specs are ordered by dependency and intended implementation sequence.

The architecture north star is documented in
[docs/architecture.md](../docs/architecture.md). Specs should be read as
incremental slices of that architecture, not as separate product directions.
Items that are desired but not yet executable specs live in
[BACKLOG.md](./BACKLOG.md).

## Spec Map

| Spec | Focus | Depends on |
|---|---|---|
| `001-canonical-event-schema-privacy` | Typed canonical events, storage modes, privacy policy | None |
| `006-module-boundaries-architecture` | Migrate the MVP source tree toward explicit architecture boundaries | 001 |
| `002-source-adapters-capture` | Codex/Claude/OpenAI source adapters and ingestion boundaries | 001, 006 |
| `003-analyzer-pipeline` | Modular analyzers for exposure, cache, replay, and attribution docs | 001, 006 |
| `004-legibility-task-explorer` | Human-readable artifact and task/story grouping | 001, 002, 003, 006 |
| `005-local-dashboard` | Local page for exploring metrics and artifacts | 001, 003, 004, 006 |
| `007-dashboard-api-surface` | Local read-only HTTP API contract for dashboard clients | 001, 003, 004, 006 |
| `008-dashboard-frontend-app` | Isolated top-level dashboard frontend app | 007 |
| `009-dashboard-surface-cleanup` | Cleanup of the current static dashboard surface | 007, 008 |
| `010-dashboard-contract-drift-guards` | Superseded by expanded 008; retained as API-real fixture audit reference | 007, 008 |
| `011-dashboard-shell-state-architecture` | Superseded by expanded 008; retained as shell/state architecture audit reference | 008 |
| `012-dashboard-style-system` | Superseded by expanded 008; retained as style-system audit reference | 008 |
| `013-dashboard-package-boundaries` | Superseded by expanded 008; retained as package-boundary audit reference | 008 |

## Product Direction

The core product is not a generic LLM trace viewer. It is a local-first tool for
understanding what an agent placed in context, how that context persisted over
time, and which artifacts explain token-heavy sessions. Provider usage totals
are authoritative; local tokenization is used for artifact-level attribution and
must document when artifact attribution is estimated from local tokenizer counts.

## Architecture Layers

```text
Ingestors -> Canonical Store -> Analyzers -> Surfaces
```

- **Ingestors**: Codex proxy, Codex log import, Claude telemetry import, OpenAI
  proxy, and manual JSONL import.
- **Canonical Store**: typed events, artifact records, request records, usage
  records, trace/span records, and privacy policy.
- **Analyzers**: exposure, cache attribution, replay/persistence, legibility,
  task grouping, and context composition.
- **Surfaces**: CLI reports, local dashboard, JSON export, and optional
  OTel/Langfuse export.

Provider-specific payloads must not leak into analyzers. Adapters convert source
data into canonical records first; reports and dashboards consume analyzer
outputs derived from those records.

Run `006-module-boundaries-architecture` before substantial new work on `002`,
`003`, `004`, or `005`.
