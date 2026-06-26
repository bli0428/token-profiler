import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { normalizeStorageMode } from "../../core/privacy/index.ts";
import { disableCodexProxyConfig, enableCodexProxyConfig } from "../../adapters/codex/live-proxy/config.ts";
import { createProfilerProxy } from "../../adapters/codex/live-proxy/index.ts";
import { createSessionId, SessionRouter, sanitizeSessionId } from "../../adapters/codex/live-proxy/session-router.ts";

import { optionString, parseOptions } from "./utils.ts";

type ProxyState = {
  schema_version?: number;
  pid: number;
  host: string;
  port: number;
  upstream: string;
  run_id?: string | null;
  storage_mode?: string;
  log_path?: string;
  started_at?: string;
};

type StartProxyDaemonOptions = {
  optionArgs: string[];
  rootDir: string;
  statePath: string;
  runId: string | null;
  upstream: string;
  host: string;
  port: number;
  storageMode: string;
};

export async function runProxy(args: string[]): Promise<void> {
  const [action = "start", ...optionArgs] = args;
  const options = parseOptions(optionArgs);
  const authMode = optionString(options.auth, "chatgpt");
  if (!["chatgpt", "api"].includes(authMode)) {
    throw new Error("--auth must be chatgpt or api.");
  }
  const runId = typeof options.run === "string" ? sanitizeSessionId(options.run) : null;
  const rootDir = resolve(optionString(options["data-dir"], join(homedir(), ".token-profiler")));
  const upstream = optionString(options.upstream, authMode === "chatgpt"
    ? "https://chatgpt.com/backend-api/codex"
    : "https://api.openai.com");
  const host = optionString(options.host, "127.0.0.1");
  const port = Number(options.port ?? 8787);
  const statePath = join(rootDir, "proxy-state.json");

  if (action === "start") {
    const storageModeOption = typeof options["storage-mode"] === "string"
      ? { storageMode: options["storage-mode"] }
      : {};
    const storageMode = normalizeStorageMode({
      ...storageModeOption,
      storeContent: Boolean(options["store-content"])
    });
    await startProxyDaemon({ optionArgs, rootDir, statePath, runId, upstream, host, port, storageMode });
    return;
  }

  if (action === "stop") {
    const state = await readProxyState(statePath);
    if (!state) throw new Error("Token profiler proxy is not running.");
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
    if (state.storage_mode) console.log(`Storage mode: ${state.storage_mode}`);
    console.log(state.run_id ? `Fallback session: ${state.run_id}` : "Automatic session IDs are enabled.");
    return;
  }

  if (action !== "serve") {
    throw new Error("Use: proxy start|stop|status [--auth chatgpt|api] [--run <id>] [--upstream <url>] [--port <port>]");
  }

  const storageModeOption = typeof options["storage-mode"] === "string"
    ? { storageMode: options["storage-mode"] }
    : {};
  const storageMode = normalizeStorageMode({
    ...storageModeOption,
    storeContent: Boolean(options["store-content"])
  });
  const sessionRouter = new SessionRouter({
    rootDir,
    storageMode,
    fallbackSessionId: runId
  });
  const proxy = createProfilerProxy({ sessionRouter, upstream, host, port });

  await proxy.listen();
  console.log(`Token profiler proxy listening on http://${host}:${port}`);
  console.log(`Forwarding to ${upstream}`);
  console.log(`Writing sessions under ${join(rootDir, "runs")}`);
  console.log(runId ? `Fallback session: ${runId}` : "Automatic session IDs are enabled.");
  console.log(`Storage mode: ${storageMode}`);

  const stop = async () => {
    console.log("\nStopping proxy...");
    await proxy.close();
    await rm(statePath, { force: true });
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}


async function startProxyDaemon({
  optionArgs,
  rootDir,
  statePath,
  runId,
  upstream,
  host,
  port,
  storageMode
}: StartProxyDaemonOptions): Promise<void> {
  const existing = await readProxyState(statePath, false);
  if (existing && isProcessRunning(existing.pid)) {
    throw new Error(`Token profiler proxy is already running (pid ${existing.pid}).`);
  }

  await mkdir(rootDir, { recursive: true });
  const logPath = join(rootDir, "proxy.log");
  const logFd = openSync(logPath, "a");
  const cliPath = process.argv[1];
  if (!cliPath) {
    throw new Error("Cannot start proxy daemon without a CLI entrypoint path.");
  }
  const child = spawn(process.execPath, [cliPath, "proxy", "serve", ...optionArgs], {
    detached: true,
    stdio: ["ignore", logFd, logFd] as const,
    cwd: process.cwd()
  });
  closeSync(logFd);
  child.unref();
  if (!child.pid) {
    throw new Error("Proxy process did not report a pid.");
  }

  const state = {
    schema_version: 2,
    pid: child.pid,
    host,
    port,
    upstream,
    run_id: runId,
    storage_mode: storageMode,
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
  console.log(`Storage mode: ${storageMode}`);
}


async function readProxyState(statePath: string, required = true): Promise<ProxyState | null> {
  try {
    return JSON.parse(await readFile(statePath, "utf8")) as ProxyState;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" && !required) return null;
    if (code === "ENOENT") throw new Error("Token profiler proxy is not running.");
    throw error;
  }
}

function isProcessRunning(pid: unknown): boolean {
  if (!Number.isInteger(pid)) return false;
  const processId = pid as number;
  try {
    process.kill(processId, 0);
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


export async function runCodexConfig(args: string[]): Promise<void> {
  const [action, ...optionArgs] = args;

  if (action === "run") {
    await runCodexThroughProxy(optionArgs);
    return;
  }

  const options = parseOptions(optionArgs);
  const configPath = resolve(optionString(options.config, join(homedir(), ".codex", "config.toml")));
  const statePath = `${configPath}.token-profiler-state.json`;

  if (action === "enable") {
    const authMode = optionString(options.auth, "chatgpt");
    if (!["chatgpt", "api"].includes(authMode)) {
      throw new Error("--auth must be chatgpt or api.");
    }
    const proxyUrl = optionString(options.url, authMode === "chatgpt"
      ? "http://127.0.0.1:8787"
      : "http://127.0.0.1:8787/v1");
    const current = await readFile(configPath, "utf8").catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
      throw error;
    });
    const previousState = await readFile(statePath, "utf8")
      .then(JSON.parse)
      .catch((error) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
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


async function runCodexThroughProxy(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");
  if (separatorIndex === -1 || separatorIndex === args.length - 1) {
    throw new Error("Use: codex run [--cwd <path>] [--run <id>] -- <prompt>");
  }

  const options = parseOptions(args.slice(0, separatorIndex));
  const promptArgs = args.slice(separatorIndex + 1);
  const authMode = optionString(options.auth, "chatgpt");
  if (!["chatgpt", "api"].includes(authMode)) {
    throw new Error("--auth must be chatgpt or api.");
  }

  const runId = sanitizeSessionId(optionString(options.run, createSessionId()));
  const rootDir = resolve(optionString(options["data-dir"], join(homedir(), ".token-profiler")));
  const statePath = join(rootDir, "proxy-state.json");
  const upstream = authMode === "chatgpt"
    ? "https://chatgpt.com/backend-api/codex"
    : "https://api.openai.com";
  const port = Number(options.port ?? 8787);
  const host = "127.0.0.1";
  const existing = await readProxyState(statePath, false);
  const storageModeOption = typeof options["storage-mode"] === "string"
    ? { storageMode: options["storage-mode"] }
    : {};
  const storageMode = normalizeStorageMode({
    ...storageModeOption,
    storeContent: Boolean(options["store-content"])
  });

  if (existing && isProcessRunning(existing.pid)) {
    if (existing.upstream !== upstream || Number(existing.port) !== port) {
      throw new Error("A profiler proxy is already running with different settings. Stop it first.");
    }
  } else {
    const proxyArgs = ["--auth", authMode, "--port", String(port)];
    if (typeof options["data-dir"] === "string") proxyArgs.push("--data-dir", options["data-dir"]);
    if (typeof options["storage-mode"] === "string") proxyArgs.push("--storage-mode", options["storage-mode"]);
    if (options["store-content"]) proxyArgs.push("--store-content");
    await startProxyDaemon({
      optionArgs: proxyArgs,
      rootDir,
      statePath,
      runId,
      upstream,
      host,
      port,
      storageMode
    });
  }

  const proxyUrl = authMode === "chatgpt"
    ? `http://${host}:${port}`
    : `http://${host}:${port}/v1`;
  const codexPath = optionString(options.codex, "/Applications/Codex.app/Contents/Resources/codex");
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
    cwd: resolve(optionString(options.cwd, process.cwd())),
    stdio: "inherit"
  });
  const exitCode = await new Promise<number | null>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("close", resolveExit);
  });
  console.log(`\nProfiler session: ${runId}`);
  console.log(`Report: node ${process.argv[1]} summarize ${join(rootDir, "runs", runId)}`);
  process.exitCode = exitCode;
}
