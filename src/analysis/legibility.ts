import { formatNumber, formatPercent } from "../report.js";
import type { AggregateSummary, ArtifactAggregate, JsonObject, RequestSummary } from "../core/events/types.ts";

export function formatLegibilityReport(summary: AggregateSummary, { limit = 20 }: { limit?: number } = {}): string {
  const rows = summary.artifacts
    .filter((artifact) => hasLegibilityMetadata(artifact))
    .sort((a, b) => legibilitySortValue(b) - legibilitySortValue(a))
    .slice(0, limit);

  const lines: string[] = [];
  lines.push("Artifact Legibility Report");
  lines.push("");
  lines.push("Readable Artifacts");
  lines.push(formatReadableArtifacts(rows));

  const opaque = summary.artifacts
    .filter((artifact) => !hasLegibilityMetadata(artifact))
    .sort((a, b) => b.total_exposure - a.total_exposure)
    .slice(0, Math.min(limit, 10));

  if (opaque.length > 0) {
    lines.push("");
    lines.push("Opaque Artifacts");
    lines.push(formatOpaqueArtifacts(opaque));
  }

  return lines.join("\n");
}

export function formatArtifactDetail(summary: AggregateSummary, artifactQuery: string): string {
  const artifact = findArtifact(summary, artifactQuery);
  if (!artifact) {
    return `No artifact matched "${artifactQuery}".`;
  }

  const metadata = artifact.metadata ?? {};
  const lines: string[] = [];
  lines.push(displayName(artifact));
  lines.push("");
  lines.push(`ID:              ${artifact.artifact_id}`);
  lines.push(`Type:            ${artifact.artifact_type}`);
  lines.push(`Exposure:        ${formatNumber(artifact.total_exposure)}`);
  lines.push(`Repeated:        ${formatNumber(artifact.repeated_exposure)} (${formatPercent(artifact.replay_ratio)})`);
  lines.push(`Inclusions:      ${formatNumber(artifact.inclusions)}`);
  lines.push(`Distinct Hashes: ${formatNumber(artifact.distinct_hashes)}`);
  if (artifact.estimated_cache_attributed_tokens > 0) {
    lines.push(`Est. Uncached:   ${formatNumber(artifact.estimated_uncached_input_tokens)}`);
    lines.push(`Est. Cache Hit:  ${formatPercent(artifact.estimated_cache_hit_ratio)}`);
  }
  lines.push(`First Seen:      ${artifact.first_seen_at}`);
  lines.push(`Last Seen:       ${artifact.last_seen_at}`);

  const details = metadataDetails(metadata);
  if (details.length > 0) {
    lines.push("");
    lines.push("Details");
    for (const detail of details) lines.push(detail);
  }

  const requests = summary.requests
    .filter((request: RequestSummary) => request.artifacts.some((entry) => entry.artifact_id === artifact.artifact_id))
    .slice(0, 12);
  if (requests.length > 0) {
    lines.push("");
    lines.push("First Inclusions");
    for (const request of requests) {
      lines.push(`${request.timestamp}  ${request.request_id}  ${formatNumber(request.total_exposure)} tokens`);
    }
  }

  return lines.join("\n");
}

function formatReadableArtifacts(rows: ArtifactAggregate[]): string {
  if (rows.length === 0) {
    return "No legibility metadata recorded. Capture a new run with the updated proxy to populate this section.";
  }

  const header = [
    pad("Artifact", 44),
    pad("Kind", 16),
    pad("Tool", 14),
    pad("Est. Uncached", 15),
    pad("Exposure", 12),
    pad("Incl", 6),
    "Detail"
  ].join("  ");

  const body = rows.map((row: ArtifactAggregate) => [
    pad(truncate(displayName(row), 44), 44),
    pad(stringMetadata(row.metadata, "content_kind") ?? "-", 16),
    pad(stringMetadata(row.metadata, "tool_name") ?? "-", 14),
    pad(formatMaybeNumber(row.estimated_uncached_input_tokens), 15),
    pad(formatNumber(row.total_exposure), 12),
    pad(formatNumber(row.inclusions), 6),
    truncate(detailSummary(row), 52)
  ].join("  "));

  return [header, ...body].join("\n");
}

function formatOpaqueArtifacts(rows: ArtifactAggregate[]): string {
  const header = [
    pad("Artifact", 44),
    pad("Type", 14),
    pad("Exposure", 12),
    pad("Incl", 6),
    "Replay"
  ].join("  ");

  const body = rows.map((row: ArtifactAggregate) => [
    pad(truncate(row.artifact_name, 44), 44),
    pad(row.artifact_type, 14),
    pad(formatNumber(row.total_exposure), 12),
    pad(formatNumber(row.inclusions), 6),
    formatPercent(row.replay_ratio)
  ].join("  "));

  return [header, ...body].join("\n");
}

