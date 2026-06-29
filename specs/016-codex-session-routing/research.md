# Research: Codex Session Routing

## Decision: Treat Codex Session Identity As The Primary Routing Key For New Live Traffic

**Rationale**: Codex requests now expose session identity through the observed Codex request envelope, especially full turn metadata and compatibility session headers. Using that identity directly satisfies the user's goal: new traffic after proxy restart should group by Codex session rather than provider cache or prompt-derived hints.

**Alternatives considered**:

- Continue using `prompt_cache_key`: rejected because cache keys can be shared or provider-oriented and do not prove one-to-one Codex session identity.
- Use request fingerprinting first: rejected because fingerprinting can merge unrelated sessions with similar prompts.
- Use dashboard-side grouping only: rejected because session grouping should be determined at capture/canonical boundary, not recomputed in a surface.

## Decision: Keep Historical Runs Out Of Scope

**Rationale**: The requested behavior is explicitly for new live traffic after restarting the proxy. Avoiding migration keeps the feature narrow and prevents accidental reinterpretation of historical data whose original request identity may be incomplete.

**Alternatives considered**:

- Rewrite existing run directories: rejected because it risks changing user data and complicates privacy/migration boundaries.
- Add compatibility aliases for old `codex-cache-*` runs: rejected for this feature because dashboard compatibility belongs to a separate surface/data-contract discussion if needed later.

## Decision: Validate The Observed Codex Request Shape Inside The Adapter

**Rationale**: The adapter needs a readable, source-backed contract for the full request it ingests: headers, Responses body, `client_metadata`, input items, tools, and turn metadata. Runtime validation catches malformed known fields before routing and makes unknown top-level body fields explicit diagnostics.

**Alternatives considered**:

- Continue ad hoc property access: rejected because it hides what the adapter expects and makes future missed fields likely.
- Strictly reject every unknown top-level body field: rejected because upstream Responses requests may add fields; diagnostics are safer than breaking local capture for new top-level fields.
- Allow unknown nested known shapes: rejected because it weakens the contract where upstream shape is known and important to artifact extraction.

## Decision: Record A Safe Grouping Source For Explainability

**Rationale**: Users need to understand whether a group is truly Codex-session based or a fallback. Recording the source of the route decision supports diagnostics and later dashboard labeling without exposing raw provider payloads.

**Alternatives considered**:

- Only encode the source in the run id: rejected because run id alone cannot explain which observed field won.
- Store full request envelope in canonical records: rejected because provider-specific payloads must terminate at the adapter and may contain sensitive data.

## Decision: Keep Dashboard Grouping Separate

**Rationale**: The user requested two specs. This feature owns live proxy grouping and safe canonical/session metadata. Dashboard session-list behavior belongs to `017-codex-session-dashboard-grouping`.

**Alternatives considered**:

- Combine adapter and dashboard work: rejected because it blurs `Adapters -> Canonical Store -> Analyzers -> Surfaces` boundaries and makes validation harder.
