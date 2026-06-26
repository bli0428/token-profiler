import type { AnalysisCaveat } from "./types.ts";

export const LOCAL_ATTRIBUTION_CAVEAT = "Artifact-level attribution is estimated from local tokenization. Provider-reported request totals remain authoritative when present.";

export const LEGIBILITY_CAVEATS = {
  metadataMissing: "metadata_missing",
  privacyHidden: "privacy_hidden",
  toolLinkUnmatched: "tool_link_unmatched",
  toolLinkInferred: "tool_link_inferred",
  legacyRecordLimited: "legacy_record_limited",
  taskGroupHeuristic: "task_group_heuristic",
  artifactAttributionEstimated: "artifact_attribution_estimated"
} as const;

/**
 * Creates the standard caveat for any artifact-level cache or burn estimate.
 *
 * This note must be shown whenever estimated artifact attribution appears next
 * to provider-reported request totals.
 */
export function localAttributionCaveat(analyzer_id = "cache-attribution"): AnalysisCaveat {
  return {
    code: "local_artifact_attribution_estimate",
    severity: "info",
    message: LOCAL_ATTRIBUTION_CAVEAT,
    applies_to: { analyzer_id }
  };
}

/**
 * Creates a warning caveat for an analyzer result affected by missing canonical
 * facts, such as absent usage records or artifact token offsets.
 */
export function partialDataCaveat(code: string, message: string, analyzer_id: string): AnalysisCaveat {
  return {
    code,
    severity: "warning",
    message,
    applies_to: { analyzer_id }
  };
}

export function legibilityCaveat(
  code: typeof LEGIBILITY_CAVEATS[keyof typeof LEGIBILITY_CAVEATS],
  message: string,
  applies_to: NonNullable<AnalysisCaveat["applies_to"]> = { analyzer_id: "legibility" },
  severity: AnalysisCaveat["severity"] = "info"
): AnalysisCaveat {
  return {
    code,
    severity,
    message,
    applies_to
  };
}
