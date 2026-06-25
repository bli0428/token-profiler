#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, statSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { aggregateEvents } from "./aggregate.js";
import { disableCodexProxyConfig, enableCodexProxyConfig } from "./codex-config.js";
import { enrichProfilerSessions, readCodexSessionMetadata } from "./codex-sessions.js";
import { sha256 } from "./hash.js";
import { createHtmlReport } from "./html-report.js";
import { formatArtifactDetail, formatLegibilityReport } from "./legibility.js";
import { TokenProfiler } from "./profiler.js";
import { createProfilerProxy } from "./proxy.js";
import { formatSummary } from "./report.js";
import { createSessionId, SessionRouter, sanitizeSessionId } from "./session-router.js";
import { readEventsFromRunDir } from "./store.js";

const [, , command = "help", ...args] = process.argv;

try {
  if (command === "demo") {
    await runDemo();
  } else if (command === "record") {
    await runRecord(args);
  } else if (command === "watch") {
    await runWatch(args);
  } else if (command === "run") {
    await runCommand(args);
  } else if (command === "codex-import") {
    await runCodexImport(args);
  } else if (command === "proxy") {
    await runProxy(args);
  } else if (command === "codex") {
    await runCodexConfig(args);
  } else if (command === "summarize") {
    await runSummarize(args);
  } else if (command === "legibility") {
    await runLegibility(args);
  } else if (command === "explain") {
    await runExplain(args);
  } else if (command === "html") {
    await runHtml(args);
  } else if (command === "sessions") {
    await runSessions(args);
  } else {
    printHelp();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function runDemo() {
  const profiler = new TokenProfiler({ runId: "demo" });
  await mkdir(".token-profiler/runs/demo", { recursive: true });
  await writeFile(".token-profiler/runs/demo/events.jsonl", "");

  const system = "You are a coding agent. Be concise, careful, and useful.";
  const repoMap = ["src/auth.js", "src/server.js", "src/db.js"].join("\n");
  const authFile = "export function authenticate(user, password) { return Boolean(user && password); }\n";
  const buildLog = "warning: dependency cache missed\n".repeat(240);

  await profiler.recordAsync({
    requestId: "req_001",
    artifactType: "SYSTEM_PROMPT",
    artifactName: "system",
    content: system
  });
  await profiler.recordAsync({
    requestId: "req_001",
    artifactType: "REPO_MAP",
    artifactName: "repo_map",
    content: repoMap
  });
  await profiler.recordAsync({
    requestId: "req_001",
    artifactType: "FILE",
    artifactName: "src/auth.js",
    content: authFile
  });
  await profiler.recordAsync({
    requestId: "req_002",
    artifactType: "REPO_MAP",
    artifactName: "repo_map",
    content: repoMap
  });
  await profiler.recordAsync({
    requestId: "req_002",
    artifactType: "FILE",
    artifactName: "src/auth.js",
    content: authFile
  });
  await profiler.recordAsync({
    requestId: "req_002",
    artifactType: "TEST_OUTPUT",
    artifactName: "build.log",
    content: buildLog
  });
  await profiler.recordAsync({
    requestId: "req_003",
    artifactType: "TEST_OUTPUT",
    artifactName: "build.log",
    content: buildLog
  });

  console.log("Wrote demo events to .token-profiler/runs/demo/events.jsonl");
}

async function runRecord(args) {
  const options = parseOptions(args);
  const runId = required(options, "run");
  const requestId = required(options, "request");
  const artifactType = required(options, "type");
  const artifactName = required(options, "name");
  const content = options.content
    ? await readFile(resolve(options.content), "utf8")
    : required(options, "text");

  const profiler = new TokenProfiler({ runId });
  const event = await profiler.recordAsync({
    requestId,
    artifactType,
    artifactName,
    artifactId: options.id,
    content
  });

  console.log(JSON.stringify(event, null, 2));
}

async function runWatch(args) {
  const options = parseOptions(args);
  const runId = required(options, "run");
  const intervalMs = Number(options.interval ?? 2000);
  const root = resolve(options.cwd ?? process.cwd());
  const paths = positionalArgs(args).map((path) => resolve(root, path));
  const targets = paths.length > 0 ? paths : [root];
  const profiler = new TokenProfiler({ runId });
  const known = new Map();

  console.log(`Watching ${targets.map((target) => relative(root, target) || ".").join(", ")}`);
  console.log(`Writing events to .token-profiler/runs/${runId}/events.jsonl`);

  const scan = async () => {
    const files = await listFiles(targets, root);

    for (const file of files) {
      let stat;

      try {
        stat = statSync(file);
      } catch {
        continue;
      }

      const previous = known.get(file);
      const signature = `${stat.mtimeMs}:${stat.size}`;

      if (previous === signature) {
        continue;
      }

      known.set(file, signature);

      const content = await readFile(file, "utf8").catch(() => null);

      if (content === null) {
        continue;
      }

      const artifactName = relative(root, file);
      const requestId = `watch_${new Date().toISOString()}`;
      const event = await profiler.recordAsync({
        requestId,
        artifactType: "FILE",
        artifactName,
        content
      });

      console.log(`recorded FILE ${artifactName} (${event.token_count} tokens)`);
    }
  };

  await scan();
  const timer = setInterval(() => {
    scan().catch((error) => console.error(error.message));
  }, intervalMs);

  const stop = async () => {
    clearInterval(timer);
    await profiler.flush();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

async function runCommand(args) {
  const separatorIndex = args.indexOf("--");

  if (separatorIndex === -1) {
    throw new Error("Use: run --run <id> --name <artifact-name> -- <command> [args...]");
  }

  const optionArgs = args.slice(0, separatorIndex);
  const commandArgs = args.slice(separatorIndex + 1);
  const options = parseOptions(optionArgs);
  const runId = required(options, "run");
  const artifactName = options.name ?? commandArgs.join(" ");
  const artifactType = options.type ?? "TOOL_OUTPUT";
  const requestId = options.request ?? `cmd_${new Date().toISOString()}`;

  if (commandArgs.length === 0) {
    throw new Error("Missing command after --");
  }

  const child = spawn(commandArgs[0], commandArgs.slice(1), {
    cwd: options.cwd ?? process.cwd(),
    stdio: ["inherit", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolveExit) => {
    child.on("close", resolveExit);
  });

  const profiler = new TokenProfiler({ runId });
  const output = [stdout, stderr].filter(Boolean).join("\n");

  if (output.length > 0) {
    await profiler.recordAsync({
      requestId,
      artifactType,
      artifactName,
      content: output
    });
  }

  process.exitCode = exitCode;
}

async function runCodexImport(args) {
  const options = parseOptions(args);
  const rolloutPath = positionalArgs(args)[0];

  if (!rolloutPath) {
    throw new Error("Use: codex-import <rollout.jsonl> --run <id>");
  }

  const runId = required(options, "run");
  const profiler = new TokenProfiler({ runId });
  const raw = await readFile(resolve(rolloutPath), "utf8");
  const lines = raw.split("\n").filter(Boolean);
  let imported = 0;

  for (const line of lines) {
    const entry = JSON.parse(line);

    if (entry.type !== "event_msg" || entry.payload?.type !== "token_count") {
      continue;
    }

    const usage = entry.payload.info?.last_token_usage;

    if (!usage) {
      continue;
    }

    imported += 1;

    await profiler.store.append({
      schema_version: 1,
      run_id: runId,
      request_id: `codex_request_${String(imported).padStart(4, "0")}`,
      artifact_id: `CODEX_USAGE:codex_request_${String(imported).padStart(4, "0")}`,
      artifact_type: "CODEX_USAGE",
      artifact_name: `codex_request_${String(imported).padStart(4, "0")}`,
      content_hash: sha256(JSON.stringify({ timestamp: entry.timestamp, usage })),
      token_count: Number(usage.input_tokens) || 0,
      timestamp: entry.timestamp,
      metadata: {
        cached_input_tokens: Number(usage.cached_input_tokens) || 0,
        output_tokens: Number(usage.output_tokens) || 0,
        reasoning_output_tokens: Number(usage.reasoning_output_tokens) || 0,
        total_tokens: Number(usage.total_tokens) || 0
      }
    });
  }

  console.log(`Imported ${imported} Codex token usage events.`);
}

async function runProxy(args) {
  const [action = "start", ...optionArgs] = args;
  const options = parseOptions(optionArgs);
  const authMode = options.auth ?? "chatgpt";
  if (!["chatgpt", "api"].includes(authMode)) {
    throw new Error("--auth must be chatgpt or api.");
  }
  const runId = options.run ? sanitizeSessionId(options.run) : null;
  const rootDir = resolve(options["data-dir"] ?? join(homedir(), ".token-efficiency"));
  const upstream = options.upstream ?? (authMode === "chatgpt"
    ? "https://chatgpt.com/backend-api/codex"
    : "https://api.openai.com");
  const host = options.host ?? "127.0.0.1";
  const port = Number(options.port ?? 8787);
  const statePath = join(rootDir, "proxy-state.json");

  if (action === "start") {
    await startProxyDaemon({ optionArgs, rootDir, statePath, runId, upstream, host, port });
    return;
  }

  if (action === "stop") {
    const state = await readProxyState(statePath);
    if (!isProcessRunning(state.pid)) {
      await rm(statePath, { force: true });
      console.log("Token profiler proxy is not running.");
      return;
    }
    process.kill(state.pid, "SIGTERM");
    const stopped = await waitFor(() => !isProcessRunning(state.pid), 3000);
    if (!stopped) throw new Error(`Proxy process ${state.pid} did not stop within 3 seconds.`);
    await rm(statePath, { force: true });
    console.log("Stopped token profiler proxy.");
    return;
  }

  if (action === "status") {
    const state = await readProxyState(statePath, false);
    if (!state || !isProcessRunning(state.pid)) {
      console.log("Token profiler proxy is not running.");
      return;
    }
    console.log(`Token profiler proxy is running (pid ${state.pid}).`);
    console.log(`Listening on http://${state.host}:${state.port}`);
    console.log(state.run_id ? `Fallback session: ${state.run_id}` : "Automatic session IDs are enabled.");
    return;
  }

  if (action !== "serve") {
    throw new Error("Use: proxy start|stop|status [--auth chatgpt|api] [--run <id>] [--upstream <url>] [--port <port>]");
  }

  const sessionRouter = new SessionRouter({
    rootDir,
    storeContent: Boolean(options["store-content"]),
    fallbackSessionId: runId
  });
  const proxy = createProfilerProxy({ sessionRouter, upstream, host, port });

  await proxy.listen();
  console.log(`Token profiler proxy listening on http://${host}:${port}`);
  console.log(`Forwarding to ${upstream}`);
  console.log(`Writing sessions under ${join(rootDir, "runs")}`);
  console.log(runId ? `Fallback session: ${runId}` : "Automatic session IDs are enabled.");
  console.log(options["store-content"] ? "Raw content storage is ENABLED." : "Raw content storage is disabled.");

  const stop = async () => {
    console.log("\nStopping proxy...");
    await proxy.close();
    await rm(statePath, { force: true });
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

async function startProxyDaemon({ optionArgs, rootDir, statePath, runId, upstream, host, port }) {
  const existing = await readProxyState(statePath, false);
  if (existing && isProcessRunning(existing.pid)) {
    throw new Error(`Token profiler proxy is already running (pid ${existing.pid}).`);
  }

  await mkdir(rootDir, { recursive: true });
  const logPath = join(rootDir, "proxy.log");
  const logFd = openSync(logPath, "a");
  const child = spawn(process.execPath, [process.argv[1], "proxy", "serve", ...optionArgs], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    cwd: process.cwd()
  });
  closeSync(logFd);
  child.unref();

  const state = {
    schema_version: 2,
    pid: child.pid,
    host,
    port,
    upstream,
    run_id: runId,
    log_path: logPath,
    started_at: new Date().toISOString()
  };
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

  const ready = await waitFor(async () => {
    if (!isProcessRunning(child.pid)) return false;
    try {
      const response = await fetch(`http://${host}:${port}/_token_profiler/health`);
      return response.ok;
    } catch {
      return false;
    }
  }, 3000);

  if (!ready) {
    await rm(statePath, { force: true });
    throw new Error(`Proxy did not start. Check ${logPath}`);
  }

  console.log(`Started token profiler proxy (pid ${child.pid}) on http://${host}:${port}`);
  console.log(`Writing sessions under ${join(rootDir, "runs")}`);
}

async function readProxyState(statePath, required = true) {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && !required) return null;
    if (error.code === "ENOENT") throw new Error("Token profiler proxy is not running.");
    throw error;
  }
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await predicate()) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  } while (Date.now() < deadline);
  return false;
}

async function runCodexConfig(args) {
  const [action, ...optionArgs] = args;

  if (action === "run") {
    await runCodexThroughProxy(optionArgs);
    return;
  }

  const options = parseOptions(optionArgs);
  const configPath = resolve(options.config ?? join(homedir(), ".codex", "config.toml"));
  const statePath = `${configPath}.token-efficiency-state.json`;

  if (action === "enable") {
    const authMode = options.auth ?? "chatgpt";
    if (!["chatgpt", "api"].includes(authMode)) {
      throw new Error("--auth must be chatgpt or api.");
    }
    const proxyUrl = options.url ?? (authMode === "chatgpt"
      ? "http://127.0.0.1:8787"
      : "http://127.0.0.1:8787/v1");
    const current = await readFile(configPath, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    const previousState = await readFile(statePath, "utf8")
      .then(JSON.parse)
      .catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });

    if (previousState?.managed_line && current.includes(previousState.managed_line)) {
      console.log(`Token profiler proxy is already enabled in ${configPath}`);
      return;
    }

    const update = enableCodexProxyConfig(current, proxyUrl);

    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, update.config, "utf8");
    await writeFile(statePath, JSON.stringify(update.state, null, 2), "utf8");
    console.log(`Enabled token profiler proxy in ${configPath}`);
    console.log("Restart Codex before starting a new monitored session.");
    return;
  }

  if (action === "disable") {
    const current = await readFile(configPath, "utf8");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    const restored = disableCodexProxyConfig(current, state);

    await writeFile(configPath, restored, "utf8");
    console.log(`Disabled token profiler proxy in ${configPath}`);
    console.log("Restart Codex to restore direct requests.");
    return;
  }

  throw new Error("Use: codex enable [--url <proxy-url>] | codex disable");
}

