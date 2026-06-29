import { existsSync, statSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { readEventsFromRunDir } from "../../core/store/index.ts";

export type CliOptions = Record<string, string | boolean>;

export function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) continue;

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

export function positionalArgs(args: string[]): string[] {
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) continue;

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

export async function readCanonicalEventsFromRunDir(runDir: string): Promise<unknown[]> {
  return readEventsFromRunDir(runDir);
}

export async function listFiles(targets: string[], root: string): Promise<string[]> {
  const files: string[] = [];

  for (const target of targets) {
    await collectFiles(target, root, files);
  }

  return files;
}

async function collectFiles(target: string, root: string, files: string[]): Promise<void> {
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

function shouldIgnore(target: string, root: string): boolean {
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

export function required(options: CliOptions, key: string): string {
  if (!options[key]) {
    throw new Error(`Missing --${key}`);
  }

  return String(options[key]);
}

export function optionString(value: string | boolean | undefined, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function printHelp(): void {
  console.log(`Token Profiler

Commands:
  demo
    Write sample events to ~/.token-profiler/runs/demo/events.jsonl

  record --run <id> --request <id> --type <type> --name <name> (--content <path> | --text <text>)
    Record one artifact inclusion.

  watch --run <id> [paths...] [--cwd <path>] [--interval <ms>]
    Actively record FILE snapshots when watched files change.

  run --run <id> [--request <id>] [--type TOOL_OUTPUT] [--name <name>] -- <command> [args...]
    Run a command and record its stdout/stderr as one artifact.

  codex-import <rollout.jsonl> --run <id>
    Import exact Codex token_count events from a local rollout JSONL file.

  proxy start|stop|status [--auth chatgpt|api] [--run <id>] [--upstream <url>] [--port <port>] [--data-dir <path>] [--capture-mode metadata|preview|raw]
    Manage the background loopback Responses API profiler proxy.

  daemon start|stop|status|ensure|help [--auth chatgpt|api] [--data-dir <path>] [--host <host>] [--proxy-port <port>] [--dashboard-port <port>] [--origin <origin>] [--upstream <url>] [--capture-mode metadata|preview|raw] [--codex-home <path>] [--no-codex]
    Manage the local profiler proxy and dashboard API together.

  codex enable [--auth chatgpt|api] [--url <proxy-url>] [--config <path>]
  codex disable [--config <path>]
    Enable or disable proxy routing in the user-level Codex config.

  setup codex [--auth chatgpt|api] [--autostart] [--data-dir <path>] [--config <path>] [daemon options]
    Configure Codex routing and optionally install login autostart for the daemon.

  codex run [--cwd <path>] [--run <id>] [--auth chatgpt|api] [--capture-mode metadata|preview|raw] -- <prompt>
    Start or reuse the proxy and run one Codex CLI task through it.

  summarize [run_dir] [--json]
    Print exposure, replay, and efficiency metrics.

  legibility [run_dir] [--limit <count>]
    Print readable tool/artifact labels captured by the proxy.

  explain [run_dir] --artifact <artifact-name-or-id>
    Show details and first inclusions for one artifact.

  dashboard-api serve [--port <port>] [--host <host>] [--data-dir <path>] [--origin <origin>] [--codex-home <path>] [--no-codex]
    Start the local read-only dashboard HTTP API for the isolated dashboard app.

  sessions [--limit <count>] [--data-dir <path>] [--codex-home <path>] [--no-codex]
    List recently captured sessions, enriched with Codex thread titles when available.
`);
}
