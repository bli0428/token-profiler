import type { ArtifactAggregate } from "../core/events/types.ts";
import { compareArtifactsByMetric } from "./sort.ts";
import type { AnalyzerResult } from "./types.ts";

/**
 * Flags artifacts that may deserve clutter review.
 *
 * This analyzer is intentionally conservative: repeated exposure is a review
 * signal, not a waste verdict. Later task/legibility analyzers can add stronger
 * evidence about whether persistence was useful.
 */
export function analyzeContextClutter(artifacts: ArtifactAggregate[]): AnalyzerResult {
  const rows = [...artifacts]
    .sort(compareArtifactsByMetric("repeated_exposure"))
    .slice(0, 10)
    .map((artifact) => ({
      artifact_id: artifact.artifact_id,
      artifact_name: artifact.artifact_name,
      display_name: artifact.display_name ?? artifact.metadata?.display_name ?? artifact.artifact_name,
      total_exposure: artifact.total_exposure,
      repeated_exposure: artifact.repeated_exposure,
      replay_ratio: artifact.replay_ratio ?? 0,
      estimated_uncached_input_tokens: artifact.estimated_uncached_input_tokens,
      classification: artifact.repeated_exposure > 0 ? "possible_clutter" : "uncertain",
      evidence: artifact.repeated_exposure > 0
        ? "Repeated exposure is present; inspect task context before treating it as waste."
        : "No repeated exposure evidence."
    }));

  return {
    analyzer_id: "context-clutter",
    schema_version: 1,
    availability: { status: "complete" },
    metrics: {
      possible_clutter_count: rows.filter((row) => row.classification === "possible_clutter").length
    },
    rows,
    caveats: []
  };
}
