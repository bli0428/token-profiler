# Token Profiler

A small MVP for measuring what an agent sends to a model.

Instead of trying to infer what the model used, this tracks **context exposure**:

- which artifacts were included in each model request
- how many prompt tokens they contributed
- how often identical content was replayed
- which artifacts dominate the prompt budget

Artifact text is counted locally with the `o200k_base` tokenizer.
Local artifact attribution is estimated based on local tokenizer counts.

## Quick Start

```bash
npm test
npm run demo
node src/cli.js summarize ~/.token-profiler/runs/demo
```

The interactive dashboard is a separate local app backed by the read-only
dashboard API. Start the API from the repository root:

```bash
node src/cli.js dashboard-api serve --port 8788 --origin http://127.0.0.1:5173
```

Then start the frontend from `dashboard/`:

```bash
cd dashboard
VITE_DASHBOARD_API_BASE_URL=http://127.0.0.1:8788 npm run dev -- --host 127.0.0.1 --port 5173
```

Refresh dashboard API-real contract fixtures from `dashboard/` after starting
the API with safe fixture data:

```bash
npm run fixtures:capture -- --api http://127.0.0.1:8788 --run-id <run-id> --artifact-id <artifact-id>
npm run test:contracts
```

## Agent Integration

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

## Codex Harness Usage

Codex's own hidden prompt assembly is not exposed directly to workspace code. Without the local proxy, there are still three useful harness patterns:

1. Use `watch` to record file snapshots as the workspace changes.
2. Use `run` to capture command output, test logs, and build logs without manual copy/paste.
3. Use `codex-import` to import exact token usage events from Codex rollout JSONL files.

From another project:

```bash
cd /path/to/personal-secretary-web
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js watch \
  --run secretary-session-001 \
  src app package.json
```

In a second terminal, wrap commands you want captured:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js run \
  --run secretary-session-001 \
  --name npm-test \
  -- npm test
```

Then summarize:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js summarize \
  ~/.token-profiler/runs/secretary-session-001
```

For exact prompt exposure, attach the `TokenProfiler` API to code that assembles prompts or calls the OpenAI API.

## Local Codex Proxy

The local proxy observes the JSON request body Codex sends to the Responses API, records prompt artifacts, and streams the upstream response back unchanged. It listens on loopback only and stores bounded previews by default, not full raw prompt content.

Each `codex run` invocation receives a unique session ID automatically. A reused background proxy routes events into separate session directories using the wrapper header, Codex conversation/cache identifiers, or a short-lived prompt fingerprint fallback. List recent sessions with:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js sessions
```

When available, `sessions` also reads Codex's local `~/.codex/session_index.jsonl`
and rollout logs to show the Codex thread title or first user prompt next to the
profiler run ID:

```text
2026-06-23T23:03:20.318Z  secretary-proxy-test  Inspect package.json and briefly describe this project.  [codex:019e...]
```

Use `--no-codex` to list only profiler IDs, or `--codex-home <path>` if your
Codex home directory is not `~/.codex`.

For a one-off profiled Codex task, use the wrapper. It starts or reuses the correct proxy and supplies the provider configuration automatically:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js codex run \
  --cwd /path/to/project \
  -- "Inspect package.json and briefly describe this project."
```

Completed Responses API streams are inspected for `input_tokens_details.cached_tokens`. Reports show exact input, cached, and uncached token totals plus the cache hit ratio; usage events are kept separate from local artifact exposure so they are not double-counted.

Newly captured proxy events also store each artifact's order plus reconstructed
`token_start` and `token_end` offsets for the request. The report overlays the
request-level cached-token prefix onto those offsets to produce estimated cost
drivers. When the reconstructed artifact text is longer than the provider's
reported `input_tokens`, the cache attribution is scaled down to the actual
input-token total before uncached tokens are assigned:

```text
Estimated Cost Drivers
Artifact       Type        Est. Uncached   Exposure   Est. Cache Hit
build.log      ERROR_LOG   140,000         240,000    41.7%

Context Bloat
Artifact       Type        Exposure        Replay     Replay Ratio
repo_map       REPO_MAP    300,000         280,000    93.3%
```

