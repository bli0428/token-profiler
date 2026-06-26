#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const entrypoint = fileURLToPath(new URL("./surfaces/cli/index.ts", import.meta.url));
const result = spawnSync(process.execPath, [
  "--import",
  "tsx",
  entrypoint,
  ...process.argv.slice(2)
], {
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 0;
}
