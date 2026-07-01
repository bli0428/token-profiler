import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { printDaemonHelp } from "../src/surfaces/cli/daemon-commands.ts";
import { launchAgentPlist } from "../src/surfaces/cli/setup-commands.ts";
import { printHelp } from "../src/surfaces/cli/utils.ts";

test("CLI help points to dashboard API workflow instead of static dashboard files", () => {
  const output = captureConsole(() => printHelp());

  assert.match(output, /dashboard-api serve/);
  assert.match(output, /daemon start\|stop\|status\|ensure/);
  assert.match(output, /--capture-mode metadata\|preview\|raw/);
  assert.match(output, /--codex-home <path>/);
  assert.match(output, /setup codex/);
  assert.match(output, /local read-only dashboard HTTP API/);
  assert.doesNotMatch(output, /\n\s*html \[run_dir\]/);
  assert.doesNotMatch(output, /\n\s*dashboard \[--limit/);
  assert.doesNotMatch(output, /static local dashboard/);
});

test("CLI dispatch no longer includes static dashboard commands", async () => {
  const source = await readFile("src/surfaces/cli/index.ts", "utf8");

  assert.doesNotMatch(source, /command === "html"/);
  assert.doesNotMatch(source, /command === "dashboard"/);
  assert.doesNotMatch(source, /\brunHtml\b/);
  assert.doesNotMatch(source, /\brunDashboard\b(?!Api)/);
  assert.match(source, /command === "dashboard-api"/);
  assert.match(source, /command === "daemon"/);
  assert.match(source, /command === "setup"/);
});

test("setup codex autostart plist runs daemon ensure", () => {
  const plist = launchAgentPlist({
    nodePath: "/usr/local/bin/node",
    cliPath: "/usr/local/bin/token-profiler",
    authMode: "chatgpt",
    rootDir: "/Users/example/.token-profiler",
    host: "127.0.0.1",
    proxyPort: "8787",
    dashboardPort: "8788",
    origin: "http://127.0.0.1:5173"
  });

  assert.match(plist, /<string>daemon<\/string>/);
  assert.match(plist, /<string>ensure<\/string>/);
  assert.match(plist, /<string>--auth<\/string>\s*<string>chatgpt<\/string>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
});

test("daemon help exposes service flags but not run fallback", () => {
  const output = captureConsole(() => printDaemonHelp());

  assert.match(output, /--upstream <url>/);
  assert.match(output, /--capture-mode metadata\|preview\|raw/);
  assert.match(output, /--codex-home <path>/);
  assert.match(output, /--no-codex/);
  assert.match(output, /--keep-codex-routing/);
  assert.doesNotMatch(output, /--run <id>/);
});

test("setup autostart plist preserves daemon service flags", () => {
  const plist = launchAgentPlist({
    nodePath: "/usr/local/bin/node",
    cliPath: "/usr/local/bin/token-profiler",
    authMode: "chatgpt",
    rootDir: "/Users/example/.token-profiler",
    host: "127.0.0.1",
    proxyPort: "8787",
    dashboardPort: "8788",
    origin: "http://127.0.0.1:5173",
    upstream: "https://example.test/codex",
    captureMode: "preview",
    codexHome: "/Users/example/.codex-alt",
    noCodex: true
  });

  assert.match(plist, /<string>--upstream<\/string>\s*<string>https:\/\/example\.test\/codex<\/string>/);
  assert.match(plist, /<string>--capture-mode<\/string>\s*<string>preview<\/string>/);
  assert.match(plist, /<string>--codex-home<\/string>\s*<string>\/Users\/example\/\.codex-alt<\/string>/);
  assert.match(plist, /<string>--no-codex<\/string>/);
});

function captureConsole(fn) {
  const original = console.log;
  let output = "";
  console.log = (message = "") => {
    output += String(message);
  };
  try {
    fn();
    return output;
  } finally {
    console.log = original;
  }
}
