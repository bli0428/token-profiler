import { formatNumber } from "../report.js";
import { LEGIBILITY_CAVEATS, legibilityCaveat, localAttributionCaveat } from "./caveats.ts";
import { compareReadableArtifacts, stableShortId } from "./sort.ts";
import type {
  AggregateSummary,
  ArtifactAggregate,
  ArtifactEvent,
  JsonObject,
  RequestSummary
} from "../core/events/types.ts";
import type {
  ArtifactDetail,
  DisplayCategory,
  LegibilityAnalysisResult,
  PreviewState,
  ReadableArtifact,
  RunAnalysisSummary,
  ToolCallLink
} from "./types.ts";

type SummaryLike = RunAnalysisSummary | AggregateSummary;

export function analyzeLegibility(
  artifacts: ArtifactAggregate[],
  requests: RequestSummary[],
  artifactEvents: ArtifactEvent[] = []
): LegibilityAnalysisResult {
  const eventsByArtifact = groupEventsByArtifact(artifactEvents);
  const rows = artifacts.map((artifact) => readableArtifact(artifact, requests, eventsByArtifact.get(artifact.artifact_id) ?? []));
  const tool_links = buildToolLinks(rows);
  const details = rows.map((row) => artifactDetail(row, artifacts, requests, eventsByArtifact.get(row.artifact_id) ?? [], tool_links));
  const readableCount = rows.filter((row) => row.display_category !== "unknown").length;
  const unmatchedCount = tool_links.filter((link) => link.match_state === "unmatched_call" || link.match_state === "unmatched_output").length;
  const caveats = [...rows.flatMap((row) => row.caveats), ...tool_links.flatMap((link) => link.caveats)];

  return {
    analyzer_id: "legibility",
    schema_version: 1,
    availability: { status: "complete" },
    metrics: {
      readable_artifact_count: readableCount,
      opaque_artifact_count: rows.length - readableCount,
      exact_tool_link_count: tool_links.filter((link) => link.match_state === "exact").length,
      inferred_tool_link_count: tool_links.filter((link) => link.match_state === "inferred").length,
      unmatched_tool_artifact_count: unmatchedCount
    },
    rows: rows.sort(compareReadableArtifacts),
    tool_links,
    details,
    caveats
  };
}

export function formatLegibilityReport(summary: SummaryLike, { limit = 20 }: { limit?: number } = {}): string {
  const analysis = getLegibility(summary);
  const rows = analysis.rows.slice(0, limit);

  const lines: string[] = [];
  lines.push("Artifact Legibility Report");
  lines.push("");
  lines.push("Readable Artifacts");
  lines.push(formatReadableArtifacts(rows));

  const opaque = analysis.rows
    .filter((artifact) => artifact.display_category === "unknown")
    .slice(0, Math.min(limit, 10));

  if (opaque.length > 0) {
    lines.push("");
    lines.push("Opaque Artifacts");
    lines.push(formatOpaqueArtifacts(opaque));
  }

  if (analysis.tool_links.some((link) => link.match_state !== "exact")) {
    lines.push("");
    lines.push("Tool Link Caveats");
    for (const link of analysis.tool_links.filter((link) => link.match_state !== "exact").slice(0, 8)) {
      lines.push(`${link.match_state}: ${link.call_id ?? link.link_id}`);
    }
  }

  return lines.join("\n");
}

