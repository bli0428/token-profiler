import type { ArtifactAggregate } from "../core/events/types.ts";

/**
 * Builds a deterministic artifact row comparator for ranked metric tables.
 *
 * Rows sort by the requested metric descending, then inclusion count
 * descending, then stable artifact ID ascending to make fixture comparisons
 * and report ordering repeatable.
 */
export function compareArtifactsByMetric(metric: keyof ArtifactAggregate) {
  return (a: ArtifactAggregate, b: ArtifactAggregate): number => {
    const primary = Number(b[metric]) - Number(a[metric]);
    if (primary !== 0) return primary;
    const inclusions = Number(b.inclusions) - Number(a.inclusions);
    if (inclusions !== 0) return inclusions;
    return String(a.artifact_id).localeCompare(String(b.artifact_id));
  };
}

/**
 * Orders request summaries by timestamp, falling back to request ID when
 * imported records share or lack precise timing.
 */
export function compareRequestsByTimestamp(a: { timestamp?: string; request_id: string }, b: { timestamp?: string; request_id: string }): number {
  const time = String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? ""));
  return time || String(a.request_id).localeCompare(String(b.request_id));
}
