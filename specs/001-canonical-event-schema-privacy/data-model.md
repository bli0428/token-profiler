# Data Model: Consistent Capture Records And Privacy Modes

## CapturedSession

Represents one analyzed agent session.

- `run_id`: stable local session identifier
- `created_at`: first known event time, derived
- `updated_at`: last known event time, derived
- `source`: capture source when known

## ArtifactEvent

Represents one captured item included in a model request.

- `schema_version`: event schema version
- `event_kind`: `"artifact"`
- `run_id`
- `request_id`
- `artifact_id`
- `artifact_type`
- `artifact_name`
- `content_hash`
- `local_token_count`: token count estimated by the local tokenizer
- `tokenizer`
- `timestamp`
- `artifact_index`
- `token_start`
- `token_end`
- `storage_mode`: `"metadata" | "preview" | "raw"`
- `metadata`: structured artifact details
- `preview`: present only in preview mode
- `content`: present only in raw mode

## RequestUsageEvent

Represents provider-reported token usage for one request.

- `schema_version`
- `event_kind`: `"request_usage"`
- `run_id`
- `request_id`
- `response_id`
- `input_tokens`
- `cached_input_tokens`
- `uncached_input_tokens`
- `output_tokens`
- `total_tokens`
- `timestamp`

## ArtifactMetadata

Structured metadata for readable reports. Known variants:

- Command call: command, workdir, tool name, call id
- Command output: command, workdir, exit code, output preview, original tool-reported output token count when available
- Patch: touched files, add/update/delete counts
- Tool definition: tool name and schema size indicators
- Message/system/reasoning: role or item type where available

Unknown fields are preserved when reading and ignored by analyzers that do not understand them.

## ContentPreview

Bounded local excerpt for preview mode.

- `head`: first bounded excerpt
- `tail`: last bounded excerpt
- `char_count`: original character count
- `line_count`: original line count when text-like
- `truncated`: whether preview omits middle content

## StorageMode

- `metadata`: no raw content or excerpts
- `preview`: bounded excerpts and derived facts
- `raw`: full normalized artifact content
