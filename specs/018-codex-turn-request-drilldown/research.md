# Research: Codex Turn Request Drilldown

## Decision: Store Turn Identity As Canonical Request-Level Metadata

**Rationale**: Turn identity answers "which user turn caused this request" and belongs between run/session identity and request identity. It is non-content metadata and should be available even when preview/raw content is hidden.

**Alternatives considered**:
- Infer turns from user-message previews: rejected because repeated context artifacts and cached/replayed prompts make this heuristic fragile.
- Store raw Codex turn metadata for downstream parsing: rejected because provider-specific payloads must terminate at adapters.
- Use prompt cache key or request order: rejected because neither is a turn identity.

## Decision: Keep Historical Backfill Out Of Scope

**Rationale**: Older JSONL lacks first-class turn identity. Inventing backfill heuristics would make the model less explicit and add long-term debt before the local format has settled.

**Alternatives considered**:
- Heuristic backfill from user messages: rejected because it would blur direct and inferred turn grouping.
- Migration pass over existing runs: rejected because current value is in new capture correctness, not historical compatibility.

## Decision: Analyzer Owns Turn Hierarchy And Titles

**Rationale**: The hierarchy combines canonical request facts, artifact previews, privacy state, and existing request accounting. That is analyzer/view-model work, not browser rendering work.

**Alternatives considered**:
- Build turns in React from request rows and artifact details: rejected because surfaces must not recompute analyzer logic.
- Add title fields directly at capture time: rejected because capture should record facts, while titles are presentation-oriented derivations subject to privacy rules.

## Decision: Request Titles Prefer Assistant Preview

**Rationale**: Multiple requests can belong to one user turn. The assistant progress/summary message is the closest user-readable explanation for why a follow-up request exists.

**Alternatives considered**:
- Use user turn preview for every request: rejected because it makes sibling requests indistinguishable.
- Use tool command labels first: rejected because commands belong in artifact expansion; assistant preview better explains intent.
- Use proxy request IDs: retained only as last-resort fallback.

## Decision: Dashboard API Owns The `turns -> requests -> artifacts` Shape

**Rationale**: The dashboard needs one stable response contract that already contains hierarchy, titles, confidence, privacy, and caveats.

**Alternatives considered**:
- Add a separate turn endpoint: rejected because run detail already contains the request and artifact data needed for the hierarchy.
- Keep request list top-level and add badges: rejected because the user wants turns as the next layer above requests.

## Decision: Reuse Request Accounting Internally Without Preserving A Competing API Shape

**Rationale**: Request accounting remains useful and already owns usage/availability metrics. The analyzer/API should map the needed request metrics into turn request children explicitly, rather than forcing the dashboard to reconcile two parallel request-first and turn-first response shapes.

**Alternatives considered**:
- Duplicate request metrics into a new independent turn model: rejected because it risks contract drift.
- Preserve the old request-first API as a peer contract for compatibility: rejected because this feature intentionally makes turn hierarchy the primary run-detail model.
