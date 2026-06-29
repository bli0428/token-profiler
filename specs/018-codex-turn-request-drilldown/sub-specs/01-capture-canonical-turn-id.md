# Sub-Spec: Capture And Canonical Turn Identity

## Domain Boundary

This sub-spec covers the path from observed Codex request metadata to canonical stored turn facts.

**Owns**
- Mapping source-provided turn identity into canonical fields.
- Recording which request belongs to which turn.
- Preserving the source/availability explanation for turn identity.

**Does Not Own**
- User-facing dashboard hierarchy layout.
- Turn title selection from content previews.
- Analyzer rollups or token metrics.

## Required Behavior

- Codex-specific request metadata is interpreted only inside the Codex adapter/capture boundary.
- The canonical store receives explicit request-level turn identity facts, not raw Codex metadata blobs or artifact-owned annotations.
- A request can be associated with at most one canonical turn identity for a given run.
- Missing or malformed turn identity is represented explicitly instead of guessed or converted to a fallback id.
- Metadata-only capture must still store the non-content turn key when available.

## Data Contract Expectations

Canonical request-level facts need enough information to answer:

- Which run/session does this request belong to?
- Which turn does this request belong to, if known?
- Was the turn key directly observed, absent, or malformed?
- What source produced the turn key?

## Architecture Constraints

- Provider-specific field names remain quarantined in the Codex adapter.
- The canonical event shape should use provider-neutral names such as `turn_id` or `turn_identity`, not Codex-only envelope names.
- The canonical request fact is authoritative for turn grouping; artifact events should not become the source of truth for turn identity.
- Do not store raw metadata solely to make later dashboard grouping possible.
- Do not infer turn identity from user message text, prompt cache key, or artifact names when a clean source key is absent.
- Do not invent fallback turn ids in capture; fallback grouping belongs to analyzer/display code.

## Acceptance Checks

- Representative Codex requests with `turn_id` produce canonical request facts with the same logical turn grouping.
- Two requests with the same source turn key share one canonical turn group.
- Two requests with different source turn keys do not share one canonical turn group.
- A request without source turn key remains visible with an explicit missing-turn explanation.
