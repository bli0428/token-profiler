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

export function formatArtifactDetail(summary: RunAnalysisSummary | AggregateSummary, artifactQuery: string): string {
  const analysis = "legibility" in summary && summary.legibility
    ? summary.legibility
    : analyzeLegibility(summary.artifacts, summary.requests);
  const detail = findArtifactDetail(analysis, artifactQuery);
  if (!detail) return `No artifact matched "${artifactQuery}".`;

  const lines: string[] = [
    detail.display_name,
    "",
    `ID:              ${detail.artifact_id}`,
    `Short ID:        ${detail.identity.stable_short_id}`,
    `Type:            ${detail.display_category}`,
    `Artifact Name:   ${detail.identity.artifact_name}`,
    `Stored As:       ${detail.privacy.storage_mode}`,
    `Preview State:   ${detail.privacy.preview_state}`
  ];

  if (detail.command?.output_preview) lines.push(`Output Preview:  ${detail.command.output_preview}`);
  if (detail.privacy.hidden_fields.length > 0) lines.push(`Hidden Fields:   ${detail.privacy.hidden_fields.join(", ")}`);

  if (detail.caveats.length > 0) {
    lines.push("");
    lines.push("Caveats");
    for (const caveat of detail.caveats) lines.push(`${caveat.code}: ${caveat.message}`);
  }

  return lines.join("\n");
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
      "Raw content is hidden by the artifact storage policy.",
      { analyzer_id: "legibility", artifact_id: artifact.artifact_id }
    ));
  }
  if (artifact.normalized_estimated_input_tokens > 0) {
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
    attribution_state: artifact.normalized_estimated_input_tokens > 0 ? "estimated" : undefined,
    storage_mode: storageMode,
    preview_state: preview,
    title_candidate: booleanValue(metadata.title_candidate),
    message_source: stringValue(metadata.message_source),
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
      attribution_state: artifact.normalized_estimated_input_tokens > 0 ? "estimated" : undefined
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

  const content = contentForDetail(row.preview_state, events[events.length - 1], row.display_category);
  if (content) detail.content = content;

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

function displayCategory(artifact: ArtifactAggregate, metadata: JsonObject): DisplayCategory {
  // Transitional bridge: adapters should eventually emit typed canonical
  // metadata variants so this analyzer can switch on kind instead of inferring
  // from loose fields such as command, tool_name, touched_files, or names.
  const kind = stringValue(metadata.content_kind);
  if (kind === "command") return "command";
  if (kind === "command_output" || kind === "tool_output") return "command_output";
  if (kind === "patch") return "patch";
  if (kind === "user_message") return "user_message";
  if (kind === "assistant_message") return "assistant_message";
  if (kind === "file_context") return "file_context";
  if (kind === "request_metadata" || kind === "system_prompt" || kind === "tool_definition") return "request_metadata";
  if (kind === "reasoning_state") return "reasoning_state";
  const type = artifact.artifact_type.toLowerCase();
  const name = artifact.artifact_name.toLowerCase();
  if (/^summary:input:reasoning:\d+$/i.test(artifact.artifact_id) || /^input:reasoning:\d+$/i.test(artifact.artifact_name)) return "reasoning_state";
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
  if (category === "reasoning_state") return "Reasoning state";
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
  if (category === "reasoning_state") return "Opaque provider state carried between requests.";
  const callId = stringValue(metadata.call_id);
  if (callId) return callId;
  return category === "unknown" ? "Readable metadata unavailable" : row.artifact_id;
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
  for (const key of ["display_name", "tool_name", "call_id", "command", "workdir", "output_preview", "touched_files", "message_source", "title_candidate", "source_protocol", "source_protocol_type", "source_item_index", "source_role", "source_tool_name"]) {
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

function previewText(event: ArtifactEvent | undefined): string | undefined {
  if (!event?.preview) return undefined;
  const head = stringValue(event.preview.head) ?? "";
  const tail = stringValue(event.preview.tail) ?? "";
  return `${head}${tail ? `...${tail}` : ""}` || undefined;
}

function contentForDetail(previewState: PreviewState, event: ArtifactEvent | undefined, category?: DisplayCategory): ArtifactDetail["content"] | undefined {
  if (category === "reasoning_state") return undefined;
  if (previewState === "hidden" || previewState === "unavailable") return undefined;
  if (previewState === "raw_available" && event?.content) return { raw: event.content };
  const preview = previewText(event);
  return preview ? { preview } : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
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
