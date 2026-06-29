import type {
  AnalysisCaveat,
  ArtifactDetail,
  LegibilityAnalysisResult,
  PreparedRunData,
  PreviewState,
  ReadableArtifact,
  RequestAccountingResult,
  RequestAccountingRow,
  TurnGroup,
  TurnGroupAnalysisResult,
  TurnGroupingSource,
  TurnRequest,
  TurnRequestTitleSource,
  TurnTitleSource
} from "./types.ts";

type TurnFact = PreparedRunData["turnIdentityEvents"][number];

type TurnGroupDraft = {
  turn_id: string;
  grouping_source: TurnGroupingSource;
  turn_started_at?: string | undefined;
  request_ids: string[];
  caveats: AnalysisCaveat[];
};

/**
 * Builds analyzer-owned turn groups from canonical request turn facts.
 *
 * This analyzer is the boundary where request accounting, legible artifact
 * labels, privacy-aware previews, and canonical turn identity become the
 * `turns -> requests -> artifacts` hierarchy consumed by later surfaces.
 */
export function analyzeTurnGroups(
  runData: PreparedRunData,
  requestAccounting: RequestAccountingResult,
  legibility: LegibilityAnalysisResult
): TurnGroupAnalysisResult {
  const requestRows = requestAccounting.rows;
  const factsByRequest = firstTurnFactByRequest(runData.turnIdentityEvents);
  const groups = collectTurnGroupDrafts(requestRows, factsByRequest)
    .map((group) => buildTurnGroup(group, requestRows, legibility))
    .sort(compareTurnGroups);
  const fallbackCount = groups.filter((group) => group.confidence === "fallback").length;
  const caveats = groups.flatMap((group) => group.caveats);

  return {
    analyzer_id: "turn-groups",
    schema_version: 1,
    availability: groups.length === 0
      ? { status: "unavailable", reason: "No request records are available.", missing_facts: ["requests"] }
      : fallbackCount > 0
        ? { status: "partial", reason: "Some requests lack direct turn identity.", missing_facts: ["request_turn_identity"] }
        : { status: "complete" },
    metrics: {
      turn_group_count: groups.length,
      direct_turn_group_count: groups.filter((group) => group.grouping_source === "direct_turn_id").length,
      fallback_turn_group_count: fallbackCount,
      request_count: groups.reduce((total, group) => total + group.request_ids.length, 0)
    },
    rows: groups,
    caveats
  };
}

// Grouping

function firstTurnFactByRequest(facts: TurnFact[]): Map<string, TurnFact> {
  const map = new Map<string, TurnFact>();
  for (const fact of [...facts].sort(compareTurnFacts)) {
    if (!map.has(fact.request_id)) map.set(fact.request_id, fact);
  }
  return map;
}

function collectTurnGroupDrafts(
  requestRows: RequestAccountingRow[],
  factsByRequest: Map<string, TurnFact>
): TurnGroupDraft[] {
  const groups = new Map<string, TurnGroupDraft>();

  for (const request of [...requestRows].sort(compareRequestRows)) {
    const fact = factsByRequest.get(request.request_id);
    const key = turnGroupIdForFact(fact);
    const existing = groups.get(key) ?? {
      turn_id: key,
      grouping_source: groupingSourceForTurnFact(fact),
      turn_started_at: fact?.turn_started_at,
      request_ids: [],
      caveats: []
    };
    existing.request_ids.push(request.request_id);
    if (!existing.turn_started_at && fact?.turn_started_at) existing.turn_started_at = fact.turn_started_at;
    existing.caveats.push(...caveatsForTurnFact(request.request_id, fact));
    groups.set(key, existing);
  }

  return [...groups.values()];
}

