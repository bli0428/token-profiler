import { analyzeLegibility, findArtifactDetail } from "../../analysis/legibility.ts";
import type {
  AggregateSummary,
  ArtifactAggregate
} from "../../core/events/types.ts";
import type {
  ArtifactDetail,
  LegibilityAnalysisResult,
  ReadableArtifact,
  RunAnalysisSummary
} from "../../analysis/types.ts";

type SummaryLike = RunAnalysisSummary | AggregateSummary;

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
  lines.push(`Stored As:       ${detail.privacy.storage_mode}`);
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

function getLegibility(summary: SummaryLike): LegibilityAnalysisResult {
  if ("legibility" in summary && summary.legibility) return summary.legibility;
  return analyzeLegibility(summary.artifacts, summary.requests);
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

function uniqueCaveats(caveats: ArtifactDetail["caveats"]): ArtifactDetail["caveats"] {
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

function pad(value: unknown, width: number): string {
  return String(value).padEnd(width, " ");
}

function truncate(value: unknown, width: number): string {
  const text = String(value);
  return text.length <= width ? text : `${text.slice(0, width - 3)}...`;
}

function formatNumber(value: unknown): string {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(value) || 0));
}
