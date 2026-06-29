import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { optionString, parseOptions } from "./utils.ts";
import { runProxy } from "./proxy-commands.ts";

type DaemonState = {
  schema_version?: number;
  dashboard_api?: ChildState | null;
  started_at?: string;
};

type ChildState = {
  pid: number;
  host: string;
  port: number;
  log_path: string;
};

type DaemonOptions = {
  authMode: string;
  rootDir: string;
  host: string;
  proxyPort: number;
  dashboardPort: number;
  dashboardOrigin: string;
  proxyArgs: string[];
  dashboardArgs: string[];
};

export async function runDaemon(args: string[]): Promise<void> {
  const [action = "status", ...optionArgs] = args;

  if (action === "help" || action === "--help" || action === "-h") {
    printDaemonHelp();
    return;
  }

  const options = parseOptions(optionArgs);
  const daemonOptions = parseDaemonOptions(options);
  const statePath = join(daemonOptions.rootDir, "daemon-state.json");

  if (action === "start") {
    await startDaemon(daemonOptions, statePath, false);
    return;
  }

  if (action === "ensure") {
    await startDaemon(daemonOptions, statePath, true);
    return;
  }

  if (action === "stop") {
    await stopDaemon(daemonOptions.rootDir, statePath);
    return;
  }

  if (action === "status") {
    await printDaemonStatus(daemonOptions.rootDir, statePath);
    return;
  }

  throw new Error(daemonUsage());
}

async function startDaemon(options: DaemonOptions, statePath: string, ensure: boolean): Promise<void> {
  await mkdir(options.rootDir, { recursive: true });

  await ensureProxy(options, ensure);
  const dashboard = await ensureDashboardApi(options, statePath, ensure);

  await writeFile(statePath, JSON.stringify({
    schema_version: 1,
    dashboard_api: dashboard,
    started_at: new Date().toISOString()
  }, null, 2), "utf8");

  console.log(`Token profiler daemon is running.`);
  console.log(`Proxy: http://${options.host}:${options.proxyPort}`);
  console.log(`Dashboard API: http://${dashboard.host}:${dashboard.port}`);
}

async function ensureProxy(options: DaemonOptions, ensure: boolean): Promise<void> {
  try {
    await runProxy(["start", ...options.proxyArgs]);
  } catch (error) {
    if (ensure && error instanceof Error && error.message.includes("already running")) {
      console.log("Token profiler proxy is already running.");
      return;
    }
    throw error;
  }
}

async function ensureDashboardApi(options: DaemonOptions, statePath: string, ensure: boolean): Promise<ChildState> {
  const existing = (await readDaemonState(statePath))?.dashboard_api;
  if (existing && isProcessRunning(existing.pid)) {
    if (!ensure) throw new Error(`Dashboard API is already running (pid ${existing.pid}).`);
    console.log("Dashboard API is already running.");
    return existing;
  }

  const logPath = join(options.rootDir, "dashboard-api.log");
  const logFd = openSync(logPath, "a");
  const cliPath = process.argv[1];
  if (!cliPath) throw new Error("Cannot start daemon without a CLI entrypoint path.");

  const child = spawn(process.execPath, [
    cliPath,
    "dashboard-api",
    "serve",
    ...options.dashboardArgs
  ], {
    detached: true,
    stdio: ["ignore", logFd, logFd] as const,
    cwd: process.cwd()
  });
  closeSync(logFd);
  child.unref();

  if (!child.pid) throw new Error("Dashboard API process did not report a pid.");

  const ready = await waitFor(async () => {
    if (!isProcessRunning(child.pid)) return false;
    try {
      const response = await fetch(`http://${options.host}:${options.dashboardPort}/api/status`);
      return response.ok;
    } catch {
      return false;
    }
  }, 3000);

  if (!ready) {
    throw new Error(`Dashboard API did not start. Check ${logPath}`);
  }

  return {
    pid: child.pid,
    host: options.host,
    port: options.dashboardPort,
    log_path: logPath
  };
}

