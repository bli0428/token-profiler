import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cliPath = resolve("src/cli.js");

test("proxy start replaces stale state when its PID belongs to another process", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "token-profiler-stale-proxy-"));
  const port = await availablePort();
  const statePath = join(rootDir, "proxy-state.json");

  await writeFile(statePath, JSON.stringify({
    schema_version: 2,
    pid: process.pid,
    host: "127.0.0.1",
    port,
    upstream: "https://chatgpt.com/backend-api/codex"
  }), "utf8");

  try {
    const started = await runCli([
      "proxy", "start",
      "--auth", "chatgpt",
      "--data-dir", rootDir,
      "--host", "127.0.0.1",
      "--port", String(port)
    ]);
    assert.match(started.stdout, /Started token profiler proxy/);

    const state = JSON.parse(await readFile(statePath, "utf8"));
    assert.notEqual(state.pid, process.pid);

    const response = await fetch(`http://127.0.0.1:${port}/_token_profiler/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, pid: state.pid });
  } finally {
    await runCli(["proxy", "stop", "--data-dir", rootDir]).catch(() => {});
  }
});

test("proxy start rejects reusing a healthy daemon with a different auth upstream", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "token-profiler-auth-proxy-"));
  const port = await availablePort();

  try {
    await runCli([
      "proxy", "start",
      "--auth", "chatgpt",
      "--data-dir", rootDir,
      "--host", "127.0.0.1",
      "--port", String(port)
    ]);

    await assert.rejects(
      runCli([
        "proxy", "start",
        "--auth", "api",
        "--data-dir", rootDir,
        "--host", "127.0.0.1",
        "--port", String(port)
      ]),
      /already running with different settings/
    );
  } finally {
    await runCli(["proxy", "stop", "--data-dir", rootDir]).catch(() => {});
  }
});

function runCli(args) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    timeout: 10_000
  });
}

async function availablePort() {
  const server = http.createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  const port = address.port;
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}
