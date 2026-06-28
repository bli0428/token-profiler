# Codex Request Envelope

This document records the Codex request shape consumed by the Codex live proxy
adapter. It exists so session routing and capture diagnostics are based on
source-backed fields rather than inferred provider payload details.

## Source References

- `ResponsesApiRequest`, including top-level body fields such as
  `instructions`, `input`, `tools`, `tool_choice`, `parallel_tool_calls`,
  `reasoning`, `store`, `stream`, `include`, `prompt_cache_key`, `text`, and
  `client_metadata`:
  <https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/common.rs>
- Codex Responses request construction:
  <https://github.com/openai/codex/blob/main/codex-rs/core/src/client.rs>
- `CodexResponsesMetadata` and `CodexTurnMetadataPayload`:
  <https://github.com/openai/codex/blob/main/codex-rs/core/src/responses_metadata.rs>
- Generic Codex API `session-id` and `thread-id` headers:
  <https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/requests/headers.rs>
- Responses endpoint request assembly, including `x-client-request-id`:
  <https://github.com/openai/codex/blob/main/codex-rs/codex-api/src/endpoint/responses.rs>
- Header behavior tests:
  <https://github.com/openai/codex/blob/main/codex-rs/core/tests/responses_headers.rs>

The upstream `responses_metadata.rs` comment describes
`client_metadata["x-codex-turn-metadata"]` as the canonical transport for the
full Codex turn metadata blob. Flat `client_metadata` keys and direct HTTP or
WebSocket headers are compatibility projections of that snapshot.
Those flat `client_metadata` projections intentionally mix snake_case keys such
as `session_id` with header-name keys such as `x-codex-installation-id` and
`x-codex-window-id`, matching upstream Codex exactly.

The adapter mirrors this known upstream shape with local Zod runtime schemas in
`src/adapters/codex/live-proxy/codex-envelope.ts`. The schemas describe the
whole observed request boundary: direct HTTP headers, the Responses request
body, and the Codex `client_metadata` projection inside that body. Known fields
are typed explicitly; `client_metadata` and normalized headers are string maps,
matching upstream `HashMap<String, String>` and HTTP header behavior.

The adapter pipeline is intentionally split by concern:

1. `CodexResponsesApiRequestSchema`, `CodexClientMetadataSchema`,
   `CodexTurnMetadataSchema`, `CodexRequestHeadersSchema`, and
   `CodexRequestShapeSchema` define the assumed Codex request shape.
2. `toCodexRequestShape` serializes the observed HTTP headers and JSON payload
   into that adapter-local shape.
3. `normalizeCodexRequestShape` decodes projected metadata, classifies safe
   diagnostics, summarizes body fields without carrying raw prompt content, and
   prepares a normalized envelope without choosing which identity projection
   wins.
4. `codexSessionRoute` maps the normalized Codex envelope into the profiler's
   generalized local session route and owns identity precedence.

## Responses Request Body

The top-level request body is based on upstream `ResponsesApiRequest`.

Known fields:

- `model`
- `instructions`
- `input`
- `tools`
- `tool_choice`
- `parallel_tool_calls`
- `reasoning`
- `store`
- `stream`
- `include`
- `service_tier`
- `prompt_cache_key`
- `text`
- `previous_response_id`
- `client_metadata`

The adapter schema names these fields explicitly so the ingested body shape is
visible in one place. The normalized envelope exposes safe facts such as model,
tool choice, reasoning effort, stream/store flags, include values, prompt cache
key, text verbosity, input/tool counts, observed body keys, and unknown body
keys. It does not carry raw `instructions`, `input`, or `tools` into the
generalized route object; artifact extraction handles those provider-specific
payloads inside the Codex adapter.

Unknown top-level body fields are allowed only so future upstream fields can be
reported as `unknownBodyKeys` without breaking the local proxy. Nested known
objects such as `reasoning` and `text` are strict, and known fields with wrong
types are rejected at the adapter boundary.

