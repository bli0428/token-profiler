# Data Model: Codex Session Routing

## ObservedCodexRequest

Adapter-owned representation of one live Codex request at the proxy boundary.

**Fields**

- `headers`: normalized string header map observed on the incoming request.
- `body`: validated Responses request body.
- `client_metadata`: Codex metadata projection inside the request body, when present.
- `turn_metadata`: decoded full Codex turn metadata from `client_metadata` or direct headers, when present.
- `observed_keys`: safe diagnostics for body/header/client metadata key names.
- `unknown_keys`: safe diagnostics for unmodeled top-level body or `x-codex-*` keys.

**Validation Rules**

- Known body fields must match their expected type.
- Known nested objects such as reasoning, text controls, input item types, and tool definitions must match modeled shapes.
- Unknown top-level body fields are allowed only as diagnostics.
- Direct headers and `client_metadata` are string maps.
- Raw `instructions`, `input`, and `tools` may be inspected by adapter extraction code but must not be carried into generalized grouping records.

## CodexSessionIdentity

Codex-provided identity used to group new live traffic.

**Fields**

- `session_id`: preferred Codex session identifier when available.
- `thread_id`: secondary Codex thread/session identifier when `session_id` is unavailable.
- `window_id`: context-window identifier; only the thread/session portion may be used as a fallback identity.
- `source_location`: where the selected identity was observed, such as full turn metadata or compatibility headers.

**Validation Rules**

- Empty strings are ignored.
- Values are sanitized before becoming local run ids.
- Full turn metadata identity has precedence over compatibility projections.
- Identity from `prompt_cache_key` is not a CodexSessionIdentity.

## SessionGroupingDecision

The adapter result that selects the local session group for a request.

**Fields**

- `local_session_id`: sanitized local run/session id used for the per-session profiler store.
- `source`: machine-readable reason for the decision.
- `timestamp`: time the decision was made.
- `identity_kind`: whether the decision came from Codex session identity, compatibility identity, provider fallback, or generated fallback.

**Validation Rules**

- Codex session identity must win over provider fallback hints.
- Provider cache keys must not merge different Codex session identities.
- The selected source must match the field that actually determined the local session id.
- The decision must be safe to persist as metadata without raw request content.

## FallbackGroupingDecision

A grouping decision used when the request lacks Codex session identity.

**Fields**

- `local_session_id`: local run/session id from explicit profiler override, provider conversation id, prompt cache key, previous response id, prompt fingerprint, configured fallback, or generated id.
- `source`: fallback source.
- `limitations`: why the decision is not guaranteed to be one-to-one with a Codex session.

**Validation Rules**

- Fallback decisions must not be labeled as Codex-session grouping.
- Existing fallback behavior may continue when Codex session identity is absent.
- Fallback grouping is for new requests only; no historical migration is performed.

## Relationships

- One `ObservedCodexRequest` produces one `SessionGroupingDecision` or `FallbackGroupingDecision`.
- One `SessionGroupingDecision` maps to one local profiler run directory.
- Multiple requests with the same `CodexSessionIdentity` map to the same local session id.
- Canonical artifact and usage events belong to the selected local session id.
