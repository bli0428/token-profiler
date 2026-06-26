import type {
  ArtifactAggregate,
  JsonObject,
  RequestArtifactSummary,
  RequestSummary
} from "../core/events/types.ts";
import { compareArtifactsByMetric, compareRequestsByTimestamp } from "./sort.ts";
import type { AnalyzerResult, ExposureAnalysis, PreparedRunData } from "./types.ts";

/**
 * Derives exposure and replay metrics from canonical artifact records.
 *
 * Total exposure is the sum of local token counts across every artifact
 * inclusion. Unique exposure counts only the first appearance of each content
 * hash. Repeated exposure is the difference between those two values.
 */
export function analyzeExposure(runData: PreparedRunData): ExposureAnalysis {
  const seenHashes = new Set<string>();
  const artifactMap = new Map<string, ArtifactAggregate>();
  const requestMap = new Map<string, RequestSummary>();
  let totalExposure = 0;
  let uniqueExposure = 0;

  for (const event of runData.artifactEvents) {
    const tokenCount = Number(event.local_token_count) || 0;
    const firstHashInclusion = !seenHashes.has(event.content_hash);

    totalExposure += tokenCount;
    if (firstHashInclusion) {
      uniqueExposure += tokenCount;
      seenHashes.add(event.content_hash);
    }

    const artifact = artifactMap.get(event.artifact_id) ?? {
      artifact_id: event.artifact_id,
      artifact_type: event.artifact_type,
      artifact_name: event.artifact_name,
      total_exposure: 0,
      unique_exposure: 0,
      repeated_exposure: 0,
      inclusions: 0,
      distinct_hashes: new Set<string>(),
      estimated_cached_input_tokens: 0,
      estimated_uncached_input_tokens: 0,
      estimated_cache_attributed_tokens: 0,
      metadata: {},
      first_seen_at: event.timestamp,
      last_seen_at: event.timestamp
    };

    artifact.total_exposure += tokenCount;
    artifact.inclusions += 1;
    artifact.last_seen_at = event.timestamp;
    if (artifact.distinct_hashes instanceof Set) artifact.distinct_hashes.add(event.content_hash);
    artifact.metadata = mergeMetadata(artifact.metadata, event.metadata);

    if (firstHashInclusion) artifact.unique_exposure += tokenCount;
    else artifact.repeated_exposure += tokenCount;

    artifactMap.set(event.artifact_id, artifact);

    const request = requestMap.get(event.request_id) ?? {
      request_id: event.request_id,
      total_exposure: 0,
      artifacts: [],
      timestamp: event.timestamp
    };
    request.total_exposure += tokenCount;
    const requestArtifact: RequestArtifactSummary = {
      artifact_id: event.artifact_id,
      artifact_type: event.artifact_type,
      artifact_name: event.artifact_name,
      token_count: tokenCount,
      content_hash: event.content_hash,
      metadata: event.metadata
    };
    const tokenStart = finiteNumber(event.token_start);
    const tokenEnd = finiteNumber(event.token_end);
    if (tokenStart !== undefined) requestArtifact.token_start = tokenStart;
    if (tokenEnd !== undefined) requestArtifact.token_end = tokenEnd;
    if (Number.isInteger(event.artifact_index)) requestArtifact.artifact_index = event.artifact_index as number;
    request.artifacts.push(requestArtifact);
    requestMap.set(event.request_id, request);
  }

  // Repeated exposure is all context that reappeared after its first content-hash inclusion.
  const repeatedExposure = totalExposure - uniqueExposure;
  const artifacts = [...artifactMap.values()]
    .map((artifact) => ({
      ...artifact,
      display_name: artifact.metadata?.display_name ?? artifact.artifact_name,
      distinct_hashes: artifact.distinct_hashes instanceof Set ? artifact.distinct_hashes.size : artifact.distinct_hashes,
      // Artifact replay ratio: repeated artifact exposure divided by all artifact exposure.
      replay_ratio: ratio(artifact.repeated_exposure, artifact.total_exposure),
      // Exposure share: artifact exposure divided by total run exposure.
      exposure_share: ratio(artifact.total_exposure, totalExposure),
      estimated_cache_hit_ratio: ratio(artifact.estimated_cached_input_tokens, artifact.estimated_cache_attributed_tokens)
    }))
    .sort(compareArtifactsByMetric("total_exposure"));
  const requests = [...requestMap.values()].sort(compareRequestsByTimestamp);

  return {
    totals: {
      total_exposure: totalExposure,
      unique_exposure: uniqueExposure,
      repeated_exposure: repeatedExposure,
      // Run replay ratio: repeated exposure divided by total exposure.
      replay_ratio: ratio(repeatedExposure, totalExposure),
      // Context efficiency: first-seen exposure divided by total exposure.
      context_efficiency: ratio(uniqueExposure, totalExposure),
      artifact_count: artifacts.length,
      request_count: requestMap.size
    },
    artifacts,
    requests,
    result: {
      analyzer_id: "exposure",
      schema_version: 1,
      availability: { status: "complete" },
      metrics: {
        total_exposure: totalExposure,
        unique_exposure: uniqueExposure,
        repeated_exposure: repeatedExposure,
        replay_ratio: ratio(repeatedExposure, totalExposure),
        context_efficiency: ratio(uniqueExposure, totalExposure),
        artifact_count: artifacts.length,
        request_count: requestMap.size
      },
      rows: artifacts.slice(0, 10),
      caveats: []
    }
  };
}