export function formatArtifactDetail(summary: SummaryLike, artifactQuery: string): string {
  const analysis = getLegibility(summary);
  const detail = findArtifactDetail(analysis, artifactQuery);
  if (!detail) return `No artifact matched "${artifactQuery}".`;

  const lines: string[] = [];
  lines.push(detail.display_name);
  lines.push("");
  lines.push(`ID:              ${detail.artifact_id}`);
  lines.push(`Short ID:        ${detail.identity.stable_short_id}`);
  lines.push(`Type:            ${detail.display_category}`);
  lines.push(`Artifact Name:   ${detail.identity.artifact_name}`);
  lines.push(`Exposure:        ${formatNumber(detail.metrics.total_exposure)}`);
  lines.push(`Repeated:        ${formatNumber(detail.metrics.repeated_exposure)}`);
  lines.push(`Inclusions:      ${formatNumber(detail.metrics.inclusion_count)}`);
  if (detail.metrics.distinct_hash_count !== undefined) lines.push(`Distinct Hashes: ${formatNumber(detail.metrics.distinct_hash_count)}`);
  if (detail.metrics.estimated_uncached_input_tokens && detail.metrics.estimated_uncached_input_tokens > 0) {
    lines.push(`Est. Uncached:   ${formatNumber(detail.metrics.estimated_uncached_input_tokens)}`);
    lines.push(`Attribution:     ${detail.metrics.attribution_state ?? "estimated"}`);
  }
  if (detail.persistence.first_seen_at) lines.push(`First Seen:      ${detail.persistence.first_seen_at}`);
  if (detail.persistence.last_seen_at) lines.push(`Last Seen:       ${detail.persistence.last_seen_at}`);
  lines.push(`Storage Mode:    ${detail.privacy.storage_mode}`);
  lines.push(`Preview State:   ${detail.privacy.preview_state}`);

  const detailLines = metadataDetailLines(detail);
  if (detailLines.length > 0) {
    lines.push("");
    lines.push("Details");
    lines.push(...detailLines);
  }

  if (detail.identity.request_ids.length > 0) {
    lines.push("");
    lines.push("First Inclusions");
    for (const requestId of detail.identity.request_ids.slice(0, 12)) lines.push(requestId);
  }

  if (detail.caveats.length > 0) {
    lines.push("");
    lines.push("Caveats");
    for (const caveat of uniqueCaveats(detail.caveats)) lines.push(`${caveat.code}: ${caveat.message}`);
  }

  return lines.join("\n");
}

export function findArtifactDetail(analysis: LegibilityAnalysisResult, query: string): ArtifactDetail | undefined {
  const normalized = String(query ?? "").toLowerCase();
  return analysis.details.find((detail) =>
    detail.artifact_id === query
    || detail.identity.artifact_name === query
    || detail.display_name === query
    || detail.identity.stable_short_id === query
  ) ?? analysis.details.find((detail) =>
    detail.artifact_id.toLowerCase().includes(normalized)
    || detail.identity.artifact_name.toLowerCase().includes(normalized)
    || detail.display_name.toLowerCase().includes(normalized)
    || detail.identity.stable_short_id.toLowerCase().includes(normalized)
  );
}

function readableArtifact(
  artifact: ArtifactAggregate,
  requests: RequestSummary[],
  events: ArtifactEvent[]
): ReadableArtifact {
  const metadata = artifact.metadata ?? {};
  const category = displayCategory(artifact, metadata);
  const event = events[events.length - 1];
  const storageMode = stringValue(event?.storage_mode) ?? stringValue(metadata.storage_mode) ?? "metadata";
  const preview = previewState(storageMode, event, metadata);
  const caveats = [];
  if (category === "unknown") {
    caveats.push(legibilityCaveat(
      LEGIBILITY_CAVEATS.metadataMissing,
      "No readable metadata was captured for this artifact.",
      { analyzer_id: "legibility", artifact_id: artifact.artifact_id },
      "warning"
    ));
  }
  if (preview === "hidden") {
    caveats.push(legibilityCaveat(
      LEGIBILITY_CAVEATS.privacyHidden,
      "Raw content is hidden by the artifact storage mode.",
      { analyzer_id: "legibility", artifact_id: artifact.artifact_id }
    ));
  }
  if (artifact.estimated_cache_attributed_tokens > 0) {
    caveats.push(localAttributionCaveat("legibility"));
  }

  const requestIds = requestIdsForArtifact(requests, artifact.artifact_id);
  const display_name = displayNameForArtifact(artifact, metadata, category);

  return {
    artifact_id: artifact.artifact_id,
    artifact_name: artifact.artifact_name,
    stable_short_id: stableShortId(artifact.artifact_id),
    display_name,
    display_category: category,
    summary: detailSummary(artifact, category),
    tool_name: stringValue(metadata.tool_name),
    call_id: stringValue(metadata.call_id),
    request_id: requestIds[0],
    total_exposure: artifact.total_exposure,
    repeated_exposure: artifact.repeated_exposure,
    inclusion_count: artifact.inclusions,
    attribution_state: artifact.estimated_cache_attributed_tokens > 0 ? "estimated" : undefined,
    storage_mode: storageMode,
    preview_state: preview,
    specificity: metadataSpecificity(metadata, category),
    source_facts: sourceFacts(metadata, category),
    caveats
  };
}

