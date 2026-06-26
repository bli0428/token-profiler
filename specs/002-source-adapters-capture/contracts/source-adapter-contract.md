# Contract: Source Adapter Boundary

## Purpose

Source adapters convert provider-specific live capture, local logs, or fixture data into canonical records and source limitations. This contract exists so Codex, future Claude Code support, and provider-compatible sources can be added as sibling ingestors without analyzer or Codex-module coupling.

## Adapter Responsibilities

Each source adapter must:

- Declare a stable `source_id`.
- Declare its capture method: `live`, `import`, or `fixture`.
- Emit canonical artifact and usage records through the canonical capture writer or canonical event constructors.
- Preserve source identity and capture method in emitted metadata where user-facing reports need it.
- Honor the selected storage/privacy mode for every artifact.
- Declare limitations for missing, partial, skipped, malformed, or estimated facts.
- Keep provider-specific payload interpretation inside its own `src/ingest/<source>/` folder.

Each source adapter must not:

- Require analyzer imports of provider-specific modules.
- Store raw provider payloads in analyzer-visible records unless raw-content mode explicitly permits it.
- Modify another source adapter to add its own behavior.
- Put provider-specific parsing in CLI command handlers.

## Canonical Output

Adapters may emit:

- artifact records
- request usage records
- source limitation records represented as metadata until a first-class limitation event exists

Required metadata for source-produced records:

- `source_id`
- `capture_method`
- `adapter_version` when available
- `session_source` or equivalent routing source when available

## Codex Proxy Adapter

The Codex proxy adapter owns:

- request payload extraction
- compressed body decoding for observed request bodies
- tool call and tool output pairing metadata
- response usage observation
- Codex-specific session routing
- Codex config enable/disable helpers

It must preserve upstream request and response behavior.

## Codex Log Import Adapter

The Codex log import adapter owns:

- rollout JSONL parsing
- Codex session index metadata reading
- imported usage record creation
- malformed/skipped entry accounting
- source limitation reporting for missing prompt composition or incomplete events

## Fixture Source Adapter

The fixture source adapter is not a user-facing integration. It exists only to prove future-source seams.

It must:

- live outside Codex-specific folders
- emit representative canonical records
- emit at least one source limitation
- run through analyzers without Codex-specific imports or code changes

## Compatibility Modules

Top-level modules may remain only when they are thin public compatibility re-exports. They must not contain provider-specific parsing, canonical event writing implementation, session routing implementation, or config mutation implementation.
