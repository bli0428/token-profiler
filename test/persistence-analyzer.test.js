import assert from "node:assert/strict";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { artifact } from "./helpers/analyzer-fixtures.js";

test("persistence analyzer classifies continuous and reintroduced artifacts", () => {
  const summary = analyzeEvents([
    artifact("req_1", "FILE:auth", "FILE", "auth.js", "hash_auth", 10),
    artifact("req_2", "FILE:auth", "FILE", "auth.js", "hash_auth", 10),
    artifact("req_1", "FILE:build", "FILE", "build.js", "hash_build", 10),
    artifact("req_3", "FILE:build", "FILE", "build.js", "hash_build", 10)
  ]);
  const persistence = summary.analyzers.find((analyzer) => analyzer.analyzer_id === "persistence");
  const auth = persistence.rows.find((row) => row.artifact_id === "FILE:auth");
  const build = persistence.rows.find((row) => row.artifact_id === "FILE:build");

  assert.equal(auth.classification, "continuous");
  assert.equal(build.classification, "reintroduced");
});