function buildToolLinks(rows: ReadableArtifact[]): ToolCallLink[] {
  const byCall = new Map<string, ReadableArtifact[]>();
  for (const row of rows) {
    if (!row.call_id) continue;
    const list = byCall.get(row.call_id) ?? [];
    list.push(row);
    byCall.set(row.call_id, list);
  }

  const links: ToolCallLink[] = [];
  for (const [callId, linkedRows] of byCall) {
    const call = linkedRows.find((row) => row.display_category === "command" || row.display_category === "patch" || row.display_category === "tool_call");
    const outputs = linkedRows.filter((row) => row.display_category === "command_output");
    const caveats = [];
    let match_state: ToolCallLink["match_state"] = "exact";
    let confidence: ToolCallLink["confidence"] = "high";
    if (!call && outputs.length > 0) {
      match_state = "unmatched_output";
      confidence = "medium";
      caveats.push(legibilityCaveat(
        LEGIBILITY_CAVEATS.toolLinkUnmatched,
        "A tool output was captured without a matching tool call artifact.",
        { analyzer_id: "legibility" },
        "warning"
      ));
    } else if (call && outputs.length === 0) {
      match_state = "unmatched_call";
      confidence = "medium";
      caveats.push(legibilityCaveat(
        LEGIBILITY_CAVEATS.toolLinkUnmatched,
        "A tool call was captured without a matching output artifact.",
        { analyzer_id: "legibility", artifact_id: call.artifact_id },
        "warning"
      ));
    }
    links.push({
      link_id: `tool-link:${callId}`,
      call_id: callId,
      tool_name: call?.tool_name ?? outputs[0]?.tool_name,
      call_artifact_id: call?.artifact_id,
      output_artifact_ids: outputs.map((row) => row.artifact_id),
      match_state,
      confidence,
      evidence: ["call_id"],
      caveats
    });
  }

  return links.sort((a, b) => String(a.link_id).localeCompare(String(b.link_id)));
}

