# Quickstart: Source Adapters And Capture Boundaries

## Prerequisites

- Node.js 18 or newer
- Project dependencies installed with `npm install`

## Validate The Plan

```sh
npm run typecheck
npm test
```

Expected outcome:

- TypeScript passes with no emit.
- Existing capture, privacy, proxy, session, and analyzer tests pass.

## Validate Codex Live Capture

Run the proxy tests:

```sh
node --import tsx --test test/proxy.test.js
```

Expected outcome:

- Streaming responses are forwarded unchanged.
- Compressed request body fixtures are observed.
- Tool call and tool output metadata remains paired.
- Captured artifacts honor privacy mode.

## Validate Codex Log Import

Run the Codex import/session tests:

```sh
node --import tsx --test test/codex-sessions.test.js
```

Expected outcome:

- Codex rollout/session metadata is read from source-owned import modules.
- Import behavior is callable through CLI orchestration without CLI-owned parsing.
- Mixed-quality entries are counted or reported without corrupting valid records.

## Validate Future Source Seam

Run the fixture-source seam test:

```sh
node --import tsx --test test/source-adapter-seam.test.js
```

Expected outcome:

- The fixture-only non-Codex source emits canonical records and at least one limitation.
- Existing analyzers consume its output without importing Codex modules.
- No working Claude Code capture or import workflow is required.

## Validate Legacy Module Retirement

Run the architecture-boundary tests:

```sh
node --import tsx --test test/architecture-boundaries.test.js
```

Expected outcome:

- Analyzer modules do not import provider-specific adapter or surface code.
- Legacy source-root compatibility modules do not exist.
- Legacy capture/import/config/session implementation files no longer live at source root.
