import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const SRC_ROOT = "src";

test("analysis modules do not import provider-specific adapter, ingest, or surface code", async () => {
  const files = await listJavaScriptFiles(join(SRC_ROOT, "analysis"));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*(?:adapters|ingest|surfaces|proxy|codex|claude)[^"']*["']/,
      `${file} must consume canonical records, not provider-specific modules`
    );
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