function artifactDetail(
  row: ReadableArtifact,
  artifacts: ArtifactAggregate[],
  requests: RequestSummary[],
  events: ArtifactEvent[],
  toolLinks: ToolCallLink[]
): ArtifactDetail {
  const artifact = artifacts.find((candidate) => candidate.artifact_id === row.artifact_id)!;
  const metadata = artifact.metadata ?? {};
  const request_ids = requestIdsForArtifact(requests, row.artifact_id);
  const hidden_fields = row.preview_state === "hidden" ? hiddenFields(row.display_category) : [];
  const caveats = [...row.caveats];
  const links = toolLinks.filter((link) => link.call_artifact_id === row.artifact_id || link.output_artifact_ids.includes(row.artifact_id));
  caveats.push(...links.flatMap((link) => link.caveats));

  const detail: ArtifactDetail = {
    artifact_id: row.artifact_id,
    display_name: row.display_name,
    display_category: row.display_category,
    identity: {
      artifact_name: row.artifact_name,
      stable_short_id: row.stable_short_id,
      request_ids
    },
    metrics: {
      total_exposure: artifact.total_exposure,
      repeated_exposure: artifact.repeated_exposure,
      inclusion_count: artifact.inclusions,
      distinct_hash_count: Number(artifact.distinct_hashes) || undefined,
      estimated_cached_input_tokens: artifact.estimated_cached_input_tokens || undefined,
      estimated_uncached_input_tokens: artifact.estimated_uncached_input_tokens || undefined,
      attribution_state: artifact.estimated_cache_attributed_tokens > 0 ? "estimated" : undefined
    },
    persistence: {
      first_seen_at: artifact.first_seen_at,
      last_seen_at: artifact.last_seen_at
    },
    privacy: {
      storage_mode: row.storage_mode,
      preview_state: row.preview_state,
      hidden_fields
    },
    tool_links: links,
    caveats
  };

  if (row.display_category === "command" || row.display_category === "command_output") {
    detail.command = {
      command: stringValue(metadata.command),
      workdir: stringValue(metadata.workdir),
      exit_code: numberValue(metadata.exit_code),
      output_preview: row.preview_state === "hidden" ? undefined : stringValue(metadata.output_preview) ?? previewText(events[events.length - 1]),
      preview_state: row.preview_state
    };
  }

  if (row.display_category === "patch") {
    detail.patch = {
      touched_files: stringArrayValue(metadata.touched_files),
      touched_file_count: (numberValue(metadata.patch_file_count) ?? stringArrayValue(metadata.touched_files).length) || undefined,
      adds: numberValue(metadata.patch_adds),
      updates: numberValue(metadata.patch_updates),
      deletes: numberValue(metadata.patch_deletes)
    };
  }

  return detail;
}

function getLegibility(summary: SummaryLike): LegibilityAnalysisResult {
  if ("legibility" in summary && summary.legibility) return summary.legibility;
  return analyzeLegibility(summary.artifacts, summary.requests);
}

function displayCategory(artifact: ArtifactAggregate, metadata: JsonObject): DisplayCategory {
  const kind = stringValue(metadata.content_kind);
  if (kind === "command") return "command";
  if (kind === "command_output") return "command_output";
  if (kind === "patch") return "patch";
  if (kind === "user_message") return "user_message";
  if (kind === "assistant_message") return "assistant_message";
  if (kind === "file_context") return "file_context";
  if (kind === "request_metadata") return "request_metadata";
  const type = artifact.artifact_type.toLowerCase();
  const name = artifact.artifact_name.toLowerCase();
  if (stringValue(metadata.command)) return name.startsWith("tool:") ? "command_output" : "command";
  if (stringArrayValue(metadata.touched_files).length > 0) return "patch";
  if (type.includes("message")) return stringValue(metadata.role) === "assistant" ? "assistant_message" : "user_message";
  if (type.includes("file")) return "file_context";
  if (stringValue(metadata.tool_name)) return "tool_call";
  return "unknown";
}

function displayNameForArtifact(artifact: ArtifactAggregate, metadata: JsonObject, category: DisplayCategory): string {
  const display = stringValue(artifact.display_name) ?? stringValue(metadata.display_name);
  const command = stringValue(metadata.command);
  if (category === "user_message") return stringValue(metadata.prompt_summary) ?? "User message";
  if (category === "assistant_message") return stringValue(metadata.response_summary) ?? "Assistant message";
  if ((category === "command" || category === "command_output") && command) {
    return `${stringValue(metadata.tool_name) ?? "command"}: ${command}`;
  }
  if (category === "patch") {
    const files = stringArrayValue(metadata.touched_files);
    if (display && !isGenericDisplayName(display) && files.length > 0) return `${display} (${files[0]}${files.length > 1 ? ` +${files.length - 1}` : ""})`;
    if (display && !isGenericDisplayName(display)) return display;
    if (files.length > 0) return `${stringValue(metadata.tool_name) ?? "patch"}: ${files[0]}${files.length > 1 ? ` (+${files.length - 1} files)` : ""}`;
  }
  if (display && !isGenericDisplayName(display)) return display;
  if (category === "tool_call") return `${stringValue(metadata.tool_name) ?? "tool"}: ${stringValue(metadata.call_id) ?? stableShortId(artifact.artifact_id)}`;
  if (category === "unknown") return `${artifact.artifact_name} (${stableShortId(artifact.artifact_id)})`;
  return display ?? artifact.artifact_name;
}

