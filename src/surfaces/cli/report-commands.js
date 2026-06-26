import { statSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { aggregateEvents } from "../../analysis/aggregate.js";
import { enrichProfilerSessions, readCodexSessionMetadata } from "../../codex-sessions.js";
import { createHtmlReport } from "../../html-report.js";
import { formatArtifactDetail, formatLegibilityReport } from "../../analysis/legibility.js";
import { formatSummary } from "../../report.js";

import { parseOptions, positionalArgs, readCanonicalEventsFromRunDir } from "./utils.js";

export async function runSessions(args) {
  const options = parseOptions(args);
  const rootDir = resolve(options["data-dir"] ?? join(homedir(), ".token-efficiency"));
  const codexHome = resolve(options["codex-home"] ?? join(homedir(), ".codex"));
  const runsDir = join(rootDir, "runs");
  const entries = await readdir(runsDir, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  let sessions = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const eventsPath = join(runsDir, entry.name, "events.jsonl");
      const stat = statSync(eventsPath, { throwIfNoEntry: false });
      return stat ? { id: entry.name, updatedAt: stat.mtime } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, Number(options.limit ?? 20));

  if (!options["no-codex"]) {
    try {
      const codexMetadata = await readCodexSessionMetadata({ codexHome });
      sessions = enrichProfilerSessions(sessions, codexMetadata);
    } catch (error) {
      console.warn(`Warning: could not read Codex session metadata: ${error.message}`);
    }
  }

  if (sessions.length === 0) {
    console.log("No profiler sessions found.");
    return;
  }

  for (const session of sessions) {
    console.log(`${session.updatedAt.toISOString()}  ${session.id}${formatCodexSessionLabel(session.codex)}`);
  }
}


function formatCodexSessionLabel(codex) {
  if (!codex) return "";
  const title = codex.threadName ? `  ${codex.threadName}` : "";
  const detail = codex.sessionId ? `  [codex:${codex.sessionId}]` : "";
  return `${title}${detail}`;
}


export async function runSummarize(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(formatSummary(summary));
}


export async function runLegibility(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  console.log(formatLegibilityReport(summary, {
    limit: Number(options.limit ?? 20)
  }));
}


export async function runExplain(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const artifact = options.artifact ?? positionalArgs(args).find((arg) => arg !== runDir);
  if (!artifact) {
    throw new Error("Use: explain [run_dir] --artifact <artifact-name-or-id>");
  }

  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);
  console.log(formatArtifactDetail(summary, artifact));
}


export async function runHtml(args) {
  const options = parseOptions(args);
  const runDir = args.find((arg) => !arg.startsWith("--")) ?? ".token-profiler/runs/demo";
  const out = options.out ?? `${runDir}/report.html`;
  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  await mkdir(dirname(out), { recursive: true });
  await createHtmlReport(summary, out);
  console.log(`Wrote ${out}`);
}

