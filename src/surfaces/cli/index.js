#!/usr/bin/env node
import { runCodexImport, runCommand, runDemo, runRecord, runWatch } from "./capture-commands.js";
import { runCodexConfig, runProxy } from "./proxy-commands.js";
import { runExplain, runHtml, runLegibility, runSessions, runSummarize } from "./report-commands.js";
import { printHelp } from "./utils.js";

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
  } else if (command === "html") {
    await runHtml(args);
  } else if (command === "sessions") {
    await runSessions(args);
  } else {
    printHelp();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
