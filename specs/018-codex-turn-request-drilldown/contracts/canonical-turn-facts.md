# Contract: Canonical Turn Facts

## Scope

This contract describes the provider-neutral request facts that must exist after capture/import for analyzers to build turn groups. It is intentionally smaller than the Codex request envelope and must not be represented as provider metadata attached to arbitrary artifacts.

## Request-Level Turn Fields

```ts
type CanonicalRequestTurnIdentity = {
  request_id: string;
  run_id: string;
  turn_id?: string;
  turn_identity_source:
    | "direct_turn_id"
    | "missing"
    | "malformed";
  turn_started_at?: string;
  caveats: AnalysisCaveat[];
};
```

## Rules

- `turn_id` is a canonical grouping key, not a display title.
- Turn identity is a request-level fact keyed by `request_id`; artifact records should not be the authoritative source for turn grouping.
- Source-specific field names from Codex metadata do not leave the adapter boundary.
- `turn_started_at` may help ordering, but it is not required for grouping when `turn_id` exists.
- Missing or malformed source turn identity must be explicit.
- Capture must not invent fallback turn identities; fallback grouping is an analyzer/display concern.
- Privacy mode controls content previews, not the availability of non-content turn identity.
