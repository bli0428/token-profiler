# Backlog

Items here are architecture or product work that is directionally desired but not
yet captured as executable Spec Kit feature specs.

## 007 Runtime Schema Library

**Why**: The new infrastructure now uses TypeScript, but runtime validation is
still hand-rolled. Persisted data and imported logs can be old or malformed, so
compile-time types are not enough.

**Scope**:

- Introduce runtime schemas for persisted event records.
- Derive or align TypeScript types with runtime schemas.
- Keep legacy import quarantined from canonical readers.
- Validate canonical records at write/read boundaries.
- Keep local artifact attribution documentation unchanged.

**Not Included**:

- TypeScript migration for already-migrated new infrastructure.
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