function detailSummary(row: ArtifactAggregate, category: DisplayCategory): string {
  const metadata = row.metadata ?? {};
  const command = stringValue(metadata.command);
  if (command) return command;
  const touchedFiles = stringArrayValue(metadata.touched_files);
  if (touchedFiles.length > 0) return `${touchedFiles[0]}${touchedFiles.length > 1 ? ` (+${touchedFiles.length - 1} files)` : ""}`;
  const outputPreview = stringValue(metadata.output_preview);
  if (outputPreview) return outputPreview;
  const callId = stringValue(metadata.call_id);
  if (callId) return callId;
  return category === "unknown" ? "Readable metadata unavailable" : row.artifact_id;
}

function formatReadableArtifacts(rows: ReadableArtifact[]): string {
  if (rows.length === 0) return "No artifact events recorded.";

  const header = [
    pad("Artifact", 44),
    pad("Kind", 16),
    pad("Tool", 14),
    pad("Exposure", 12),
    pad("Incl", 6),
    pad("Preview", 12),
    "Detail"
  ].join("  ");

  const body = rows.map((row) => [
    pad(truncate(row.display_name, 44), 44),
    pad(row.display_category, 16),
    pad(row.tool_name ?? "-", 14),
    pad(formatNumber(row.total_exposure), 12),
    pad(formatNumber(row.inclusion_count), 6),
    pad(row.preview_state, 12),
    truncate(row.summary ?? row.stable_short_id, 52)
  ].join("  "));

  return [header, ...body].join("\n");
}

function formatOpaqueArtifacts(rows: ReadableArtifact[]): string {
  const header = [pad("Artifact", 44), pad("Exposure", 12), pad("Incl", 6), "Why"].join("  ");
  const body = rows.map((row) => [
    pad(truncate(row.display_name, 44), 44),
    pad(formatNumber(row.total_exposure), 12),
    pad(formatNumber(row.inclusion_count), 6),
    row.caveats[0]?.message ?? "Readable metadata unavailable."
  ].join("  "));
  return [header, ...body].join("\n");
}

function metadataDetailLines(detail: ArtifactDetail): string[] {
  const lines: string[] = [];
  const firstLink = detail.tool_links[0];
  if (firstLink?.call_id) lines.push(`Call ID:         ${firstLink.call_id}`);
  if (detail.command) {
    if (detail.command.command) lines.push(`Command:         ${detail.command.command}`);
    if (detail.command.workdir) lines.push(`Workdir:         ${detail.command.workdir}`);
    if (detail.command.exit_code !== undefined) lines.push(`Exit Code:       ${detail.command.exit_code}`);
    if (detail.command.output_preview) lines.push(`Output Preview:  ${detail.command.output_preview}`);
  }
  if (detail.patch) {
    if (detail.patch.touched_file_count !== undefined) lines.push(`Patch Files:     ${formatNumber(detail.patch.touched_file_count)}`);
    if (detail.patch.adds !== undefined || detail.patch.updates !== undefined || detail.patch.deletes !== undefined) {
      lines.push(`Patch Shape:     +${formatNumber(detail.patch.adds ?? 0)} / ~${formatNumber(detail.patch.updates ?? 0)} / -${formatNumber(detail.patch.deletes ?? 0)}`);
    }
    if (detail.patch.touched_files && detail.patch.touched_files.length > 0) {
      lines.push("Touched Files:");
      for (const file of detail.patch.touched_files.slice(0, 20)) lines.push(`  ${file}`);
    }
  }
  if (detail.tool_links.length > 0) {
    lines.push("Tool Links:");
    for (const link of detail.tool_links) lines.push(`  ${link.match_state}: ${link.call_id ?? link.link_id}`);
  }
  if (detail.privacy.hidden_fields.length > 0) lines.push(`Hidden Fields:   ${detail.privacy.hidden_fields.join(", ")}`);
  return lines;
}

