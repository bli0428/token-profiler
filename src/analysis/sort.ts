import type { ArtifactAggregate } from "../core/events/types.ts";
import type { ReadableArtifact, TaskGroup } from "./types.ts";

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

export function stableShortId(value: unknown, length = 10): string {
  return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(-length) || "unknown";
}

export function compareReadableArtifacts(a: ReadableArtifact, b: ReadableArtifact): number {
  const uncached = Number((b as any).estimated_uncached_input_tokens ?? 0) - Number((a as any).estimated_uncached_input_tokens ?? 0);
  if (uncached !== 0) return uncached;
  const exposure = Number(b.total_exposure) - Number(a.total_exposure);
  if (exposure !== 0) return exposure;
  const inclusions = Number(b.inclusion_count) - Number(a.inclusion_count);
  if (inclusions !== 0) return inclusions;
  const category = String(a.display_category).localeCompare(String(b.display_category));
  if (category !== 0) return category;
  return String(a.artifact_id).localeCompare(String(b.artifact_id));
}

export function compareTaskGroups(a: TaskGroup, b: TaskGroup): number {
  return String(a.start_request_id).localeCompare(String(b.start_request_id))
    || String(a.task_group_id).localeCompare(String(b.task_group_id));
}
