import type { ArtifactAggregate, RequestSummary } from "../core/events/types.ts";
import type { AnalyzerResult } from "./types.ts";

/**
 * Classifies how artifacts persist across the observed request sequence.
 *
 * Span is measured from first to last observed request position. Gaps are span
 * positions where the artifact is absent. Any gap followed by a later inclusion
 * is treated as reintroduced replay.
 */
export function analyzePersistence(artifacts: ArtifactAggregate[], requests: RequestSummary[]): AnalyzerResult {
  const requestOrder = new Map(requests.map((request, index) => [request.request_id, index]));
  const rows = artifacts.map((artifact) => {
    const inclusionIndexes = requests
      .map((request, index) => request.artifacts.some((entry) => entry.artifact_id === artifact.artifact_id) ? index : -1)
      .filter((index) => index >= 0);
    const first = inclusionIndexes[0] ?? 0;
    const last = inclusionIndexes[inclusionIndexes.length - 1] ?? first;
    // Span includes both endpoints: first request position through last request position.
    const span = Math.max(0, last - first + 1);
    // Gaps are observed request positions inside the span where the artifact is absent.
    const gaps = Math.max(0, span - inclusionIndexes.length);
    const classification = gaps > 0 ? "reintroduced" : artifact.inclusions > 1 ? "continuous" : "uncertain";
    return {
      artifact_id: artifact.artifact_id,
      first_seen_request: firstRequestId(artifact.first_seen_at, requests, requestOrder),
      last_seen_request: firstRequestId(artifact.last_seen_at, requests, requestOrder),
      span_request_count: span,
      inclusion_count: artifact.inclusions,
      gap_count: gaps,
      classification,
      evidence: `${artifact.inclusions} inclusion(s) across ${span} observed request position(s)`
    };
  });

  return {
    analyzer_id: "persistence",
    schema_version: 1,
    availability: requests.length === 0
      ? { status: "unavailable", reason: "No request ordering is available.", missing_facts: ["requests"] }
      : { status: "complete" },
    metrics: {
      classified_artifact_count: rows.length,
      reintroduced_artifact_count: rows.filter((row) => row.classification === "reintroduced").length,
      continuous_artifact_count: rows.filter((row) => row.classification === "continuous").length
    },
    rows,
    caveats: []
  };
}

function firstRequestId(timestamp: string, requests: RequestSummary[], _requestOrder: Map<string, number>): string | undefined {
  return requests.find((request) => request.timestamp === timestamp)?.request_id;
}
