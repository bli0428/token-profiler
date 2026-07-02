# Architecture: Hybrid Local Observability Core

The project is a local-first tool for understanding agent context behavior:
context artifacts, token exposure, cache attribution, and privacy-aware content
inspection.

The architecture is intentionally modular. The goal is to keep each layer's
responsibility easy to reason about while making new sources, analyzers, stores,
and surfaces addable with minimal infrastructure churn. Future integrations
should plug into the appropriate boundary instead of requiring provider-specific
logic to spread across the codebase.

```text
Adapters -> Canonical Store -> Analyzers -> Surfaces
```

## Rules

- Provider-specific payloads terminate at adapters.
- Canonical records are the only contract shared across layers.
- Analyzers consume canonical records only.
- Surfaces render analyzer outputs and must not recompute analyzer logic.
- Privacy mode is a first-class field on captured artifacts.
- Legacy formats are accepted only through import/migration adapters.

## Layers

**Adapters** convert source-specific data into canonical records.

Current adapters:

- Codex proxy
- Codex log import
- fixture source for boundary tests

Planned adapter directions include Claude Code, OpenAI-compatible sources, and
manual JSONL import.

**Canonical Store** owns persisted facts.

Current canonical event records:

- artifact records
- request usage records
- request turn identity records
- schema versioning
- privacy storage mode

Planned store directions include trace/span records, broader request facts,
legacy import boundaries, and SQLite-backed storage once the canonical event
shape is stable.

**Analyzers** derive reusable results:

- exposure
- cache attribution
- replay and persistence
- legibility
- task grouping
- turn grouping
- context composition

**Surfaces** present or export analyzer outputs:

- CLI reports
- local dashboard API
- React dashboard app

Planned surface directions include JSON export and optional OTel/Langfuse
export.

## Current Source Shape

```text
src/
  adapters/
    source-adapter.ts
    codex/
      live-proxy/
      log-import/
    fixture-source/
  core/
    capture/
    events/
    hash/
    privacy/
    store/
    tokenization/
  analysis/
  surfaces/
    cli/
    dashboard-api/

dashboard/
  src/
    api/
    components/
    hooks/
    policy/
    run-explorer/
    sessions/
    shell/
    state/
    styles/
    test/
    utils/
```

Every module should pass the AND test: no "Module X handles A AND B."

## Technology Direction

Current infrastructure: TypeScript, local JSONL storage, Node CLI/proxy
services, local dashboard API, and a Vite/React dashboard app. Because the
project is pre-public, avoid source-root compatibility wrappers and prefer
canonical module paths.

Building towards runtime schemas, SQLite, analyzer plugins, JSONL
import/export, and optional OTel/Langfuse export.
