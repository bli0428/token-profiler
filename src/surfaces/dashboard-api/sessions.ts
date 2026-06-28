import { statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { analyzeEvents } from "../../analysis/pipeline.ts";
import { readEventsFromRunDir } from "../../core/store/index.ts";
import type { DashboardViewSession, DashboardViewSessionIndex } from "./view-model-types.ts";
import type { SessionIdentityMapping } from "../../analysis/types.ts";

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
      const identity = sessionIdentity({
        routeRunId: entry.name,
        canonicalRunId: runId,
        label: runId
      });
      sessions.push({
        run_id: runId,
        run_dir: runDir,
        label: runId,
        identity,
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
        identity: sessionIdentity({
          routeRunId: entry.name,
          canonicalRunId: entry.name,
          label: entry.name,
          unavailable: true
        }),
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
      session.identity = sessionIdentity({
        routeRunId: basename(session.run_dir),
        canonicalRunId: session.run_id,
        label: session.label
      });
    }
  } catch {
    for (const session of sessions) {
      session.label = session.label ?? session.run_id;
      session.identity = sessionIdentity({
        routeRunId: basename(session.run_dir),
        canonicalRunId: session.run_id,
        label: session.label
      });
    }
  }
}

function sessionIdentity({
  routeRunId,
  canonicalRunId,
  label,
  unavailable = false
}: {
  routeRunId: string;
  canonicalRunId: string;
  label?: string | undefined;
  unavailable?: boolean;
}): SessionIdentityMapping {
  const codexSessionId = directCodexSessionId(routeRunId) ?? directCodexSessionId(canonicalRunId);
  const cacheKey = routeRunId.startsWith("codex-cache-") || canonicalRunId.startsWith("codex-cache-");
  const generatedCodex = routeRunId.startsWith("codex-") || canonicalRunId.startsWith("codex-");

  if (codexSessionId) {
    return {
      route_run_id: routeRunId,
      ...(canonicalRunId !== routeRunId ? { canonical_run_id: canonicalRunId } : {}),
      codex_session_id: codexSessionId,
      ...(label ? { codex_label: label } : {}),
      mapping_confidence: "one_to_one",
      mapping_source: "direct_session_id",
      limitations: []
    };
  }

  if (cacheKey) {
    return {
      route_run_id: routeRunId,
      ...(canonicalRunId !== routeRunId ? { canonical_run_id: canonicalRunId } : {}),
      ...(label ? { codex_label: label } : {}),
      mapping_confidence: "probable",
      mapping_source: "cache_key",
      limitations: ["Cache-key routes identify a stable local session but do not prove a one-to-one Codex session."]
    };
  }

  if (generatedCodex) {
    return {
      route_run_id: routeRunId,
      ...(canonicalRunId !== routeRunId ? { canonical_run_id: canonicalRunId } : {}),
      ...(label ? { codex_label: label } : {}),
      mapping_confidence: "best_effort",
      mapping_source: "fallback_fingerprint",
      limitations: ["Generated or fallback Codex routes may group requests by local routing heuristics."]
    };
  }

  return {
    route_run_id: routeRunId,
    ...(canonicalRunId !== routeRunId ? { canonical_run_id: canonicalRunId } : {}),
    ...(label ? { codex_label: label } : {}),
    mapping_confidence: "unknown",
    mapping_source: "unavailable",
    limitations: [
      unavailable
        ? "Run data is unreadable, so Codex session identity could not be inspected."
        : "No Codex session identity was available for this local run."
    ]
  };
}

function directCodexSessionId(value: string): string | undefined {
  const match = value.match(/^codex-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match?.[1];
}
