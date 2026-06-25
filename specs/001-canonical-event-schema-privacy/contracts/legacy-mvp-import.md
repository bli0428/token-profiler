# Contract: Legacy MVP Import

This document is intentionally separate from `event-records.md`. It is the only
place where older MVP record shapes are accepted.

The new event contract stays strict and clean. Legacy MVP records are handled by
an import/migration adapter that converts old records into the new shape before
analysis.

## Legacy Artifact Event Mapping

Current MVP artifact events may omit `event_kind`. During import:

- Missing `event_kind` maps to `event_kind: "artifact"`.
- `token_count` maps to `local_token_count`.
- Missing `storage_mode` maps to:
  - `"raw"` when `content` is present
  - `"metadata"` otherwise
- Existing `metadata` is preserved.
- Unknown fields are preserved in an implementation-defined legacy namespace or ignored when not needed.

## Legacy Usage Event Mapping

Current MVP usage events already use:

```json
{
  "event_kind": "request_usage"
}
```

These should map directly when required fields are present.

## Boundary

New writers MUST NOT emit legacy field names. New-system readers and analyzers
MUST NOT accept legacy field names directly. Only the legacy import/migration
adapter may accept them.