/**
 * Returns a numeric ratio and treats missing or zero denominators as 0.
 *
 * Analyzer metrics use this helper to avoid `NaN` in reports when a run lacks
 * usage, exposure, or attribution data.
 */
export function ratio(numerator: unknown, denominator: unknown): number {
  const numericNumerator = Number(numerator) || 0;
  const numericDenominator = Number(denominator) || 0;
  return numericDenominator === 0 ? 0 : numericNumerator / numericDenominator;
}

/**
 * Converts a canonical numeric field into a finite number or `undefined`.
 *
 * Missing artifact offsets are meaningful for attribution availability, so
 * invalid values are preserved as absence rather than coerced to 0.
 */
export function finiteNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/**
 * Merges artifact metadata across repeated inclusions of the same artifact.
 *
 * Array fields accumulate unique values. `display_name` is replaced only when
 * the new metadata is more specific, which lets later captures improve labels
 * without losing earlier supporting details.
 */
export function mergeMetadata(current: JsonObject = {}, next: JsonObject = {}): JsonObject {
  if (!next || typeof next !== "object") return current;
  const merged: JsonObject = { ...current };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const existing = Array.isArray(merged[key]) ? merged[key] : [];
      merged[key] = [...new Set([...existing, ...value])];
      continue;
    }
    if (key === "display_name" && shouldReplaceDisplayName(merged[key], value, merged, next)) {
      merged[key] = value;
      continue;
    }
    if (merged[key] === undefined) merged[key] = value;
  }
  return merged;
}

function shouldReplaceDisplayName(
  current: unknown,
  next: unknown,
  currentMetadata: JsonObject,
  nextMetadata: JsonObject
): boolean {
  if (current === undefined) return true;
  return metadataSpecificity(nextMetadata) > metadataSpecificity(currentMetadata)
    || (isGenericDisplayName(current) && !isGenericDisplayName(next));
}

function metadataSpecificity(metadata: Record<string, any> = {}) {
  let score = 0;
  if (metadata.command) score += 4;
  if (metadata.touched_files?.length > 0) score += 3;
  if (metadata.output_preview) score += 2;
  if (metadata.source_display_name) score += 2;
  if (metadata.content_kind) score += 1;
  if (metadata.tool_name) score += 1;
  return score;
}

function isGenericDisplayName(value: unknown): boolean {
  const text = String(value ?? "");
  return /^tool:[^:]+:call_/.test(text)
    || /^tool-call:[^:]+:call_/.test(text)
    || /^input:[^:]+:\d+$/.test(text);
}
