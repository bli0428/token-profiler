import { analyzeCacheAttribution } from "./cache-attribution.ts";
import { analyzeContextClutter } from "./context-clutter.ts";
import { analyzeExposure } from "./exposure.ts";
import { analyzeLegibility } from "./legibility.ts";
import { analyzePersistence } from "./persistence.ts";
import { prepareRunData } from "./run-data.ts";
import { compareArtifactsByMetric } from "./sort.ts";
import { analyzeTaskGroups } from "./task-groups.ts";
import type { RunAnalysisSummary } from "./types.ts";

/**
 * Runs all core analyzers over canonical events and combines their outputs.
 *
 * The returned summary intentionally includes both the new analyzer-result
 * contract and the legacy aggregate fields during migration.
 */
export function analyzeEvents(events: unknown[]): RunAnalysisSummary {
  const runData = prepareRunData(events);
  const exposure = analyzeExposure(runData);
  const cache = analyzeCacheAttribution(runData, exposure.artifacts, exposure.requests);
  const artifacts = cache.artifacts
    .map((artifact) => ({
      ...artifact,
      estimated_cache_hit_ratio: ratio(
        artifact.estimated_cached_input_tokens,
        artifact.estimated_cache_attributed_tokens
      )
    }))
    .sort(compareArtifactsByMetric("total_exposure"));
  const requests = cache.requests.sort((a, b) => {
    const time = String(a.timestamp).localeCompare(String(b.timestamp));
    return time || String(a.request_id).localeCompare(String(b.request_id));
  });
  const persistence = analyzePersistence(artifacts, requests);
  const contextClutter = analyzeContextClutter(artifacts);
  const legibility = analyzeLegibility(artifacts, requests, runData.artifactEvents);
  const taskGroups = analyzeTaskGroups(requests, legibility);

  return {
    schema_version: 1,
    ...(runData.run_id ? { run_id: runData.run_id } : {}),
    generated_at: new Date().toISOString(),
    totals: {
      ...exposure.totals,
      ...cache.totals
    },
    artifacts,
    artifact_aggregates: artifacts,
    cost_drivers: cache.cost_drivers,
    context_bloat: [...artifacts].sort(compareArtifactsByMetric("repeated_exposure")).slice(0, 10),
    top_contributors: artifacts.slice(0, 10),
    replay_hotspots: [...artifacts].sort(compareArtifactsByMetric("repeated_exposure")).slice(0, 10),
    requests,
    analyzers: [
      exposure.result,
      cache.result,
      persistence,
      contextClutter,
      legibility,
      taskGroups
    ],
    legibility,
    task_groups: taskGroups.rows,
    caveats: [
      ...cache.caveats,
      ...legibility.caveats,
      ...taskGroups.caveats
    ]
  };
}

/**
 * Adapts a full analyzer summary to the historical aggregate shape.
 *
 * This keeps spec 004 legibility code and existing callers working while the
 * analyzer pipeline becomes the source of truth.
 */
export function toLegacyAggregateSummary(summary: RunAnalysisSummary) {
  return {
    totals: summary.totals,
    artifacts: summary.artifacts,
    cost_drivers: summary.cost_drivers,
    context_bloat: summary.context_bloat,
    top_contributors: summary.top_contributors,
    replay_hotspots: summary.replay_hotspots,
    requests: summary.requests
  };
}

/**
 * Returns the structured analyzer result used by future export surfaces.
 */
export function exportAnalysisResult(summary: RunAnalysisSummary): RunAnalysisSummary {
  return summary;
}

function ratio(numerator: unknown, denominator: unknown): number {
  const numericNumerator = Number(numerator) || 0;
  const numericDenominator = Number(denominator) || 0;
  return numericDenominator === 0 ? 0 : numericNumerator / numericDenominator;
}
