# Adapters

Adapters translate external coding-agent formats into the project's canonical
records.

This folder is the extension point for Codex, Claude Code, OpenAI-compatible
proxies, manual JSONL imports, and future coding-agent sources.

For boundary rules and allowed inputs/outputs, see [contract.md](contract.md).

## Rules

- Adapter-specific payloads stay inside `src/adapters/<adapter>/`.
- Adapters emit canonical records through `src/core/capture` or
  `src/core/events`.
- Adapters declare limitations when a source is partial, missing fields, or
  estimated.
- Core and analysis modules must not import adapter modules.
- Surfaces may call adapters, but surfaces should not parse adapter-specific
  payloads.

## Shape

```text
src/adapters/
  source-adapter.ts
  codex/
    live-proxy/
    log-import/
    index.ts
  fixture-source/
```

The Codex adapter currently owns live proxy capture, Codex config helpers,
session routing, and rollout/log import. A future Claude Code adapter should be
a sibling folder, not a change inside the Codex adapter.

The live proxy exposes `GET /_token_profiler/health` for local lifecycle
checks. Successful responses identify the serving process so CLI daemon state
can be distinguished from a stale or reused PID.

When `--auth` is omitted, CLI launch and daemon commands inspect only Codex's
non-secret `auth_mode` metadata. API-key logins route to the OpenAI API `/v1`
endpoint; ChatGPT logins route to the ChatGPT Codex endpoint. An explicit
`--auth chatgpt|api` value overrides detection.

## Adding Another Coding Agent

Start with a new folder:

```text
src/adapters/claude-code/
```

Then add only the capabilities the source can support, such as log import or
telemetry import. Emit canonical records and limitations; do not add analyzer
logic for that source.
