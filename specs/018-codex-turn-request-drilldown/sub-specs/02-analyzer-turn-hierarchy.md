# Sub-Spec: Analyzer Turn Hierarchy

## Domain Boundary

This sub-spec covers analyzer-owned derivation of turn groups, request rows, and title candidates from canonical data.

**Owns**
- Building the `turns -> requests -> artifacts` hierarchy.
- Choosing privacy-aware turn and request titles from canonical artifacts/details.
- Reporting grouping confidence and caveats.

**Does Not Own**
- Parsing Codex request payloads.
- Rendering dashboard interactions.
- Persisting provider-specific turn metadata.

## Required Behavior

- The analyzer consumes canonical request, artifact, usage, and privacy facts only.
- Turn groups are keyed by canonical turn identity when present.
- Requests without turn identity are grouped under an explicit fallback/unassigned turn group.
- Existing request accounting remains request-owned and is referenced from turn groups rather than duplicated inconsistently.
- Existing artifact details remain artifact-owned and are referenced from request rows.

## Title Selection

Turn title preference:

1. Privacy-permitted user turn preview associated with the turn.
2. Existing safe task/turn summary if available.
3. Explicit fallback label that communicates limited data.
4. Stable turn identifier as the last resort.

Request title preference:

1. Privacy-permitted assistant message or summary preview inside that request.
2. First meaningful action label inside that request.
3. Parent turn title.
4. Stable request identifier as the last resort.

## Determinism Rules

- Repeated context artifacts must not produce duplicate turns by themselves.
- If multiple title candidates exist, selection must be stable across repeated analysis of the same JSONL.
- Request title selection should prefer the assistant preview closest to the request's actionable content.
- Fallback groups must be visibly lower confidence than directly keyed turn groups.

## Acceptance Checks

- A run with one turn and multiple requests yields one turn group with multiple request children.
- A run with multiple turn keys yields multiple turn groups in chronological order.
- A request with an assistant progress message uses that message as its title.
- A request without assistant preview remains visible with an explicit fallback title.