function buildTurnGroup(
  group: TurnGroupDraft,
  requestRows: RequestAccountingRow[],
  legibility: LegibilityAnalysisResult
): TurnGroup {
  const rows = group.request_ids
    .map((requestId) => requestRows.find((row) => row.request_id === requestId))
    .filter((row): row is RequestAccountingRow => row !== undefined)
    .sort(compareRequestRows);
  const artifacts = rows.flatMap((row) => row.artifact_inclusions);
  const artifactIds = uniqueStrings(artifacts.map((artifact) => artifact.artifact_id));
  const title = selectTurnTitle(group, rows, legibility);
  const requests = rows.map((row) => buildTurnRequest(row, title.display_title, legibility));
  const usageRows = rows.filter((row) => row.usage);
  const previewState = strongestPreviewState(
    artifactIds
      .map((artifactId) => legibility.rows.find((row) => row.artifact_id === artifactId)?.preview_state)
      .filter((state): state is PreviewState => Boolean(state))
  );

  return {
    turn_id: group.turn_id,
    display_title: title.display_title,
    title_source: title.title_source,
    grouping_source: group.grouping_source,
    confidence: group.grouping_source === "direct_turn_id" ? "complete" : "fallback",
    request_ids: rows.map((row) => row.request_id),
    artifact_ids: artifactIds,
    requests,
    metrics: {
      input_tokens: sumOptional(usageRows.map((row) => row.usage?.input_tokens)),
      cached_input_tokens: sumOptional(usageRows.map((row) => row.usage?.cached_input_tokens)),
      uncached_input_tokens: sumOptional(usageRows.map((row) => row.usage?.uncached_input_tokens)),
      output_tokens: sumOptional(usageRows.map((row) => row.usage?.output_tokens)),
      total_tokens: sumOptional(usageRows.map((row) => row.usage?.total_tokens)),
      total_local_artifact_tokens: rows.reduce((total, row) => total + row.total_local_artifact_tokens, 0),
      artifact_count: artifactIds.length
    },
    privacy: {
      preview_state: previewState,
      prompt_available: title.title_source === "user_preview" || title.title_source === "safe_summary",
      hidden_reason: title.title_source === "fallback" || title.title_source === "turn_id"
        ? "Turn prompt text unavailable in stored artifacts."
        : undefined
    },
    caveats: uniqueCaveats([...group.caveats, ...requests.flatMap((request) => request.caveats)])
  };
}

// Child Requests

function buildTurnRequest(
  row: RequestAccountingRow,
  turnTitle: string,
  legibility: LegibilityAnalysisResult
): TurnRequest {
  const title = selectRequestTitle(row, turnTitle, legibility);
  return {
    request_id: row.request_id,
    display_title: title.display_title,
    title_source: title.title_source,
    chronology_index: row.chronology_index,
    availability: row.availability,
    ...(row.usage ? { usage: row.usage } : {}),
    artifact_inclusions: row.artifact_inclusions,
    caveats: row.caveats
  };
}

// Title Selection

function selectTurnTitle(
  group: TurnGroupDraft,
  rows: RequestAccountingRow[],
  legibility: LegibilityAnalysisResult
): { display_title: string; title_source: TurnTitleSource } {
  const readable = readableArtifactsForRows(rows, legibility);
  const userDetails = readable
    .filter((row) => row.display_category === "user_message" && row.title_candidate === true)
    .map((row) => ({
      row,
      detail: legibility.details.find((detail) => detail.artifact_id === row.artifact_id)
    }));

  const preview = userDetails
    .map(({ detail }) => storedPreviewText(detail))
    .find(nonEmptyString);
  if (preview) return { display_title: preview, title_source: "user_preview" };

  const safeSummary = userDetails
    .map(({ row }) => nonGenericTitle(row.display_name, "User message"))
    .find(nonEmptyString);
  if (safeSummary) return { display_title: safeSummary, title_source: "safe_summary" };

  if (group.grouping_source === "direct_turn_id") {
    return { display_title: group.turn_id, title_source: "turn_id" };
  }

  return { display_title: "Requests without turn identity", title_source: "fallback" };
}

function selectRequestTitle(
  row: RequestAccountingRow,
  turnTitle: string,
  legibility: LegibilityAnalysisResult
): { display_title: string; title_source: TurnRequestTitleSource } {
  const readable = readableArtifactsForRows([row], legibility);
  const assistantDetails = readable
    .filter((artifact) => artifact.display_category === "assistant_message" && artifact.title_candidate === true)
    .map((artifact) => ({
      artifact,
      detail: legibility.details.find((detail) => detail.artifact_id === artifact.artifact_id)
  }));
  const assistantPreview = assistantDetails
    .map(({ detail }) => storedPreviewText(detail))
    .find(nonEmptyString)
    ?? assistantDetails
      .map(({ artifact }) => nonGenericTitle(artifact.display_name, "Assistant message"))
      .find(nonEmptyString);
  if (assistantPreview) return { display_title: assistantPreview, title_source: "assistant_preview" };

  const actionLabel = readable
    .filter((artifact) => ["command", "command_output", "patch", "tool_call"].includes(artifact.display_category))
    .sort((a, b) => requestOrder(row, a.artifact_id) - requestOrder(row, b.artifact_id) || a.artifact_id.localeCompare(b.artifact_id))
    .map((artifact) => nonGenericTitle(artifact.display_name, artifact.artifact_name))
    .find(nonEmptyString);
  if (actionLabel) return { display_title: actionLabel, title_source: "action_label" };

  if (turnTitle) return { display_title: turnTitle, title_source: "turn_title" };
  return { display_title: row.request_id, title_source: "request_id" };
}

