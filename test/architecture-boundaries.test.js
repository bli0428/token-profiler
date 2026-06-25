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

test("legacy event-field fallback is quarantined in the legacy importer", async () => {
  const files = await listJavaScriptFiles(SRC_ROOT);
  const allowed = new Set([
    "src/ingest/legacy-import/index.js"
  ]);

  for (const file of files) {
    const normalized = relative(".", file);
    if (allowed.has(normalized)) continue;

    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /(?:event|record)\.token_count|local_token_count\s*\?\?/,
      `${normalized} must not accept legacy token_count fields directly`
    );
  }
});

test("top-level compatibility modules remain thin re-exports", async () => {
  const wrappers = [
    "src/aggregate.js",
    "src/events.js",
    "src/legacy-import.js",
    "src/legibility.js",
    "src/privacy.js",
    "src/proxy.js",
    "src/store.js"
  ];

  for (const file of wrappers) {
    const source = (await readFile(file, "utf8")).trim();
    assert.match(source, /^export \* from "\.\/.+\.js";$/, `${file} should stay a thin compatibility wrapper`);
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
