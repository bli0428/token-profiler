# Token Profiler

Ever wonder why certain sessions are consuming so many tokens?

This tool is meant to over the ability to drill down to the individual artifacts to understand which specific tool calls are the biggest offenders.

*Important note:

This tool can only offer an estimation for artifacts, only OpenAI has the true canonical numbers - however, we can get a pretty good estimate by
tokenizing each artifact locally, then normalizing based on the final count.

Artifact text is counted locally with the `o200k_base` tokenizer.

## Quick Start

### Codex Desktop App

Use this path if you normally open the Codex desktop app.

> [!WARNING]
> `--configure-codex` changes your user-level Codex
> `~/.codex/config.toml` so Codex sends model requests through the local Token
> Profiler proxy. If the proxy is not running later, Codex model requests can
> fail until you restart the proxy with `node src/cli.js daemon ensure`.
> `node src/cli.js daemon stop` restores normal Codex routing by default.

```bash
scripts/quickstart-dashboard.sh --configure-codex
```

Captured runs will show up at http://127.0.0.1:8788

**Restart Codex before starting a new monitored session.**

### Codex CLI/TUI

Use this path if you normally start Codex from the terminal and want one
profiled session:

```bash
node src/cli.js run codex .
```

This starts or reuses the local profiler proxy and dashboard API, launches Codex
in the target directory, and routes that Codex session through the proxy with
temporary model-provider settings. Captured runs will show up at
http://127.0.0.1:8788

Pass Codex CLI arguments after `--`:

```bash
node src/cli.js run codex . -- --help
```


### To disable the proxy:

```bash
node src/cli.js daemon stop
```
This will also revert the config.toml to it's state before configuring the proxy.



### If you are trying to develop on this project
Run the Vite dev server from `dashboard/` for hot reloading:

```bash
cd dashboard
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

## Architecture

The project keeps source-specific capture details separate from analysis and
presentation:

```text
Adapters -> Canonical Store -> Analyzers -> Surfaces
```

- **Adapters** capture provider-specific payloads and map them into canonical
  records.
- **Canonical Store** persists JSONL facts under local run directories.
- **Analyzers** derive exposure, replay, cache attribution, legibility, task
  groups, and turn hierarchy from canonical records only.
- **Surfaces** render analyzer/API outputs through CLI reports, the dashboard
  API, and the React dashboard.

Provider-specific payloads stop at adapters. Dashboard code consumes API-owned
view models and does not reconstruct analyzer logic or parse raw Codex metadata.



## Agent Integration

Below is example code for using this project's tracking functionality in your
own agent or prompt-building harness.

```js
import { TokenProfiler } from "./src/index.js";

const profiler = new TokenProfiler({ runId: "run_123" });

const prompt = [
  profiler.track({
    requestId: "req_001",
    artifactType: "SYSTEM_PROMPT",
    artifactName: "system",
    content: systemPrompt
  }),
  profiler.track({
    requestId: "req_001",
    artifactType: "FILE",
    artifactName: "src/auth.js",
    content: authFile
  })
];

// Send `prompt` to the model normally.
await profiler.flush();
```

`track()` returns the original content unchanged, so instrumentation does not change agent behavior.

## Event Shape

Events are stored as JSONL in `~/.token-profiler/runs/<run_id>/events.jsonl`.
Captured runs use canonical event records. Readers and analyzers reject older
MVP artifact field names rather than treating legacy payloads as shared
contracts.

Canonical event kinds currently include:

- `artifact`: one captured prompt artifact inclusion.
- `request_usage`: provider-reported request token usage.
- `request_turn_identity`: request-to-turn identity extracted by the Codex
  adapter.

```json
{
  "schema_version": 1,
  "event_kind": "artifact",
  "run_id": "run_123",
  "request_id": "req_001",
  "artifact_id": "FILE:src/auth.js",
  "artifact_type": "FILE",
  "artifact_name": "src/auth.js",
  "content_hash": "sha256...",
  "local_token_count": 9134,
  "tokenizer": "o200k_base",
  "timestamp": "2026-06-23T14:10:00.000Z",
  "storage_mode": "metadata",
  "metadata": {}
}
```

Artifact metadata is intentionally structured and extensible. Known fields such
as `display_name`, `tool_name`, `content_kind`, `command`, `workdir`,
`touched_files`, and patch counters make reports readable; unknown metadata
fields are preserved for future analyzers and ignored by reports that do not
understand them.

Provider usage is recorded separately from artifact exposure so exact request
totals and estimated per-artifact attribution are not double-counted:

```json
{
  "schema_version": 1,
  "event_kind": "request_usage",
  "run_id": "run_123",
  "request_id": "req_001",
  "response_id": "resp_001",
  "input_tokens": 12000,
  "cached_input_tokens": 8000,
  "uncached_input_tokens": 4000,
  "output_tokens": 900,
  "reasoning_tokens": 300,
  "total_tokens": 13200,
  "timestamp": "2026-06-23T14:10:05.000Z"
}
```

Turn identity is a canonical request-level fact. Source-specific Codex metadata
is mapped by the adapter before it reaches analyzers or dashboard surfaces:

```json
{
  "schema_version": 1,
  "event_kind": "request_turn_identity",
  "run_id": "run_123",
  "request_id": "req_001",
  "turn_id": "turn_abc",
  "turn_identity_source": "direct_turn_id",
  "turn_started_at": "2026-06-23T14:10:00.000Z",
  "caveats": [],
  "timestamp": "2026-06-23T14:10:00.000Z"
}
```


## Upcoming features:
- The CLI version right now still conforms to previously poorly thought-out and inaccurate commands
- Pretty graphs/charts
- The estimations still are not as good as they could be - there needs to be some more edge cases for special types of Codex messages
- Claude adapter
- Setting up the proxy to autostart - right now this needs to be run every time before codex is opened
