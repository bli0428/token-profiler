# Research

## Decision: Persist a root-level session catalog

The catalog is a small JSON document keyed by routable run ID and source file fingerprint. Reading it avoids event parsing during the session-list request.

## Decision: Return stat-only fallback while rebuilding

Blocking the first response to scan historical JSONL defeats the feature. Directory and file metadata is sufficient to show the newest sessions until the local rebuild completes.