async function runCodexThroughProxy(args) {
  const separatorIndex = args.indexOf("--");
  if (separatorIndex === -1 || separatorIndex === args.length - 1) {
    throw new Error("Use: codex run [--cwd <path>] [--run <id>] -- <prompt>");
  }

  const options = parseOptions(args.slice(0, separatorIndex));
  const promptArgs = args.slice(separatorIndex + 1);
  const authMode = options.auth ?? "chatgpt";
  if (!["chatgpt", "api"].includes(authMode)) {
    throw new Error("--auth must be chatgpt or api.");
  }

  const runId = sanitizeSessionId(options.run ?? createSessionId());
  const rootDir = resolve(options["data-dir"] ?? join(homedir(), ".token-efficiency"));
  const statePath = join(rootDir, "proxy-state.json");
  const upstream = authMode === "chatgpt"
    ? "https://chatgpt.com/backend-api/codex"
    : "https://api.openai.com";
  const port = Number(options.port ?? 8787);
  const host = "127.0.0.1";
  const existing = await readProxyState(statePath, false);

  if (existing && isProcessRunning(existing.pid)) {
    if (existing.upstream !== upstream || Number(existing.port) !== port) {
      throw new Error("A profiler proxy is already running with different settings. Stop it first.");
    }
  } else {
    const proxyArgs = ["--auth", authMode, "--port", String(port)];
    if (options["data-dir"]) proxyArgs.push("--data-dir", options["data-dir"]);
    if (options["store-content"]) proxyArgs.push("--store-content");
    await startProxyDaemon({
      optionArgs: proxyArgs,
      rootDir,
      statePath,
      runId,
      upstream,
      host,
      port
    });
  }

  const proxyUrl = authMode === "chatgpt"
    ? `http://${host}:${port}`
    : `http://${host}:${port}/v1`;
  const codexPath = options.codex ?? "/Applications/Codex.app/Contents/Resources/codex";
  const codexArgs = [
    "-c", 'model_provider="token-profiler"',
    "-c", 'model_providers.token-profiler.name="Token Profiler"',
    "-c", `model_providers.token-profiler.base_url=${JSON.stringify(proxyUrl)}`,
    "-c", 'model_providers.token-profiler.wire_api="responses"',
    "-c", "model_providers.token-profiler.requires_openai_auth=true",
    "-c", "model_providers.token-profiler.supports_websockets=false",
    "-c", `model_providers.token-profiler.http_headers={"x-token-profiler-session"=${JSON.stringify(runId)}}`,
    "exec",
    ...promptArgs
  ];
  const child = spawn(codexPath, codexArgs, {
    cwd: resolve(options.cwd ?? process.cwd()),
    stdio: "inherit"
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("close", resolveExit);
  });
  console.log(`\nProfiler session: ${runId}`);
  console.log(`Report: node ${process.argv[1]} summarize ${join(rootDir, "runs", runId)}`);
  process.exitCode = exitCode;
}

