# Architecture: Hybrid Local Observability Core

The project is a local-first tool for understanding agent context behavior:
context artifacts, token exposure, cache attribution, and privacy-aware content
inspection.

```text
Ingestors -> Canonical Store -> Analyzers -> Surfaces
```

## Rules

- Provider-specific payloads terminate at ingestors.
- Canonical records are the only contract shared across layers.
- Analyzers consume canonical records only.
- Surfaces render analyzer outputs and must not recompute analyzer logic.
- Privacy mode is a first-class field on captured artifacts.
- Legacy formats are accepted only through import/migration adapters.

## Layers

**Ingestors** convert source-specific data into canonical records:

- Codex proxy
- Codex log import
- Claude telemetry import
- OpenAI-compatible proxy
- Manual JSONL import
- Never let provider-specific payloads leak directly into analyzers.

**Canonical Store** owns persisted facts:

- artifact records
- request records
- usage records
- trace/span records
- privacy mode policy
- schema versioning
- legacy import boundaries

**Analyzers** derive reusable results:

- exposure
- cache attribution
- replay and persistence
- legibility
- task grouping
- context composition

**Surfaces** present or export analyzer outputs:

- CLI reports
- local dashboard
- JSON export
- optional OTel/Langfuse export

## Target Source Shape

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
  surfaces/
```

Always ensure clean separation of concerns. Every module should pass the AND test - no "Module X handles A AND B"

## Technology Direction

Building towards TypeScript, runtime schemas, SQLite, analyzer plugins, local
API, Vite/React dashboard, JSONL import/export, optional OTel/Langfuse export.

