# Privacy And Trust

Token Profiler is designed as a local-first observability tool. It helps you
inspect agent context behavior without turning captured prompt artifacts into a
remote service dependency.

This document explains what the tool captures, where it stores data, and which
trust boundaries still matter.

## Local Data Model

Captured runs are stored as JSONL under:

```text
~/.token-profiler/runs/<run_id>/events.jsonl
```

The daemon also stores local process state and logs under the same root by
default:

```text
~/.token-profiler/proxy-state.json
~/.token-profiler/daemon-state.json
~/.token-profiler/proxy.log
~/.token-profiler/dashboard-api.log
```

Use `--data-dir <path>` on daemon/proxy commands when you want captured data and
logs stored somewhere else.

## Capture Modes

Artifact content is hashed and token-counted before the storage policy is
applied. The stored event then uses one of three storage modes:

- `metadata`: stores canonical artifact facts, hashes, token counts, and
  adapter-provided metadata. It does not store the canonical `content` or
  `preview` fields.
- `preview`: the default mode. Stores metadata plus a bounded preview of the
  artifact content. The preview is at most 800 characters split between the
  beginning and end of the content.
- `raw`: stores metadata plus the full captured artifact content.

Choose the most restrictive mode that still answers the question you are
investigating:

```bash
node src/cli.js daemon ensure --capture-mode metadata
node src/cli.js run codex . --capture-mode metadata
```

Please note that `preview` mode stores plaintext excerpts and `raw` mode stores
full plaintext artifact content under the Token Profiler data directory.

## Network Behavior

Token Profiler runs two local services by default:

- proxy: `http://127.0.0.1:8787`
- dashboard API: `http://127.0.0.1:8788`

The local proxy forwards Codex model requests to the configured upstream
provider. Token Profiler does not make those provider requests private from the
provider; it observes and records the local traffic before forwarding it.

The dashboard API is intended for local use. Do not bind it to a public or
shared network interface unless you have added your own access controls around
it. The built-in local dashboard API is not a multi-user authenticated service.

The project does not include product analytics or external telemetry for Token
Profiler itself.

## Codex Routing Changes

The desktop quickstart can edit your user-level Codex config:

```bash
scripts/quickstart-dashboard.sh --configure-codex
```

That command routes Codex model requests through the local Token Profiler proxy.
If the proxy is not running, Codex requests can fail until routing is restored
or the proxy is started again.

To stop local services and restore normal Codex routing:

```bash
node src/cli.js daemon stop
```

## Deleting Captured Data

Stop local services first:

```bash
node src/cli.js daemon stop
```

Then delete the data directory you used for capture. With the default location,
that is:

```bash
rm -rf ~/.token-profiler
```

Review the path before deleting it, especially if you used `--data-dir`.