async function runSessions(args) {
  const options = parseOptions(args);
  const rootDir = resolve(options["data-dir"] ?? join(homedir(), ".token-efficiency"));
  const codexHome = resolve(options["codex-home"] ?? join(homedir(), ".codex"));
  const runsDir = join(rootDir, "runs");
  const entries = await readdir(runsDir, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  let sessions = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const eventsPath = join(runsDir, entry.name, "events.jsonl");
      const stat = statSync(eventsPath, { throwIfNoEntry: false });
      return stat ? { id: entry.name, updatedAt: stat.mtime } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, Number(options.limit ?? 20));

  if (!options["no-codex"]) {
    try {
      const codexMetadata = await readCodexSessionMetadata({ codexHome });
      sessions = enrichProfilerSessions(sessions, codexMetadata);
    } catch (error) {
      console.warn(`Warning: could not read Codex session metadata: ${error.message}`);
    }
  }

  if (sessions.length === 0) {
    console.log("No profiler sessions found.");
    return;
  }

  for (const session of sessions) {
    console.log(`${session.updatedAt.toISOString()}  ${session.id}${formatCodexSessionLabel(session.codex)}`);
  }
}

function formatCodexSessionLabel(codex) {
  if (!codex) return "";
  const title = codex.threadName ? `  ${codex.threadName}` : "";
  const detail = codex.sessionId ? `  [codex:${codex.sessionId}]` : "";
  return `${title}${detail}`;
}