These per-artifact cache numbers are estimates based on the reconstructed prompt
order and reconciled to exact request-level usage. Older events that were
captured before offset tracking show `0%` attribution coverage.

## Legibility And Task Explorer

Analyzer results also include a legibility layer that turns opaque work-unit
IDs into readable artifact rows for supported commands, command outputs,
patches, messages, file/context items, and unknown records. Use:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js legibility \
  ~/.token-profiler/runs/codex-live
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js explain \
  ~/.token-profiler/runs/codex-live --artifact <artifact-id-or-label>
```

`legibility` shows readable artifact rows, stable IDs, preview state, and tool
link caveats. `explain` drills into one artifact with command or patch facts,
first/last inclusion evidence, privacy state, and attribution caveats.

The normal summary report now includes task groups when request/user-intent
boundaries are available. Task groups roll up exposure, replay, usage, top
artifacts, and grouping confidence. Metadata-only runs use safe fallback labels
and never require raw prompt or tool-output content.

The local dashboard API and isolated frontend consume those same analyzer
outputs. They provide overview metric cards, artifact filtering, task-group
navigation, artifact details, and privacy indicators without parsing provider
payloads or recalculating analyzer metrics in the browser. Hidden raw content is
not embedded in dashboard API payloads.

Start it in the background:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js proxy start \
  --auth chatgpt
```

Check or stop it later:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js proxy status
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js proxy stop
```

Generate a report from the proxy run:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js summarize \
  ~/.token-profiler/runs/codex-live
```

Enable routing in the user-level Codex configuration:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js codex enable
```

Restart Codex and begin a new session. Provider routing must be configured at user level, so this command adds a `token-profiler` model provider to `~/.codex/config.toml`. It remembers the previous provider in a neighboring state file and can restore it with:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js codex disable
```

To set up both Codex routing and local service autostart in one step on macOS:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js setup codex \
  --auth chatgpt \
  --autostart
```

This enables the `token-profiler` Codex model provider, installs a user
LaunchAgent that runs `daemon ensure` at login, and starts the local proxy plus
dashboard API for the current session. You can manage both local services
together with:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js daemon status
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js daemon stop
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js daemon ensure
```

The proxy sees authorization headers only long enough to forward the request. It never records them. The default capture mode is `preview`, which records bounded excerpts without full raw prompt text. Use `--capture-mode metadata` for operational facts only or `--capture-mode raw` when you intentionally want full prompt text included in the local event log.

ChatGPT authentication is the default mode and forwards to the Codex account endpoint. Use `--auth api` on both `proxy start` and `codex enable` when Codex is logged in with an API key. The managed provider uses HTTP streaming so every request passes through the profiler without WebSocket retry delays.

## Codex Token Import

Codex stores local rollout JSONL files under `~/.codex/sessions/...` and tracks per-request token usage in `token_count` events. Import one of those files:

```bash
node /Users/brandonli/Documents/TokenEfficiencyTracker/src/cli.js codex-import \
  ~/.codex/sessions/2026/06/23/rollout-example.jsonl \
  --run codex-session-001
```

This imports exact input-token usage for each Codex model request, with cached input, output, reasoning output, and total tokens stored as event metadata.

This is useful for thread-level and request-level usage, but it still does not attribute prompt tokens back to individual files. For that, use a model proxy or an agent integration that can see the assembled request body.

## Metrics

- **Total Exposure**: all prompt tokens sent across the run
- **Unique Exposure**: first-seen token cost for each exact content hash
- **Repeated Exposure**: tokens spent resending already-seen content
- **Replay Ratio**: repeated exposure divided by total exposure
- **Context Efficiency**: unique exposure divided by total exposure

## Event Shape

Events are stored as JSONL in `~/.token-profiler/runs/<run_id>/events.jsonl`.

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

Captured runs use the strict event shape above. Readers and analyzers expect
canonical records and reject older MVP artifact field names.

Artifact metadata is intentionally structured and extensible. Known fields such
as `display_name`, `tool_name`, `content_kind`, `command`, `workdir`,
`touched_files`, and patch counters make reports readable; unknown metadata
fields are preserved for future analyzers and ignored by reports that do not
understand them.