function detailSummary(row: ArtifactAggregate): string {
  const metadata = row.metadata ?? {};
  const command = stringMetadata(metadata, "command");
  if (command) return command;
  const touchedFiles = stringArrayMetadata(metadata, "touched_files");
  if (touchedFiles.length > 0) {
    const first = touchedFiles[0];
    const suffix = touchedFiles.length > 1 ? ` (+${touchedFiles.length - 1} files)` : "";
    return `${first}${suffix}`;
  }
  const outputPreview = stringMetadata(metadata, "output_preview");
  if (outputPreview) return outputPreview;
  const callId = stringMetadata(metadata, "call_id");
  if (callId) return callId;
  return row.artifact_id;
}

function metadataDetails(metadata: JsonObject): string[] {
  const details: string[] = [];
  const toolName = stringMetadata(metadata, "tool_name");
  const callId = stringMetadata(metadata, "call_id");
  const contentKind = stringMetadata(metadata, "content_kind");
  const command = stringMetadata(metadata, "command");
  const workdir = stringMetadata(metadata, "workdir");
  const outputPreview = stringMetadata(metadata, "output_preview");
  const touchedFiles = stringArrayMetadata(metadata, "touched_files");
  if (toolName) details.push(`Tool:            ${toolName}`);
  if (callId) details.push(`Call ID:         ${callId}`);
  if (contentKind) details.push(`Kind:            ${contentKind}`);
  if (command) details.push(`Command:         ${command}`);
  if (workdir) details.push(`Workdir:         ${workdir}`);
  if (metadata.exit_code !== undefined) details.push(`Exit Code:       ${metadata.exit_code}`);
  if (outputPreview) details.push(`Output Preview:  ${outputPreview}`);
  if (metadata.patch_file_count !== undefined) {
    details.push(`Patch Files:     ${formatNumber(metadata.patch_file_count)}`);
    details.push(`Patch Shape:     +${formatNumber(metadata.patch_adds ?? 0)} / ~${formatNumber(metadata.patch_updates ?? 0)} / -${formatNumber(metadata.patch_deletes ?? 0)}`);
  }
  if (touchedFiles.length > 0) {
    details.push("Touched Files:");
    for (const file of touchedFiles.slice(0, 20)) details.push(`  ${file}`);
    if (touchedFiles.length > 20) {
      details.push(`  ...and ${formatNumber(touchedFiles.length - 20)} more`);
    }
  }
  return details;
}

function findArtifact(summary: AggregateSummary, query: string): ArtifactAggregate | undefined {
  const normalized = String(query ?? "").toLowerCase();
  return summary.artifacts.find((artifact: ArtifactAggregate) =>
    artifact.artifact_id === query
    || artifact.artifact_name === query
    || displayName(artifact) === query
  ) ?? summary.artifacts.find((artifact: ArtifactAggregate) =>
    artifact.artifact_id.toLowerCase().includes(normalized)
    || artifact.artifact_name.toLowerCase().includes(normalized)
    || displayName(artifact).toLowerCase().includes(normalized)
  );
}

function hasLegibilityMetadata(artifact: ArtifactAggregate): boolean {
  const metadata = artifact.metadata ?? {};
  const touchedFiles = stringArrayMetadata(metadata, "touched_files");
  return Boolean(
    stringMetadata(metadata, "display_name")
    || stringMetadata(metadata, "tool_name")
    || stringMetadata(metadata, "content_kind")
    || stringMetadata(metadata, "command")
    || touchedFiles.length
    || stringMetadata(metadata, "output_preview")
  );
}

function legibilitySortValue(artifact: ArtifactAggregate): number {
  return artifact.estimated_uncached_input_tokens || artifact.total_exposure;
}

function displayName(artifact: ArtifactAggregate): string {
  return String(artifact.display_name ?? stringMetadata(artifact.metadata, "display_name") ?? artifact.artifact_name);
}

function formatMaybeNumber(value: unknown): string {
  return Number(value) > 0 ? formatNumber(value) : "-";
}

function pad(value: unknown, width: number): string {
  return String(value).padEnd(width, " ");
}

function truncate(value: unknown, width: number): string {
  const text = String(value);
  return text.length <= width ? text : `${text.slice(0, width - 3)}...`;
}

function stringMetadata(metadata: JsonObject | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function stringArrayMetadata(metadata: JsonObject | undefined, key: string): string[] {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
