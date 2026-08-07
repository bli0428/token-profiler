import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createDashboardSessionIndex } from "../src/surfaces/dashboard-api/sessions.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";

test("lazy session index returns stat-only rows without reading malformed event JSONL", async () => {
  const root = join(tmpdir(), `token-profiler-catalog-${Date.now()}`);
  const runDir = join(root, "runs", "codex-019f8654-d457-7560-88e9-131adc7a7c57");
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), "{malformed}\n");
  const index = await createDashboardSessionIndex(root, {
    lazy: "force",
    sessionTitleLookup: async () => new Map([["codex-019f8654-d457-7560-88e9-131adc7a7c57", "Pending catalog title"]])
  });
  assert.equal(index.sessions[0].availability.status, "partial");
  assert.equal(index.sessions[0].label, "Pending catalog title");
  assert.equal(index.sessions[0].caveats[0].code, "session_catalog_pending");
});

test("catalog-backed session index retains resolved session titles", async () => {
  const root = join(tmpdir(), `token-profiler-catalog-title-${Date.now()}`);
  const runId = "codex-019f8654-d457-7560-88e9-131adc7a7c57";
  const runDir = join(root, "runs", runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(join(runDir, "events.jsonl"), `${JSON.stringify(artifact("request_1", "FILE:catalog", "FILE", "catalog.ts", "hash", 2, 0, 2))}\n${JSON.stringify(usage("request_1", 2, 0))}\n`);

  const initialIndex = await createDashboardSessionIndex(root, {
    lazy: "force",
    sessionTitleLookup: async () => new Map([[runId, "Restore session labels"]])
  });
  assert.equal(initialIndex.sessions[0].availability.status, "partial");

  let catalogIndex;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    catalogIndex = await createDashboardSessionIndex(root, { lazy: "force" });
    if (catalogIndex.sessions[0].availability.status === "complete") break;
  }

  assert.equal(catalogIndex?.sessions[0].label, "Restore session labels");
});
