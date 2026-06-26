import { writeFile } from "node:fs/promises";
import type { RunAnalysisSummary } from "../analysis/types.ts";
import { formatNumber, formatPercent } from "./cli/report-renderer.ts";

/**
 * Writes a static HTML report from precomputed analyzer results.
 *
 * Like the CLI renderer, this surface only formats metrics that analyzers have
 * already derived. It intentionally does not inspect canonical events directly.
 */
export async function createHtmlReport(summary: RunAnalysisSummary, outPath: string): Promise<void> {
  await writeFile(outPath, renderHtml(summary), "utf8");
}

function renderHtml(summary: RunAnalysisSummary): string {
  const { totals } = summary;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Token Profiler Report</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1c2430;
      --muted: #5f6b7a;
      --line: #d9dee7;
      --paper: #f7f8fb;
      --accent: #0f766e;
      --warn: #b45309;
      --panel: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.45;
    }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 48px; }
    h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 28px 0 12px; font-size: 17px; letter-spacing: 0; }
    .subtle { color: var(--muted); margin: 0 0 24px; }
    .metrics { display: grid; grid-template-columns: repeat(5, minmax(150px, 1fr)); gap: 12px; }
    .metric { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-height: 92px; }
    .metric span { display: block; color: var(--muted); font-size: 12px; margin-bottom: 8px; }
    .metric strong { display: block; font-size: 24px; letter-spacing: 0; }
    table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; white-space: nowrap; }
    th { color: var(--muted); font-size: 12px; font-weight: 650; background: #eef2f6; }
    tr:last-child td { border-bottom: 0; }
    .name { white-space: normal; min-width: 240px; font-weight: 650; }
    .bar { width: 100%; min-width: 120px; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
    .bar > span { display: block; height: 100%; background: var(--accent); }
    .bar.warn > span { background: var(--warn); }
    .caveat { color: var(--muted); margin: 10px 0 0; }
    @media (max-width: 850px) {
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      table { display: block; overflow-x: auto; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Token Profiler Report</h1>
    <p class="subtle">Context exposure, replay, and request composition from recorded prompt artifacts.</p>
    <section class="metrics">
      ${metric("Total Exposure", formatNumber(totals.total_exposure))}
      ${metric("Unique Exposure", formatNumber(totals.unique_exposure))}
      ${metric("Repeated Exposure", formatNumber(totals.repeated_exposure))}
      ${metric("Replay Ratio", formatPercent(totals.replay_ratio))}
      ${metric("Efficiency", formatPercent(totals.context_efficiency))}
    </section>
    ${cacheMetrics(summary)}
    <h2>Top Contributors</h2>
    ${artifactTable(summary.top_contributors, "total_exposure", "Exposure Share")}
    <h2>Replay Hotspots</h2>
    ${artifactTable(summary.replay_hotspots, "repeated_exposure", "Repeated Share", true)}
    <h2>Request Timeline</h2>
    ${requestTable(summary.requests)}
  </main>
</body>
</html>`;
}

function metric(label: string, value: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function cacheMetrics(summary: RunAnalysisSummary): string {
  const { totals } = summary;
  if (!totals.usage_request_count) return "";
  const caveats = summary.caveats
    .filter((caveat) => caveat.applies_to?.analyzer_id === "cache-attribution")
    .map((caveat) => `<p class="caveat">${escapeHtml(caveat.message)}</p>`)
    .join("");
  return `<h2>Prompt Cache</h2>
    <section class="metrics">
      ${metric("Input Tokens", formatNumber(totals.input_tokens))}
      ${metric("Cached Tokens", formatNumber(totals.cached_input_tokens))}
      ${metric("Uncached Tokens", formatNumber(totals.uncached_input_tokens))}
      ${metric("Cache Hit Ratio", formatPercent(totals.cache_hit_ratio))}
    </section>${caveats}`;
}

function artifactTable(rows: any[], metricName: string, shareLabel: string, warn = false): string {
  if (rows.length === 0) return "<p>No artifact events recorded.</p>";
  const max = Math.max(...rows.map((row) => Number(row[metricName]) || 0), 1);
  return `<table>
    <thead><tr><th>Artifact</th><th>Type</th><th>${escapeHtml(shareLabel)}</th><th>Tokens</th><th>Inclusions</th><th>Replay</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td class="name">${escapeHtml(row.display_name ?? row.artifact_name)}</td>
      <td>${escapeHtml(row.artifact_type)}</td>
      <td><div class="bar ${warn ? "warn" : ""}"><span style="width: ${Math.round(((Number(row[metricName]) || 0) / max) * 100)}%"></span></div></td>
      <td>${formatNumber(row[metricName])}</td>
      <td>${formatNumber(row.inclusions)}</td>
      <td>${formatPercent(row.replay_ratio)}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}

function requestTable(requests: any[]): string {
  if (requests.length === 0) return "<p>No requests recorded.</p>";
  return `<table>
    <thead><tr><th>Request</th><th>Total Exposure</th><th>Cached Input</th><th>Artifacts</th></tr></thead>
    <tbody>${requests.map((request) => `<tr>
      <td class="name">${escapeHtml(request.request_id)}</td>
      <td>${formatNumber(request.total_exposure)}</td>
      <td>${request.usage ? `${formatNumber(request.usage.cached_input_tokens)} (${formatPercent(request.usage.cache_hit_ratio)})` : "-"}</td>
      <td>${escapeHtml(request.artifacts.map((artifact: any) => `${artifact.artifact_name} (${formatNumber(artifact.token_count)})`).join(", "))}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
