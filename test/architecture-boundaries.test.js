import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";

const SRC_ROOT = "src";

test("analysis modules do not import provider-specific ingest or surface code", async () => {
  const files = await listJavaScriptFiles(join(SRC_ROOT, "analysis"));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*(?:ingest|surfaces|proxy|codex|claude)[^"']*["']/,
      `${file} must consume canonical records, not provider-specific modules`
    );
  }
});

test("canonical readers do not accept older MVP artifact token fields", async () => {
  const files = await listJavaScriptFiles(SRC_ROOT);

  for (const file of files) {
    const normalized = relative(".", file);

    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /(?:event|record)\.token_count|local_token_count\s*\?\?/,
      `${normalized} must not accept older MVP token_count fields directly`
    );
  }
});

test("top-level compatibility modules remain thin re-exports", async () => {
  const wrappers = [
    "src/aggregate.js",
    "src/codex-config.js",
    "src/codex-sessions.js",
    "src/events.js",
    "src/hash.js",
    "src/legibility.js",
    "src/privacy.js",
    "src/profiler.js",
    "src/proxy.js",
    "src/session-router.js",
    "src/store.js",
    "src/tokenizer.js"
  ];

  for (const file of wrappers) {
    const source = (await readFile(file, "utf8")).trim();
    assert.match(source, /^export \* from "\.\/.+\.ts";$/, `${file} should stay a thin compatibility wrapper`);
  }
});

test("source-root legacy capture implementation files are compatibility only", async () => {
  const rootFiles = await readdir(SRC_ROOT, { withFileTypes: true });
  const legacyNames = new Set([
    "codex-config.js",
    "codex-sessions.js",
    "hash.js",
    "profiler.js",
    "session-router.js",
    "tokenizer.js"
  ]);

  for (const entry of rootFiles) {
    if (!entry.isFile() || !legacyNames.has(entry.name)) continue;
    const file = join(SRC_ROOT, entry.name);
    const source = (await readFile(file, "utf8")).trim();
    assert.match(source, /^export \* from "\.\/.+\.ts";$/, `${file} must not contain legacy implementation logic`);
  }
});

async function listJavaScriptFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJavaScriptFiles(path));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) files.push(path);
  }

  return files;
}