function metadataSpecificity(metadata: JsonObject, category: DisplayCategory): number {
  let score = category === "unknown" ? 0 : 1;
  if (stringValue(metadata.tool_name)) score += 1;
  if (stringValue(metadata.call_id)) score += 1;
  if (stringValue(metadata.command)) score += 4;
  if (stringValue(metadata.workdir)) score += 2;
  if (stringValue(metadata.output_preview)) score += 2;
  if (stringArrayValue(metadata.touched_files).length > 0) score += 4;
  if (stringValue(metadata.display_name) && !isGenericDisplayName(stringValue(metadata.display_name))) score += 2;
  return score;
}

function sourceFacts(metadata: JsonObject, category: DisplayCategory): string[] {
  const facts: string[] = [category];
  for (const key of ["display_name", "tool_name", "call_id", "command", "workdir", "output_preview", "touched_files"]) {
    if (metadata[key] !== undefined) facts.push(key);
  }
  return facts;
}

function previewState(storageMode: string, event: ArtifactEvent | undefined, metadata: JsonObject): PreviewState {
  if (storageMode === "raw") return "raw_available";
  if (storageMode === "preview") return event?.preview || stringValue(metadata.output_preview) ? "preview" : "unavailable";
  return "hidden";
}

function hiddenFields(category: DisplayCategory): string[] {
  if (category === "command_output") return ["output_preview", "raw_content"];
  if (category === "user_message" || category === "assistant_message") return ["message_content"];
  if (category === "file_context") return ["file_content"];
  return ["raw_content"];
}

function requestIdsForArtifact(requests: RequestSummary[], artifactId: string): string[] {
  return requests
    .filter((request) => request.artifacts.some((entry) => entry.artifact_id === artifactId))
    .map((request) => request.request_id);
}

function groupEventsByArtifact(events: ArtifactEvent[]): Map<string, ArtifactEvent[]> {
  const map = new Map<string, ArtifactEvent[]>();
  for (const event of events) {
    const list = map.get(event.artifact_id) ?? [];
    list.push(event);
    map.set(event.artifact_id, list);
  }
  return map;
}

function uniqueCaveats(caveats: ReturnType<typeof localAttributionCaveat>[]): ReturnType<typeof localAttributionCaveat>[] {
  const seen = new Set<string>();
  const result = [];
  for (const caveat of caveats) {
    const key = `${caveat.code}:${caveat.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(caveat);
  }
  return result;
}

function previewText(event: ArtifactEvent | undefined): string | undefined {
  if (!event?.preview) return undefined;
  const head = stringValue(event.preview.head) ?? "";
  const tail = stringValue(event.preview.tail) ?? "";
  return `${head}${tail ? `...${tail}` : ""}` || undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isGenericDisplayName(value: unknown): boolean {
  const text = String(value ?? "");
  return /^tool:[^:]+:call_/.test(text)
    || /^tool-call:[^:]+:call_/.test(text)
    || /^input:[^:]+:\d+$/.test(text);
}

function pad(value: unknown, width: number): string {
  return String(value).padEnd(width, " ");
}

function truncate(value: unknown, width: number): string {
  const text = String(value);
  return text.length <= width ? text : `${text.slice(0, width - 3)}...`;
}
