# Backlog

Items here are architecture or product work that is directionally desired but not
yet captured as executable Spec Kit feature specs.

## 007 Runtime Schema Library

**Why**: The new infrastructure now uses TypeScript, but runtime validation is
still hand-rolled. Persisted data and imported logs can be old or malformed, so
compile-time types are not enough.

**Scope**:

- Introduce runtime schemas for persisted event records.
- Add adapter-local runtime schemas for Codex/OpenAI provider payloads currently
  parsed in `src/ingest/codex-proxy/*`.
- Model provider request and response shapes enough to safely extract artifacts,
  usage, tool calls, tool outputs, and readable metadata.
- Convert validated provider payloads into canonical events before they reach
  storage or analyzers.
- Replace generic artifact metadata objects with typed metadata variants, such
  as command output, patch summary, tool call, message, file, and unknown
  metadata.
- Add a discriminator for canonical metadata kind so analyzers and UI can read
  structured metadata without provider-specific assumptions.
- Derive or align TypeScript types with runtime schemas.
- Keep provider-specific payload types quarantined inside ingest adapters.
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
