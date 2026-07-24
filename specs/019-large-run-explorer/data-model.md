# Data Model: Large Run Explorer

## Run Scan Summary

`run_id`, `event_file_bytes`, `event_count`, `artifact_count`, `request_count`, `input_tokens`, `cached_input_tokens`, `uncached_input_tokens`, `output_tokens`, `latest_timestamp`, and `availability`.

Only canonical usage, turn-identity, and artifact metadata may contribute. Artifact content is never copied into the summary.

## Request Page

`items` are newest-first request rows. Each row owns `request_id`, timestamp, usage when reported, artifact count, local artifact token total, and turn ID when observed. `next_cursor` is an opaque boundary derived from the final row.

## Excluded Detail Projection

Request-scoped artifact pages are not part of this feature. The projection intentionally retains only per-request counts and local-token totals, so it cannot accidentally materialize artifact history while opening a large run.
