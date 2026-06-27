import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { printHelp } from "../src/surfaces/cli/utils.ts";

test("CLI help points to dashboard API workflow instead of static dashboard files", () => {
  const output = captureConsole(() => printHelp());

  assert.match(output, /dashboard-api serve/);
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
