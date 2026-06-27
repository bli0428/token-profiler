import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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

test("dashboard API projection modules do not import provider-specific adapter code", async () => {
  const files = [
    join(SRC_ROOT, "surfaces", "dashboard-api", "view-model.ts"),
    join(SRC_ROOT, "surfaces", "dashboard-api", "privacy.ts"),
    join(SRC_ROOT, "surfaces", "dashboard-api", "sessions.ts"),
    join(SRC_ROOT, "surfaces", "dashboard-api", "view-model-types.ts")
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*(?:adapters|ingest|proxy|codex|claude)[^"']*["']/,
      `${file} must consume analyzer/store contracts, not provider-specific modules`
    );
  }
});

test("dashboard API modules only consume canonical store, analyzers, and dashboard-safe model code", async () => {
  const files = await listJavaScriptFiles(join(SRC_ROOT, "surfaces", "dashboard-api"));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*(?:adapters|ingest|proxy|codex|claude|dashboard\/render|html-report)[^"']*["']/,
      `${file} must stay behind the dashboard API boundary`
    );
  }
});

test("dashboard API contract types do not depend on sibling surface DTOs", async () => {
  const source = await readFile(join(SRC_ROOT, "surfaces", "dashboard-api", "types.ts"), "utf8");
  assert.doesNotMatch(
    source,
    /from\s+["'](?:\.\.\/(?!\.\.\/)|[^"']*src\/surfaces\/(?!dashboard-api\/))[^"']*["']/,
    "dashboard API DTOs must be owned by the API contract, not sibling surface modules"
  );
});

test("static string-rendered dashboard surface is retired", async () => {
  await assert.rejects(access(join(SRC_ROOT, "surfaces", "dashboard")));
  await assert.rejects(access(join(SRC_ROOT, "surfaces", "dashboard", "assets.ts")));
  await assert.rejects(access(join(SRC_ROOT, "surfaces", "dashboard", "render.ts")));
  await assert.rejects(access(join(SRC_ROOT, "surfaces", "html-report.ts")));
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
    if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))) files.push(path);
  }

  return files;
}