// Artifact Lookup

function readableArtifactsForRows(rows: RequestAccountingRow[], legibility: LegibilityAnalysisResult): ReadableArtifact[] {
  const requestIds = new Set(rows.map((row) => row.request_id));
  return legibility.rows
    .filter((row) => row.request_id && requestIds.has(row.request_id))
    .sort((a, b) => {
      const requestA = rows.find((row) => row.request_id === a.request_id);
      const requestB = rows.find((row) => row.request_id === b.request_id);
      return Number(requestA?.chronology_index ?? 0) - Number(requestB?.chronology_index ?? 0)
        || requestOrder(requestA, a.artifact_id) - requestOrder(requestB, b.artifact_id)
        || a.artifact_id.localeCompare(b.artifact_id);
    });
}

function storedPreviewText(detail: ArtifactDetail | undefined): string | undefined {
  const preview = detail?.content?.preview ?? detail?.content?.raw;
  return nonEmptyString(preview);
}

// Canonical Turn Facts

function turnGroupIdForFact(fact: TurnFact | undefined): string {
  if (fact?.turn_identity_source === "direct_turn_id" && fact.turn_id) return fact.turn_id;
  if (fact?.turn_identity_source === "malformed") return "turn:fallback:malformed";
  return "turn:fallback:missing";
}

function groupingSourceForTurnFact(fact: TurnFact | undefined): TurnGroupingSource {
  if (fact?.turn_identity_source === "direct_turn_id" && fact.turn_id) return "direct_turn_id";
  if (fact?.turn_identity_source === "malformed") return "fallback";
  return "missing_turn_id";
}

function caveatsForTurnFact(requestId: string, fact: TurnFact | undefined): AnalysisCaveat[] {
  if (fact?.turn_identity_source === "direct_turn_id" && fact.turn_id) return fact.caveats ?? [];
  if (fact?.caveats?.length) {
    return fact.caveats.map((caveat) => ({
      ...caveat,
      applies_to: { ...caveat.applies_to, analyzer_id: "turn-groups", request_id: requestId }
    }));
  }
  return [{
    code: "turn_identity_missing",
    severity: "info",
    message: "Request has no canonical turn identity; grouped under an explicit fallback turn.",
    applies_to: { analyzer_id: "turn-groups", request_id: requestId }
  }];
}

// Ordering And Small Utilities

function compareTurnFacts(a: TurnFact, b: TurnFact): number {
  return String(a.timestamp).localeCompare(String(b.timestamp))
    || String(a.request_id).localeCompare(String(b.request_id));
}

function compareRequestRows(a: RequestAccountingRow, b: RequestAccountingRow): number {
  return a.chronology_index - b.chronology_index
    || String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? ""))
    || a.request_id.localeCompare(b.request_id);
}

function compareTurnGroups(a: TurnGroup, b: TurnGroup): number {
  const firstA = a.requests[0];
  const firstB = b.requests[0];
  return Number(firstA?.chronology_index ?? 0) - Number(firstB?.chronology_index ?? 0)
    || a.turn_id.localeCompare(b.turn_id);
}

function requestOrder(row: RequestAccountingRow | undefined, artifactId: string): number {
  return row?.artifact_inclusions.find((artifact) => artifact.artifact_id === artifactId)?.request_order ?? Number.POSITIVE_INFINITY;
}

function strongestPreviewState(states: PreviewState[]): PreviewState {
  if (states.includes("raw_available")) return "raw_available";
  if (states.includes("preview")) return "preview";
  if (states.includes("hidden")) return "hidden";
  return "unavailable";
}

function sumOptional(values: Array<number | undefined>): number | undefined {
  const numbers = values.filter((value): value is number => Number.isFinite(value));
  return numbers.length > 0 ? numbers.reduce((total, value) => total + value, 0) : undefined;
}

function nonGenericTitle(value: unknown, fallback: string): string | undefined {
  const text = nonEmptyString(value);
  if (!text || text === fallback) return undefined;
  return text;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function uniqueCaveats(caveats: AnalysisCaveat[]): AnalysisCaveat[] {
  const seen = new Set<string>();
  return caveats.filter((caveat) => {
    const key = [
      caveat.code,
      caveat.applies_to?.analyzer_id ?? "",
      caveat.applies_to?.request_id ?? "",
      caveat.applies_to?.artifact_id ?? "",
      caveat.message
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
