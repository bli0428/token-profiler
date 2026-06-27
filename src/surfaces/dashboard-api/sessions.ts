import { statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { analyzeEvents } from "../../analysis/pipeline.ts";
import { readEventsFromRunDir } from "../../core/store/index.ts";
import type { DashboardViewSession, DashboardViewSessionIndex } from "./view-model-types.ts";

export type DashboardSessionTitleLookup = (
  sessions: Array<{ run_id: string; updated_at: Date }>
) => Promise<Map<string, string>>;

export async function createDashboardSessionIndex(
  rootDir: string,
  { limit = 20, sessionTitleLookup }: { limit?: number; sessionTitleLookup?: DashboardSessionTitleLookup | undefined } = {}
): Promise<DashboardViewSessionIndex> {
  const runsDir = join(rootDir, "runs");
  const entries = await readdir(runsDir, { withFileTypes: true }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const sessions: DashboardViewSession[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = join(runsDir, entry.name);
    const stat = statSync(join(runDir, "events.jsonl"), { throwIfNoEntry: false });
    if (!stat) continue;

    try {
      const summary = analyzeEvents(await readEventsFromRunDir(runDir));
      const runId = summary.run_id ?? entry.name;
      sessions.push({
        run_id: runId,
        run_dir: runDir,
        label: runId,
        updated_at: stat.mtime.toISOString(),
        request_count: summary.requests.length,
        artifact_count: summary.artifacts.length,
        input_tokens: numberValue(summary.totals.input_tokens),
        cached_input_tokens: numberValue(summary.totals.cached_input_tokens),
        uncached_input_tokens: numberValue(summary.totals.uncached_input_tokens),
        output_tokens: numberValue(summary.totals.output_tokens),
        availability: { status: "complete" },
        caveats: []
      });
    } catch (error) {
      sessions.push({
        run_id: entry.name,
        run_dir: runDir,
        label: entry.name,
        updated_at: stat.mtime.toISOString(),
        availability: {
          status: "unavailable",
          reason: error instanceof Error ? error.message : String(error)
        },
        caveats: [{
          code: "session_unreadable",
          severity: "warning",
          message: `Could not read session ${entry.name}.`
        }]
      });
    }
  }

  await applySessionTitles(sessions, sessionTitleLookup);

  sessions.sort((a, b) =>
    String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""))
    || a.run_id.localeCompare(b.run_id)
  );

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    sessions: sessions.slice(0, limit),
    caveats: []
  };
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

async function applySessionTitles(
  sessions: DashboardViewSession[],
  sessionTitleLookup: DashboardSessionTitleLookup | undefined
): Promise<void> {
  if (!sessionTitleLookup || sessions.length === 0) return;

  try {
    const titlesByRunId = await sessionTitleLookup(
      sessions
        .filter((session) => session.updated_at)
        .map((session) => ({
          run_id: basename(session.run_dir),
          updated_at: new Date(String(session.updated_at))
        }))
    );

    for (const session of sessions) {
      session.label = titlesByRunId.get(basename(session.run_dir)) ?? session.label ?? session.run_id;
    }
  } catch {
    for (const session of sessions) {
      session.label = session.label ?? session.run_id;
    }
  }
}
