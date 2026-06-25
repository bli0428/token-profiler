import { formatNumber, formatPercent } from "./report.js";

export function formatLegibilityReport(summary, { limit = 20 } = {}) {
  const rows = summary.artifacts
    .filter((artifact) => hasLegibilityMetadata(artifact))
    .sort((a, b) => legibilitySortValue(b) - legibilitySortValue(a))
    .slice(0, limit);

  const lines = [];
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

export function formatArtifactDetail(summary, artifactQuery) {
  const artifact = findArtifact(summary, artifactQuery);
  if (!artifact) {
    return `No artifact matched "${artifactQuery}".`;
  }

  const metadata = artifact.metadata ?? {};
  const lines = [];
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
    .filter((request) => request.artifacts.some((entry) => entry.artifact_id === artifact.artifact_id))
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

function formatReadableArtifacts(rows) {
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

  const body = rows.map((row) => [
    pad(truncate(displayName(row), 44), 44),
    pad(row.metadata?.content_kind ?? "-", 16),
    pad(row.metadata?.tool_name ?? "-", 14),
    pad(formatMaybeNumber(row.estimated_uncached_input_tokens), 15),
    pad(formatNumber(row.total_exposure), 12),
    pad(formatNumber(row.inclusions), 6),
    truncate(detailSummary(row), 52)
  ].join("  "));

  return [header, ...body].join("\n");
}

function formatOpaqueArtifacts(rows) {
  const header = [
    pad("Artifact", 44),
    pad("Type", 14),
    pad("Exposure", 12),
    pad("Incl", 6),
    "Replay"
  ].join("  ");

  const body = rows.map((row) => [
    pad(truncate(row.artifact_name, 44), 44),
    pad(row.artifact_type, 14),
    pad(formatNumber(row.total_exposure), 12),
    pad(formatNumber(row.inclusions), 6),
    formatPercent(row.replay_ratio)
  ].join("  "));

  return [header, ...body].join("\n");
}

function detailSummary(row) {
  const metadata = row.metadata ?? {};
  if (metadata.command) return metadata.command;
  if (metadata.touched_files?.length > 0) {
    const first = metadata.touched_files[0];
    const suffix = metadata.touched_files.length > 1 ? ` (+${metadata.touched_files.length - 1} files)` : "";
    return `${first}${suffix}`;
  }
  if (metadata.output_preview) return metadata.output_preview;
  if (metadata.call_id) return metadata.call_id;
  return row.artifact_id;
}

function metadataDetails(metadata) {
  const details = [];
  if (metadata.tool_name) details.push(`Tool:            ${metadata.tool_name}`);
  if (metadata.call_id) details.push(`Call ID:         ${metadata.call_id}`);
  if (metadata.content_kind) details.push(`Kind:            ${metadata.content_kind}`);
  if (metadata.command) details.push(`Command:         ${metadata.command}`);
  if (metadata.workdir) details.push(`Workdir:         ${metadata.workdir}`);
  if (metadata.exit_code !== undefined) details.push(`Exit Code:       ${metadata.exit_code}`);
  if (metadata.output_preview) details.push(`Output Preview:  ${metadata.output_preview}`);
  if (metadata.patch_file_count !== undefined) {
    details.push(`Patch Files:     ${formatNumber(metadata.patch_file_count)}`);
    details.push(`Patch Shape:     +${formatNumber(metadata.patch_adds ?? 0)} / ~${formatNumber(metadata.patch_updates ?? 0)} / -${formatNumber(metadata.patch_deletes ?? 0)}`);
  }
  if (metadata.touched_files?.length > 0) {
    details.push("Touched Files:");
    for (const file of metadata.touched_files.slice(0, 20)) details.push(`  ${file}`);
    if (metadata.touched_files.length > 20) {
      details.push(`  ...and ${formatNumber(metadata.touched_files.length - 20)} more`);
    }
  }
  return details;
}

function findArtifact(summary, query) {
  const normalized = String(query ?? "").toLowerCase();
  return summary.artifacts.find((artifact) =>
    artifact.artifact_id === query
    || artifact.artifact_name === query
    || displayName(artifact) === query
  ) ?? summary.artifacts.find((artifact) =>
    artifact.artifact_id.toLowerCase().includes(normalized)
    || artifact.artifact_name.toLowerCase().includes(normalized)
    || displayName(artifact).toLowerCase().includes(normalized)
  );
}

function hasLegibilityMetadata(artifact) {
  const metadata = artifact.metadata ?? {};
  return Boolean(
    metadata.display_name
    || metadata.tool_name
    || metadata.content_kind
    || metadata.command
    || metadata.touched_files?.length
    || metadata.output_preview
  );
}

function legibilitySortValue(artifact) {
  return artifact.estimated_uncached_input_tokens || artifact.total_exposure;
}

function displayName(artifact) {
  return artifact.display_name ?? artifact.metadata?.display_name ?? artifact.artifact_name;
}

function formatMaybeNumber(value) {
  return value > 0 ? formatNumber(value) : "-";
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

function truncate(value, width) {
  const text = String(value);
  return text.length <= width ? text : `${text.slice(0, width - 3)}...`;
}