`input` and `tools` are also modeled because they feed artifact extraction.
Known input item shapes include messages, function calls, function call outputs,
custom tool calls, and custom tool call outputs. Unsupported input item objects
are still accepted as provider items so the extractor can record them as
unknown-input artifacts with observed keys. Tool definitions model the fields
used for artifact naming: `type`, `name`, and `function.name`.

## Canonical Turn Metadata

The canonical metadata blob is the JSON value in
`client_metadata["x-codex-turn-metadata"]`. Direct HTTP header
`x-codex-turn-metadata` is also emitted as compatibility output from the same
source object.

Known fields:

- `installation_id`
- `session_id`
- `thread_id`
- `turn_id`
- `window_id`
- `request_kind`: known upstream values include `turn`, `prewarm`,
  `compaction`, and `memory`.
- `forked_from_thread_id`
- `parent_thread_id`
- `subagent_kind`
- `thread_source`
- `sandbox`
- `workspaces`
- `turn_started_at_unix_ms`
- `compaction`

The metadata object can include extra caller-provided fields after reserved
Codex-owned keys are filtered upstream. The adapter parser preserves these as
`extra` values for shape diagnostics, but routing must use the explicit identity
fields above.

## Compatibility Headers

These headers are useful fallback projections, but they are not the canonical
metadata object:

- `x-codex-installation-id`
- `x-codex-window-id`
- `x-codex-parent-thread-id`
- `x-openai-subagent`
- `session-id`
- `thread-id`
- `x-client-request-id`

`session-id` and `thread-id` come from `codex-api` session header helpers, not
from the `x-codex-*` metadata constants. This is why they do not appear beside
`X_CODEX_TURN_METADATA_HEADER` in `core/src/client.rs`.

## Transport, Auth, And Product Headers

These headers are observable on proxied requests, but they are not session
identity fields:

- `x-codex-beta-features`
- `x-codex-turn-state`
- `x-oai-attestation`
- `chatgpt-account-id`
- `originator`
- `user-agent`
- `authorization`
- HTTP framing headers such as `accept`, `content-type`, `host`, and
  `content-length`

The adapter may record safe presence or key-shape diagnostics for these headers.
It must not persist authorization values, attestation blobs, account ids, raw
prompt bodies, or other sensitive payload values by default.

## Routing Precedence

The live proxy should route Codex traffic by Codex-owned session identity before
provider cache hints:

1. Explicit Token Efficiency override header: `x-token-profiler-session`.
2. `client_metadata["x-codex-turn-metadata"].session_id`.
3. `client_metadata["x-codex-turn-metadata"].thread_id`.
4. Direct header `x-codex-turn-metadata.session_id`.
5. Direct header `x-codex-turn-metadata.thread_id`.
6. Compatibility `session-id`.
7. Compatibility `thread-id`.
8. Thread portion of `x-codex-window-id`.
9. Provider request conversation or metadata ids.
10. Provider `prompt_cache_key`.
11. `previous_response_id`.
12. Prompt fingerprint or generated fallback.

The current implementation parses client metadata and direct headers through a
single adapter-owned envelope parser. The parsed envelope keeps the full
Responses request body summary, `client_metadata`, and direct-header
projections as separate observations, then `codexSessionRoute` chooses the best
Codex session route before the router falls back to provider payload fields.

## Shape Coverage

To avoid silent future misses, the parser exposes:

- all observed header names
- all observed body field names
- all observed `client_metadata` keys
- unknown body field names
- unknown `x-codex-*` header names
- unknown `x-codex-*` `client_metadata` keys
- safe body summaries for `model`, `tool_choice`, `parallel_tool_calls`,
  `reasoning.effort`, `store`, `stream`, `include`, `prompt_cache_key`, and
  `text.verbosity`
- parsed known identity fields
- safe transport presence flags, such as whether an account or attestation
  header was present

Unknown fields should be treated as adapter diagnostics. They should not change
canonical store or analyzer contracts until they are explicitly mapped and
documented.
