# Contract: Codex Session Routing

This contract describes the adapter-owned routing behavior for new live Codex proxy traffic. It is not a dashboard API contract and does not expose raw provider request bodies outside the adapter.

## Input Boundary

The live proxy observes:

- incoming HTTP headers
- parsed JSON Responses request body
- request body `client_metadata`
- optional direct Codex compatibility headers

Known request body fields include:

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

Known Codex metadata identity fields include:

- `client_metadata["x-codex-turn-metadata"].session_id`
- `client_metadata["x-codex-turn-metadata"].thread_id`
- direct `x-codex-turn-metadata.session_id`
- direct `x-codex-turn-metadata.thread_id`
- compatibility `client_metadata.session_id`
- compatibility `client_metadata.thread_id`
- direct `session-id`
- direct `thread-id`
- `x-codex-window-id`

## Routing Precedence

The route decision must use this order:

1. Explicit local override header, when intentionally supplied.
2. Full Codex turn metadata `session_id` from request `client_metadata`.
3. Full Codex turn metadata `thread_id` from request `client_metadata`.
4. Full Codex turn metadata `session_id` from direct header.
5. Full Codex turn metadata `thread_id` from direct header.
6. Compatibility `client_metadata.session_id`.
7. Compatibility `client_metadata.thread_id`.
8. Compatibility direct `session-id`.
9. Compatibility direct `thread-id`.
10. Thread/session portion of `x-codex-window-id`.
11. Existing provider or generated fallback behavior when no Codex session identity is available.

Provider cache key, previous response id, prompt fingerprint, or generated fallback must never override an available Codex session identity.

## Output Boundary

For each routed request, the adapter must produce or preserve:

- local session id used as the profiler run id
- routing source
- routing timestamp
- safe observed key diagnostics
- canonical artifact events for extracted artifacts
- canonical usage events when provider usage is observed

The adapter must not persist the full observed request envelope as a canonical record.

## Privacy Requirements

- Metadata-only mode must not persist raw `instructions`, `input`, `tools`, message text, command output, patch content, or tool output merely for session grouping.
- Safe routing source fields and observed key names may be persisted.
- Sensitive headers such as authorization, attestation values, and account identifiers must not be persisted as raw values.

## Acceptance Contract

A compliant implementation satisfies these observable outcomes:

- Two new requests with the same Codex turn metadata `session_id` resolve to the same local session id.
- Two new requests with different Codex turn metadata `session_id` values resolve to different local session ids.
- A request with both Codex session identity and `prompt_cache_key` resolves by Codex session identity.
- A request without Codex session identity may use fallback routing, and its source reports that fallback.
- Malformed known request fields are rejected or surfaced before they can affect grouping.
