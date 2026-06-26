import { statSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { aggregateEvents } from "../../analysis/aggregate.ts";
import { enrichProfilerSessions, readCodexSessionMetadata } from "../../adapters/codex/log-import/index.ts";
import { createHtmlReport } from "../../html-report.js";
import { formatArtifactDetail, formatLegibilityReport } from "../../analysis/legibility.ts";
import { formatSummary } from "../../report.js";

import { optionString, parseOptions, positionalArgs, readCanonicalEventsFromRunDir } from "./utils.ts";

type SessionRow = {
  id: string;
  updatedAt: Date;
  codex?: {
    threadName?: string;
    sessionId?: string;
  };
};

export async function runSessions(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const rootDir = resolve(optionString(options["data-dir"], join(homedir(), ".token-profiler")));
  const codexHome = resolve(optionString(options["codex-home"], join(homedir(), ".codex")));
  const runsDir = join(rootDir, "runs");
  const entries = await readdir(runsDir, { withFileTypes: true }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  let sessions: SessionRow[] = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const eventsPath = join(runsDir, entry.name, "events.jsonl");
      const stat = statSync(eventsPath, { throwIfNoEntry: false });
      return stat ? { id: entry.name, updatedAt: stat.mtime } : null;
    })
    .filter((session): session is SessionRow => session !== null)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, Number(options.limit ?? 20));

  if (!options["no-codex"]) {
    try {
      const codexMetadata = await readCodexSessionMetadata({ codexHome });
      sessions = enrichProfilerSessions(sessions, codexMetadata);
    } catch (error) {
      console.warn(`Warning: could not read Codex session metadata: ${error instanceof Error ? error.message : String(error)}`);
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


function formatCodexSessionLabel(codex: SessionRow["codex"]): string {
  if (!codex) return "";
  const title = codex.threadName ? `  ${codex.threadName}` : "";
  const detail = codex.sessionId ? `  [codex:${codex.sessionId}]` : "";
  return `${title}${detail}`;
}


export async function runSummarize(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const runDir = args.find((arg: string) => !arg.startsWith("--")) ?? join(homedir(), ".token-profiler", "runs", "demo");
  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(formatSummary(summary));
}


export async function runLegibility(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const runDir = args.find((arg: string) => !arg.startsWith("--")) ?? join(homedir(), ".token-profiler", "runs", "demo");
  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  console.log(formatLegibilityReport(summary, {
    limit: Number(options.limit ?? 20)
  }));
}


export async function runExplain(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const runDir = args.find((arg: string) => !arg.startsWith("--")) ?? join(homedir(), ".token-profiler", "runs", "demo");
  const artifact = optionString(options.artifact, "") || positionalArgs(args).find((arg: string) => arg !== runDir);
  if (!artifact) {
    throw new Error("Use: explain [run_dir] --artifact <artifact-name-or-id>");
  }

  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);
  console.log(formatArtifactDetail(summary, artifact));
}


export async function runHtml(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const runDir = args.find((arg: string) => !arg.startsWith("--")) ?? join(homedir(), ".token-profiler", "runs", "demo");
  const out = optionString(options.out, `${runDir}/report.html`);
  const events = await readCanonicalEventsFromRunDir(runDir);
  const summary = aggregateEvents(events);

  await mkdir(dirname(out), { recursive: true });
  await createHtmlReport(summary, out);
  console.log(`Wrote ${out}`);
}
