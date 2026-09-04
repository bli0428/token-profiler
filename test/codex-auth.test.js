import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveCodexAuthMode } from "../src/surfaces/cli/codex-auth.ts";

test("auto-detects an API-key Codex login without consuming the key", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "token-profiler-codex-auth-"));
  await writeFile(join(codexHome, "auth.json"), JSON.stringify({
    auth_mode: "apikey",
    OPENAI_API_KEY: "must-not-be-consumed"
  }));

  assert.equal(await resolveCodexAuthMode(undefined, codexHome), "api");
});

test("auto-detects ChatGPT login and preserves explicit overrides", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "token-profiler-codex-auth-"));
  await writeFile(join(codexHome, "auth.json"), JSON.stringify({ auth_mode: "chatgpt" }));

  assert.equal(await resolveCodexAuthMode(undefined, codexHome), "chatgpt");
  assert.equal(await resolveCodexAuthMode("api", codexHome), "api");
  await assert.rejects(resolveCodexAuthMode("unknown", codexHome), /--auth must be chatgpt or api/);
});

test("defaults compatibly when Codex auth metadata is unavailable", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "token-profiler-codex-auth-"));
  assert.equal(await resolveCodexAuthMode(undefined, codexHome), "chatgpt");
});
