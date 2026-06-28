# Research: Request Accounting Contract

## Decision: Treat provider usage events as authoritative request totals

**Rationale**: Existing canonical `request_usage` events already contain input, cached input, uncached input, output, total tokens, request identity, and timestamp. The feature's primary user value is identifying which provider request burned tokens, so the contract should expose those numbers directly when available.

**Alternatives considered**: Deriving request totals by summing artifact token estimates was rejected because local tokenization and artifact capture can be incomplete or differently tokenized from provider billing. Reusing aggregate artifact totals was rejected because a single artifact can appear in multiple requests and does not answer which request was expensive.

## Decision: Represent missing usage as availability, not numeric zero

**Rationale**: Failed, incomplete, streamed, historical, or unsupported provider responses may not emit usage. Showing zeros would imply provider-confirmed no usage. A request row should still exist when artifacts or chronology prove the request happened, but token fields should be absent and availability should explain missing facts.

**Alternatives considered**: Dropping requests without usage was rejected because it hides request chronology and makes session accounting look complete when it is not. Filling nulls with zero was rejected because it fabricates cost data.

## Decision: Add analyzer-owned request accounting output before dashboard API mapping

**Rationale**: The architecture requires analyzers to consume canonical records and surfaces to render analyzer outputs. Request accounting combines canonical usage, canonical artifact inclusions, and local attribution caveats, so it belongs in `src/analysis/` with owned types. The dashboard API should explicitly map that output into its public JSON contract.

**Alternatives considered**: Adding request accounting directly in dashboard API mapping was rejected because it would mix analyzer logic into a surface. Adding it in the React dashboard was rejected because browser surfaces must not recompute request totals or attribution.

## Decision: Expose request accounting through the existing dashboard API envelope

**Rationale**: The dashboard API already has local-only, read-only envelopes with `schema_version`, `generated_at`, `data`, and `caveats`. Request accounting can be embedded on `GET /api/runs/:runId` for initial clients and may also be exposed via `GET /api/runs/:runId/requests/:requestId` if payload size or focused refresh demands it.

**Alternatives considered**: A separate CLI-only output was rejected because the next feature needs dashboard consumption. A new API service or schema version was rejected because the response envelope can evolve additively while preserving current fields.

## Decision: Keep session route identity separate from Codex identity

**Rationale**: Existing dashboard sessions use a routable local `run_id`, while Codex-derived identity may come from direct session IDs, cache/conversation IDs, wrapper headers, rollout timing, or fallback fingerprints. The contract should expose route identity, canonical run identity, Codex identity when known, and mapping confidence separately.

**Alternatives considered**: Replacing `run_id` with a Codex session ID was rejected because it would break routing and overstate identity for fallback captures. Hiding Codex identity was rejected because users need to correlate dashboard sessions with Codex sessions.

## Decision: Model request artifact inclusions as request-scoped rows

**Rationale**: The same artifact may appear in many requests. Request detail needs the artifact's inclusion order, local token count, offsets when available, request-local estimated cached/uncached attribution, privacy state, and caveats. This avoids confusing aggregate artifact totals with one request's contributors.

**Alternatives considered**: Linking to existing aggregate artifact rows only was rejected because it loses request order and request-local contribution. Creating separate persisted inclusion records was rejected because the facts already exist in canonical artifact events and analyzer request summaries.

## Decision: Use explicit attribution availability and caveats for local estimates

**Rationale**: Cache attribution already notes that provider totals remain authoritative and artifact attribution is estimated from local token ranges. Request accounting should preserve that distinction per request and per artifact inclusion, especially when offsets, opaque content, or usage facts are missing.

**Alternatives considered**: Presenting per-artifact cached/uncached numbers without caveats was rejected because it would imply provider-authoritative billing. Hiding estimates entirely was rejected because estimates are useful for explaining likely contributors when caveated.