async function stopDaemon(rootDir: string, statePath: string): Promise<void> {
  const state = await readDaemonState(statePath);

  if (state?.dashboard_api?.pid && isProcessRunning(state.dashboard_api.pid)) {
    process.kill(state.dashboard_api.pid, "SIGTERM");
    const stopped = await waitFor(() => !isProcessRunning(state.dashboard_api?.pid), 3000);
    if (!stopped) throw new Error(`Dashboard API process ${state.dashboard_api.pid} did not stop within 3 seconds.`);
    console.log("Stopped dashboard API.");
  } else {
    console.log("Dashboard API is not running.");
  }

  try {
    await runProxy(["stop", "--data-dir", rootDir]);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not running")) {
      console.log("Token profiler proxy is not running.");
    } else {
      throw error;
    }
  }

  await rm(statePath, { force: true });
  console.log("Stopped token profiler daemon.");
}

async function printDaemonStatus(rootDir: string, statePath: string): Promise<void> {
  const state = await readDaemonState(statePath);
  const dashboard = state?.dashboard_api;

  if (dashboard && isProcessRunning(dashboard.pid)) {
    console.log(`Dashboard API is running (pid ${dashboard.pid}).`);
    console.log(`Listening on http://${dashboard.host}:${dashboard.port}`);
  } else {
    console.log("Dashboard API is not running.");
  }

  await runProxy(["status", "--data-dir", rootDir]);
}

function parseDaemonOptions(options: Record<string, string | boolean>): DaemonOptions {
  const authMode = optionString(options.auth, "chatgpt");
  if (!["chatgpt", "api"].includes(authMode)) throw new Error("--auth must be chatgpt or api.");

  const rootDir = resolve(optionString(options["data-dir"], join(homedir(), ".token-profiler")));
  const host = optionString(options.host, "127.0.0.1");
  const proxyPort = parsePort(options["proxy-port"] ?? options.port ?? 8787, "--proxy-port");
  const dashboardPort = parsePort(options["dashboard-port"] ?? 8788, "--dashboard-port");
  const dashboardOrigin = optionString(options.origin, "http://127.0.0.1:5173");
  const proxyArgs = [
    "--auth",
    authMode,
    "--host",
    host,
    "--port",
    String(proxyPort),
    "--data-dir",
    rootDir
  ];
  const dashboardArgs = [
    "--host",
    host,
    "--port",
    String(dashboardPort),
    "--origin",
    dashboardOrigin,
    "--data-dir",
    rootDir
  ];

  if (typeof options.upstream === "string") {
    proxyArgs.push("--upstream", options.upstream);
  }
  if (typeof options["capture-mode"] === "string") {
    proxyArgs.push("--capture-mode", options["capture-mode"]);
  }
  if (typeof options["codex-home"] === "string") {
    dashboardArgs.push("--codex-home", options["codex-home"]);
  }
  if (options["no-codex"]) {
    dashboardArgs.push("--no-codex");
  }

  return {
    authMode,
    rootDir,
    host,
    proxyPort,
    dashboardPort,
    dashboardOrigin,
    proxyArgs,
    dashboardArgs
  };
}

export function printDaemonHelp(): void {
  console.log(`Token Profiler Daemon

${daemonUsage()}

Options:
  --auth chatgpt|api
    Select the upstream auth mode. Defaults to chatgpt.

  --data-dir <path>
    Store daemon state, logs, and captured runs under this root.

  --host <host>
    Bind both local services to this host. Defaults to 127.0.0.1.

  --proxy-port <port>
    Proxy listen port. Defaults to 8787.

  --dashboard-port <port>
    Dashboard API listen port. Defaults to 8788.

  --origin <origin>
    Allowed dashboard frontend origin for CORS. Defaults to http://127.0.0.1:5173.

  --upstream <url>
    Override the proxy upstream URL.

  --capture-mode metadata|preview|raw
    Select capture privacy mode for proxy events. Defaults to preview.

  --codex-home <path>
    Read Codex dashboard title metadata from this Codex home.

  --no-codex
    Disable Codex session-title enrichment in the dashboard API.
`);
}

function daemonUsage(): string {
  return "Use: daemon start|stop|status|ensure|help [--auth chatgpt|api] [--data-dir <path>] [--host <host>] [--proxy-port <port>] [--dashboard-port <port>] [--origin <origin>] [--upstream <url>] [--capture-mode metadata|preview|raw] [--codex-home <path>] [--no-codex]";
}

function parsePort(value: string | boolean | number, name: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name} value.`);
  }
  return port;
}

async function readDaemonState(statePath: string): Promise<DaemonState | null> {
  try {
    return JSON.parse(await readFile(statePath, "utf8")) as DaemonState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function isProcessRunning(pid: unknown): boolean {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid as number, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(predicate: () => boolean | Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await predicate()) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  } while (Date.now() < deadline);
  return false;
}
