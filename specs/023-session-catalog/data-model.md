# Data Model

## Catalog

`schema_version`, `generated_at`, and `sessions`.

Each session stores the existing dashboard session summary, including its
resolved display label, plus `source_bytes` and `source_mtime_ms`. A matching
fingerprint is current; all other entries are stale.
