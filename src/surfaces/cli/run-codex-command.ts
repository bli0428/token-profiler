import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createSessionId, sanitizeSessionId } from "../../adapters/codex/live-proxy/session-router.ts";
import { runDaemon } from "./daemon-commands.ts";
import { optionString, parseOptions, positionalArgs } from "./utils.ts";

type RunCodexOptions = {
  authMode: string;
  captureMode?: string;
  codexPath: string;
  cwd: string;
  dashboardPort: number;
  dataDir: string;
  host: string;
  proxyPort: number;
  runId: string;
};

export async function runCodexLauncher(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printRunCodexHelp();
    return;
  }

  const separatorIndex = args.indexOf("--");
  const launcherArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex);
  const codexPassthroughArgs = separatorIndex === -1 ? [] : args.slice(separatorIndex + 1);
  const options = parseRunCodexOptions(launcherArgs);

  await runDaemon([
    "ensure",
    "--auth",
    options.authMode,
    "--data-dir",
    options.dataDir,
    "--host",
    options.host,
    "--proxy-port",
    String(options.proxyPort),
    "--dashboard-port",
    String(options.dashboardPort),
    ...(options.captureMode ? ["--capture-mode", options.captureMode] : [])
  ]);
  await validateLocalServices(options);

  console.log(`Dashboard: http://${options.host}:${options.dashboardPort}`);
  console.log(`Profiler session: ${options.runId}`);

  const proxyUrl = options.authMode === "chatgpt"
    ? `http://${options.host}:${options.proxyPort}`
    : `http://${options.host}:${options.proxyPort}/v1`;
  const codexArgs = [
    "-c", 'model_provider="token-profiler"',
    "-c", 'model_providers.token-profiler.name="Token Profiler"',
    "-c", `model_providers.token-profiler.base_url=${JSON.stringify(proxyUrl)}`,
    "-c", 'model_providers.token-profiler.wire_api="responses"',
    "-c", "model_providers.token-profiler.requires_openai_auth=true",
    "-c", "model_providers.token-profiler.supports_websockets=false",
    "-c", `model_providers.token-profiler.http_headers={"x-token-profiler-session"=${JSON.stringify(options.runId)}}`,
    ...codexPassthroughArgs
  ];

  const child = spawn(options.codexPath, codexArgs, {
    cwd: options.cwd,
    stdio: "inherit"
  });
  const exitCode = await new Promise<number | null>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("close", resolveExit);
  });

  console.log(`\nDashboard: http://${options.host}:${options.dashboardPort}`);
  console.log(`Run data: ${join(options.dataDir, "runs", options.runId)}`);
  process.exitCode = exitCode;
}

async function validateLocalServices(options: RunCodexOptions): Promise<void> {
  const proxyState = await readJsonState(join(options.dataDir, "proxy-state.json"), "proxy");
  if (proxyState.host !== options.host || Number(proxyState.port) !== options.proxyPort) {
    throw new Error(
      `Profiler proxy is running on http://${proxyState.host}:${proxyState.port}, not http://${options.host}:${options.proxyPort}. Stop the daemon or rerun with matching ports.`
    );
  }

  const daemonState = await readJsonState(join(options.dataDir, "daemon-state.json"), "daemon");
  const dashboard = daemonState.dashboard_api;
  if (!isJsonRecord(dashboard) || dashboard.host !== options.host || Number(dashboard.port) !== options.dashboardPort) {
    const actual = isJsonRecord(dashboard)
      ? `http://${String(dashboard.host)}:${String(dashboard.port)}`
      : "an unknown dashboard address";
    throw new Error(
      `Dashboard API is running on ${actual}, not http://${options.host}:${options.dashboardPort}. Stop the daemon or rerun with matching ports.`
    );
  }
}

async function readJsonState(path: string, label: string): Promise<Record<string, unknown>> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!isJsonRecord(parsed)) {
    throw new Error(`Invalid ${label} state at ${path}.`);
  }
  return parsed;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function printRunCodexHelp(): void {
  console.log(`Token Profiler Codex Launcher

Use: run codex [cwd] [options] [-- <codex-args...>]

Starts or reuses the local profiler proxy and dashboard API, then launches Codex
with temporary model-provider settings that route this Codex session through the
profiler.

Options:
  --auth chatgpt|api
    Select the upstream auth mode. Defaults to chatgpt.

  --data-dir <path>
    Store daemon state, logs, and captured runs under this root.

  --host <host>
    Bind local services to this host. Defaults to 127.0.0.1.

  --proxy-port <port>
    Proxy listen port. Defaults to 8787.

  --dashboard-port <port>
    Dashboard API listen port. Defaults to 8788.

  --capture-mode metadata|preview|raw
    Select capture privacy mode for proxy events. Defaults to preview.

  --run <id>
    Set the profiler run/session id. Defaults to a generated id.

  --codex <path>
    Codex executable path. Defaults to /Applications/Codex.app/Contents/Resources/codex.
`);
}

function parseRunCodexOptions(args: string[]): RunCodexOptions {
  const options = parseOptions(args);
  const authMode = optionString(options.auth, "chatgpt");
  if (!["chatgpt", "api"].includes(authMode)) {
    throw new Error("--auth must be chatgpt or api.");
  }

  const cwdArg = positionalArgs(args).find((arg) => arg !== "codex");
  const dataDir = resolve(optionString(options["data-dir"], join(homedir(), ".token-profiler")));
  const parsed: RunCodexOptions = {
    authMode,
    codexPath: optionString(options.codex, "/Applications/Codex.app/Contents/Resources/codex"),
    cwd: resolve(optionString(options.cwd, cwdArg ?? process.cwd())),
    dashboardPort: parsePort(options["dashboard-port"] ?? 8788, "--dashboard-port"),
    dataDir,
    host: optionString(options.host, "127.0.0.1"),
    proxyPort: parsePort(options["proxy-port"] ?? options.port ?? 8787, "--proxy-port"),
    runId: sanitizeSessionId(optionString(options.run, createSessionId()))
  };

  if (typeof options["capture-mode"] === "string") {
    parsed.captureMode = options["capture-mode"];
  }

  return parsed;
}

function parsePort(value: string | boolean | number, name: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name} value.`);
  }
  return port;
}
