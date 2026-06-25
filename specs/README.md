# Token Efficiency Tracker Specs

This directory contains the product roadmap as Spec Kit feature specifications.
The specs are ordered by dependency and intended implementation sequence.

## Spec Map

| Spec | Focus | Depends on |
|---|---|---|
| `001-canonical-event-schema-privacy` | Typed canonical events, storage modes, privacy policy | None |
| `002-source-adapters-capture` | Codex/Claude/OpenAI source adapters and ingestion boundaries | 001 |
| `003-analyzer-pipeline` | Modular analyzers for exposure, cache, replay, and attribution docs | 001 |
| `004-legibility-task-explorer` | Human-readable artifact and task/story grouping | 001, 002, 003 |
| `005-local-dashboard` | Local page for exploring metrics and artifacts | 001, 003, 004 |

## Product Direction

The core product is not a generic LLM trace viewer. It is a local-first tool for
understanding what an agent placed in context, how that context persisted over
time, and which artifacts explain token-heavy sessions. Provider usage totals
are authoritative; local tokenization is used for artifact-level attribution and
must document when artifact attribution is estimated from local tokenizer counts.