async function runSummarize(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const events = await readEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(formatSummary(summary));
}

async function runLegibility(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const events = await readEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  console.log(formatLegibilityReport(summary, {
    limit: Number(options.limit ?? 20)
  }));
}

async function runExplain(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const artifact = options.artifact ?? positionalArgs(args).find((arg) => arg !== runDir);
  if (!artifact) {
    throw new Error("Use: explain [run_dir] --artifact <artifact-name-or-id>");
  }

  const events = await readEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);
  console.log(formatArtifactDetail(summary, artifact));
}

async function runHtml(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const out = options.out ?? `${runDir}/report.html`;
  const events = await readEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  await mkdir(dirname(out), { recursive: true });
  await createHtmlReport(summary, out);
  console.log(`Wrote ${out}`);
}

function parseOptions(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }

  return options;
}

function positionalArgs(args) {
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const next = args[index + 1];

    if (next && !next.startsWith("--")) {
      index += 1;
    }
  }

  return positional;
}

async function listFiles(targets, root) {
  const files = [];

  for (const target of targets) {
    await collectFiles(target, root, files);
  }

  return files;
}

async function collectFiles(target, root, files) {
  if (shouldIgnore(target, root) || !existsSync(target)) {
    return;
  }

  const stat = statSync(target);

  if (stat.isFile()) {
    files.push(target);
    return;
  }

  if (!stat.isDirectory()) {
    return;
  }

  const entries = await readdir(target, { withFileTypes: true });

  for (const entry of entries) {
    await collectFiles(join(target, entry.name), root, files);
  }
}

