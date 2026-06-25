# Contract: Event Records

This contract describes the new-system persisted event shapes for spec 001.

## Artifact Event

Required fields:

```json
{
  "schema_version": 1,
  "event_kind": "artifact",
  "run_id": "run_123",
  "request_id": "req_001",
  "artifact_id": "TOOL_OUTPUT:call_abc",
  "artifact_type": "TOOL_OUTPUT",
  "artifact_name": "exec_command output: npm test",
  "content_hash": "sha256...",
  "local_token_count": 1234,
  "tokenizer": "o200k_base",
  "timestamp": "2026-06-25T12:00:00.000Z",
  "storage_mode": "metadata",
  "metadata": {}
}
```

Optional fields:

```json
{
  "artifact_index": 5,
  "token_start": 100,
  "token_end": 1334,
  "preview": {},
  "content": "only when storage_mode is raw"
}
```

## Request Usage Event

```json
{
  "schema_version": 1,
  "event_kind": "request_usage",
  "run_id": "run_123",
  "request_id": "req_001",
  "response_id": "resp_123",
  "input_tokens": 1000,
  "cached_input_tokens": 800,
  "uncached_input_tokens": 200,
  "output_tokens": 50,
  "total_tokens": 1050,
  "timestamp": "2026-06-25T12:00:01.000Z"
}
```

## Storage Mode Rules

- `metadata`: MUST NOT include `content` or `preview`.
- `preview`: MUST include `preview`; MUST NOT include `content`.
- `raw`: MUST include `content`; MAY include `preview` for convenience.

## New-System Rules

- `event_kind` is required.
- `local_token_count` is required for artifact events.
- `storage_mode` is required for artifact events.
- Unknown metadata fields are preserved.
