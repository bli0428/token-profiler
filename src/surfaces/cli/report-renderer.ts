import type { RunAnalysisSummary } from "../../analysis/types.ts";

/**
 * Renders the analyzer summary as the CLI text report.
 *
 * This renderer formats already-derived metrics only; it must not recompute
 * exposure, replay, cache attribution, or contributor rankings.
 */
export function formatSummary(summary: RunAnalysisSummary): string {
  const { totals } = summary;
  const lines: string[] = [];

  lines.push("Token Profiler Report");
  lines.push("");
  lines.push(`Total Exposure:      ${formatNumber(totals.total_exposure)}`);
  lines.push(`Unique Exposure:     ${formatNumber(totals.unique_exposure)}`);
  lines.push(`Repeated Exposure:   ${formatNumber(totals.repeated_exposure)}`);
  lines.push(`Replay Ratio:        ${formatPercent(totals.replay_ratio)}`);
  lines.push(`Context Efficiency:  ${formatPercent(totals.context_efficiency)}`);
  lines.push(`Requests:            ${formatNumber(totals.request_count)}`);
  lines.push(`Artifacts:           ${formatNumber(totals.artifact_count)}`);

  if (Number(totals.usage_request_count) > 0) {
    lines.push("");
    lines.push("Prompt Cache");
    lines.push(`Input Tokens:        ${formatNumber(totals.input_tokens)}`);
    lines.push(`Cached Tokens:       ${formatNumber(totals.cached_input_tokens)}`);
    lines.push(`Uncached Tokens:     ${formatNumber(totals.uncached_input_tokens)}`);
    lines.push(`Cache Hit Ratio:     ${formatPercent(totals.cache_hit_ratio)}`);
    lines.push(`Attribution Coverage: ${formatNumber(totals.estimated_cache_attributed_tokens)} (${formatPercent(totals.estimated_cache_attribution_coverage)})`);
    for (const caveat of summary.caveats.filter((caveat) => caveat.applies_to?.analyzer_id === "cache-attribution")) {
      lines.push(`Note: ${caveat.message}`);
    }
    lines.push("");
    lines.push("Estimated Cost Drivers");
    lines.push(formatCostDrivers(summary.cost_drivers));
  }

  lines.push("");
  lines.push("Context Bloat");
  lines.push(formatContextBloat(summary.context_bloat));

  lines.push("");
  lines.push("Top Contributors");
  lines.push(formatTable(summary.top_contributors, "total_exposure"));
  lines.push("");
  lines.push("Replay Hotspots");
  lines.push(formatTable(summary.replay_hotspots, "repeated_exposure"));

  return lines.join("\n");
}

function formatCostDrivers(rows: any[]) {
  if (!rows || rows.length === 0) return "No cache-attributed artifact events recorded.";
  const header = [pad("Artifact", 30), pad("Type", 14), pad("Est. Uncached", 15), pad("Exposure", 12), "Est. Cache Hit"].join("  ");
  const body = rows.map((row) => [
    pad(truncate(displayName(row), 30), 30),
    pad(row.artifact_type, 14),
    pad(formatNumber(row.estimated_uncached_input_tokens), 15),
    pad(formatNumber(row.total_exposure), 12),
    formatPercent(row.estimated_cache_hit_ratio)
  ].join("  "));
  return [header, ...body].join("\n");
}

function formatContextBloat(rows: any[]) {
  if (!rows || rows.length === 0) return "No artifact events recorded.";
  const header = [pad("Artifact", 30), pad("Type", 14), pad("Exposure", 12), pad("Replay", 12), "Replay Ratio"].join("  ");
  const body = rows.map((row) => [
    pad(truncate(displayName(row), 30), 30),
    pad(row.artifact_type, 14),
    pad(formatNumber(row.total_exposure), 12),
    pad(formatNumber(row.repeated_exposure), 12),
    formatPercent(row.replay_ratio)
  ].join("  "));
  return [header, ...body].join("\n");
}

function formatTable(rows: any[], sortMetric: string) {
  if (rows.length === 0) return "No artifact events recorded.";
  const header = [pad("Artifact", 30), pad("Type", 14), pad("Exposure", 12), pad("Incl", 7), pad("Replay", 10), "Share"].join("  ");
  const body = rows.map((row) => [
    pad(truncate(displayName(row), 30), 30),
    pad(row.artifact_type, 14),
    pad(formatNumber(row[sortMetric]), 12),
    pad(formatNumber(row.inclusions), 7),
    pad(formatPercent(row.replay_ratio), 10),
    formatPercent(row.exposure_share)
  ].join("  "));
  return [header, ...body].join("\n");
}

/**
 * Rounds token-like metrics to whole numbers for display.
 *
 * Analyzer internals may use fractional values after proportional coordinate
 * scaling; the CLI presents those estimates as rounded token counts.
 */
export function formatNumber(value: unknown): string {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(value) || 0));
}

/**
 * Formats ratios as percentages with one decimal place.
 *
 * Example: `0.1234` is rendered as `12.3%`.
 */
export function formatPercent(value: unknown): string {
  return `${Math.round((Number(value) || 0) * 1000) / 10}%`;
}

function pad(value: unknown, width: number): string {
  return String(value).padEnd(width, " ");
}

function truncate(value: unknown, width: number): string {
  const text = String(value);
  return text.length <= width ? text : `${text.slice(0, width - 3)}...`;
}

function displayName(row: any): string {
  return row.display_name ?? row.metadata?.display_name ?? row.artifact_name;
}
