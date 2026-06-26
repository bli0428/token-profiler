# Backlog

Items here are architecture or product work that is directionally desired but not
yet captured as executable Spec Kit feature specs.

## 007 TypeScript And Runtime Schemas

**Why**: Canonical records, adapters, analyzer outputs, and dashboard/API
contracts are stable enough to benefit from compile-time types. Runtime
validation should remain because persisted data and imported logs can be old or
malformed.

**Scope**:

- Migrate core canonical records to TypeScript.
- Introduce runtime schemas for persisted event records.
- Keep legacy import quarantined from canonical readers.
- Use `.ts` for core, ingest, analysis, and CLI.
- Reserve `.tsx` for future React dashboard files.

**Not Included**:

- SQLite migration.
- Dashboard implementation.

## 008 SQLite Canonical Store

**Why**: JSONL is good for MVP portability, but larger sessions and dashboard
queries need indexed local storage once schemas stabilize.

**Scope**:

- Add a local SQLite store for canonical records.
- Preserve JSONL import/export for portability.
- Keep current JSONL runs readable.
- Define migration/import behavior from JSONL to SQLite.
- Keep provider-specific data out of analyzer queries.

**Not Included**:

- Hosted storage.
- Remote sync.

## 009 Local API Server

**Why**: A dashboard will eventually need a local read API over canonical store
and analyzer outputs. This should be explicit rather than hidden inside the UI.

**Scope**:

- Provide a loopback-only local API.
- Serve session lists, run summaries, analyzer results, and artifact details.
- Respect privacy/storage mode for preview and raw content.
- Keep surfaces from recomputing analyzer logic.
- Support the dashboard without requiring hosted infrastructure.

**Not Included**:

- Public hosted API.
- Authentication beyond local-only protections unless later required.

