# Surfaces API Contract

Surfaces are the public APIs for presenting analyzer output. They may format,
serve, or export analysis results, but they do not own canonical facts or
analyzer logic.

## CLI Surface

The executable entry point is `src/surfaces/cli/index.ts`.

- The CLI dispatches commands such as `demo`, `record`, `watch`, `run`,
  `codex-import`, `proxy`, `daemon`, `codex`, `setup`, `summarize`,
  `legibility`, `explain`, `dashboard-api`, and `sessions`.
- Command implementation modules under `src/surfaces/cli/` are CLI-owned
  orchestration helpers. They are not domain APIs for other layers unless a
  function is deliberately promoted into this contract.

## Dashboard API Surface

The dashboard API contract lives in
`src/surfaces/dashboard-api/contract.md`.

Use that contract for HTTP response types, route handling, view-model mapping,
and server startup APIs.

## Invariants

- Surface inputs must be analyzer results or surface-owned view models derived
  from analyzer results.
- Surface code must not parse provider payloads or derive new canonical facts.
- Public surface types should be explicit and mapped by field name.
