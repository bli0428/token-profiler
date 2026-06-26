# Research: Source Adapters And Capture Boundaries

## Decision: migrate existing behavior before adding new behavior

**Rationale**: The repository already has working Codex live capture, Codex config mutation, session routing, canonical event writing, and partial Codex rollout import behavior. Rewriting those flows would risk behavior drift. Moving and splitting them by ownership satisfies the architecture goal while preserving proven behavior.

**Alternatives considered**:

- Rebuild all source adapters from scratch. Rejected because current proxy tests already cover important edge cases such as streaming, compressed request bodies, tool output metadata, and privacy modes.
- Keep top-level legacy files and add new modules around them. Rejected because it preserves the source-root coupling this feature is meant to remove.

## Decision: canonical capture writer belongs in `src/core/capture/`

**Rationale**: The existing profiler class creates canonical artifact records, applies privacy behavior, counts tokens, and appends events. That is not Codex-specific. Keeping it in the core domain lets Codex proxy, Codex log import, manual capture commands, and future sources share one canonical writer.

**Alternatives considered**:

- Move the writer into `src/ingest/codex-proxy/`. Rejected because it would make future sources depend on Codex-owned code.
- Leave `src/profiler.js` as implementation. Rejected because it keeps canonical writing in a top-level legacy file.

## Decision: Codex config and session routing are Codex proxy domain concerns

**Rationale**: The config mutator knows Codex provider block details, and session routing uses Codex request fields such as conversation IDs, prompt cache keys, and previous response IDs. These belong with the live Codex proxy adapter rather than in source root or core.

**Alternatives considered**:

- Treat session routing as a generic core service. Rejected because the current routing heuristics are Codex payload-specific.
- Keep config mutation in the CLI surface. Rejected because CLI should orchestrate commands, not own Codex config behavior.

## Decision: Codex rollout import belongs in `src/ingest/codex-log-import/`

**Rationale**: Rollout parsing and Codex session metadata enrichment are source-specific import concerns. The CLI should delegate to this ingestor and surfaces should consume the resulting records or enrichment output.

**Alternatives considered**:

- Keep import logic in `capture-commands.ts`. Rejected because it mixes command parsing with provider-specific import behavior.
- Merge log import into live proxy. Rejected because live capture and historical import have different completeness limitations and failure modes.

## Decision: prove future-source seams with a fixture-only adapter stub

**Rationale**: The user explicitly does not need Claude Code functionality built now. A fixture-only non-Codex adapter can prove the acceptance path: emit canonical records, declare limitations, honor privacy modes, and require no Codex or analyzer changes.

**Alternatives considered**:

- Build a Claude Code importer. Rejected as out of scope.
- Only document the seam without code validation. Rejected because it would not catch accidental coupling.

## Decision: preserve top-level modules only as thin compatibility exports

**Rationale**: The package already exposes some top-level imports used by tests and possibly consumers. Temporary thin re-exports are acceptable if implementation lives in domain modules and architecture-boundary tests enforce thinness.

**Alternatives considered**:

- Remove every top-level module immediately. Rejected because it would expand review risk and may break public imports.
- Keep implementation in top-level files. Rejected because it fails the migration success criteria.
