#!/usr/bin/env node
import { runCodexImport, runCommand, runDemo, runRecord, runWatch } from "./capture-commands.ts";
import { runDashboardApi } from "./dashboard-api-commands.ts";
import { runCodexConfig, runProxy } from "./proxy-commands.ts";
import { runExplain, runLegibility, runSessions, runSummarize } from "./report-commands.ts";
import { printHelp } from "./utils.ts";

const [, , command = "help", ...args] = process.argv;

try {
  if (command === "demo") {
    await runDemo();
  } else if (command === "record") {
    await runRecord(args);
  } else if (command === "watch") {
    await runWatch(args);
  } else if (command === "run") {
    await runCommand(args);
  } else if (command === "codex-import") {
    await runCodexImport(args);
  } else if (command === "proxy") {
    await runProxy(args);
  } else if (command === "codex") {
    await runCodexConfig(args);
  } else if (command === "summarize") {
    await runSummarize(args);
  } else if (command === "legibility") {
    await runLegibility(args);
  } else if (command === "explain") {
    await runExplain(args);
  } else if (command === "dashboard-api") {
    await runDashboardApi(args);
  } else if (command === "sessions") {
    await runSessions(args);
  } else {
    printHelp();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
