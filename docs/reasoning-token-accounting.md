# Reasoning Token Accounting

Reasoning model accounting has two different concepts that must not be merged:

- **Reasoning tokens** are provider-reported generated tokens. For OpenAI Responses API usage, these are reported under `output_tokens_details.reasoning_tokens` and are included in `output_tokens`.
- **Reasoning state** is opaque carried state that can appear as a later request input item, such as a `reasoning` item with encrypted content. The encrypted payload is not plaintext reasoning and its local tokenized size is not the model's reasoning-token count.

## Product Rule

User-facing artifact token breakdowns must not present encrypted reasoning state as ordinary context tokens. It is acceptable to retain internal offsets for request reconciliation, but the dashboard should treat reasoning state as opaque provider state:

- display it as `Reasoning state`;
- hide encrypted/raw payload content from artifact detail;
- omit the artifact-level `Tokens` metric for this row;
- show actual reasoning-token usage only from provider usage when available.

## Accounting Rule

Request-level totals remain provider authoritative:

- `input_tokens` covers request input;
- `cached_input_tokens` and `uncached_input_tokens` split provider-reported input cache usage;
- `output_tokens` covers generated output;
- `reasoning_tokens`, when present, is a subset/detail of `output_tokens`, not a separate input artifact total.

Artifact-level token attribution remains an estimate derived from local token offsets normalized against provider input totals. That estimate is useful for ordinary prompt, tool, and context artifacts, but it should not be interpreted as semantic reasoning size for encrypted reasoning state.

Sources: OpenAI Responses API reasoning guide and response usage fields: <https://platform.openai.com/docs/guides/reasoning>, <https://platform.openai.com/docs/api-reference/responses/object>.