function shouldIgnore(target, root) {
  const path = relative(root, target);
  const parts = path.split(/[\\/]/);
  return parts.some((part) =>
    [
      ".git",
      ".token-profiler",
      "node_modules",
      ".next",
      "dist",
      "build",
      "coverage"
    ].includes(part)
  );
}

function required(options, key) {
  if (!options[key]) {
    throw new Error(`Missing --${key}`);
  }

  return options[key];
}

function printHelp() {
  console.log(`Token Efficiency Tracker

Commands:
  demo
    Write sample events to .token-profiler/runs/demo/events.jsonl

  record --run <id> --request <id> --type <type> --name <name> (--content <path> | --text <text>)
    Record one artifact inclusion.

  watch --run <id> [paths...] [--cwd <path>] [--interval <ms>]
    Actively record FILE snapshots when watched files change.

  run --run <id> [--request <id>] [--type TOOL_OUTPUT] [--name <name>] -- <command> [args...]
    Run a command and record its stdout/stderr as one artifact.

  codex-import <rollout.jsonl> --run <id>
    Import exact Codex token_count events from a local rollout JSONL file.

  proxy start|stop|status [--auth chatgpt|api] [--run <id>] [--upstream <url>] [--port <port>] [--data-dir <path>] [--store-content]
    Manage the background loopback Responses API profiler proxy.

  codex enable [--auth chatgpt|api] [--url <proxy-url>] [--config <path>]
  codex disable [--config <path>]
    Enable or disable proxy routing in the user-level Codex config.

  codex run [--cwd <path>] [--run <id>] [--auth chatgpt|api] -- <prompt>
    Start or reuse the proxy and run one Codex CLI task through it.

  summarize [run_dir] [--json]
    Print exposure, replay, and efficiency metrics.

  legibility [run_dir] [--limit <count>]
    Print readable tool/artifact labels captured by the proxy.

  explain [run_dir] --artifact <artifact-name-or-id>
    Show details and first inclusions for one artifact.

  html [run_dir] [--out <path>]
    Write a static HTML report.

  sessions [--limit <count>] [--data-dir <path>] [--codex-home <path>] [--no-codex]
    List recently captured sessions, enriched with Codex thread titles when available.
`);
}
