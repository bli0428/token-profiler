# Token Profiler

Token Profiler is a local-first observability tool for understanding why agent
sessions consume the tokens they do. It captures prompt artifacts, request
usage, cache attribution, and turn structure so you can drill from a run down
to the specific files, messages, tool calls, and context objects that shaped the
model request.

It is built for people working with Codex and agent harnesses who want answers
to questions like:

- Which artifacts are the biggest token contributors?
- How much of a request was cached versus newly sent?
- Which user turn or assistant action introduced expensive context?
- What did the profiler record locally, and what was intentionally omitted?

Token Profiler stores captured runs locally. See
[Privacy And Trust](docs/privacy-and-trust.md) for capture modes, storage
locations, network behavior, and deletion steps.

> [!NOTE]
> Per-artifact token counts are estimates. Providers own the canonical request
> totals; Token Profiler tokenizes artifacts locally with `o200k_base`, then
> uses provider-reported totals to normalize attribution.

## Project Docs

- [Architecture](docs/architecture.md)
- [Privacy And Trust](docs/privacy-and-trust.md)

## Quick Start

You need Node.js 18 or newer.

```bash
npm install
```

There are two common ways to capture Codex traffic.

### Codex Desktop App

Use this path if you normally start work from the Codex desktop app. It starts
the local profiler services and configures Codex to route model requests through
the local Token Profiler proxy.

> [!WARNING]
> `--configure-codex` changes your user-level Codex
> `~/.codex/config.toml` so Codex sends model requests through the local Token
> Profiler proxy. If the proxy is not running later, Codex model requests can
> fail until you restart the proxy with `node src/cli.js daemon ensure`.
> `node src/cli.js daemon stop` restores normal Codex routing by default.

```bash
scripts/quickstart-dashboard.sh --configure-codex
```

Then restart Codex and begin a new session. Captured runs will appear in the
local dashboard:

http://127.0.0.1:8788

To restore normal Codex routing and stop the profiler services:

```bash
node src/cli.js daemon stop
```

### Codex CLI/TUI

Use this path if you normally start Codex from the terminal and want to profile
one session without changing your user-level Codex config.

```bash
node src/cli.js run codex .
```

This starts or reuses the local profiler proxy and dashboard API, launches Codex
in the target directory, and routes that Codex session through the proxy with
temporary model-provider settings. Captured runs will appear at
http://127.0.0.1:8788

Pass Codex CLI arguments after `--`:

```bash
node src/cli.js run codex . -- --help
```

### Dashboard-Only Development

Run the Vite dev server from `dashboard/` when you want frontend hot reloading
against the local dashboard API:

```bash
cd dashboard
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

## Architecture

The project keeps source-specific capture details separate from analysis and
presentation. See [Architecture](docs/architecture.md) for the contributor guide
and module-boundary rules.

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
