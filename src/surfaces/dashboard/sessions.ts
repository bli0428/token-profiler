import { statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { analyzeEvents } from "../../analysis/pipeline.ts";
import { readEventsFromRunDir } from "../../core/store/index.ts";
import type { DashboardSession, DashboardSessionIndex } from "./types.ts";

export async function createDashboardSessionIndex(rootDir: string, { limit = 20 }: { limit?: number } = {}): Promise<DashboardSessionIndex> {
  const runsDir = join(rootDir, "runs");
  const entries = await readdir(runsDir, { withFileTypes: true }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  });
  const sessions: DashboardSession[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = join(runsDir, entry.name);
    const stat = statSync(join(runDir, "events.jsonl"), { throwIfNoEntry: false });
    if (!stat) continue;

    try {
      const summary = analyzeEvents(await readEventsFromRunDir(runDir));
      sessions.push({
        run_id: summary.run_id ?? entry.name,
        run_dir: runDir,
        label: summary.run_id ?? entry.name,
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
