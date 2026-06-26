import { formatNumber, formatPercent } from "../cli/report-renderer.ts";
import { DASHBOARD_CSS, DASHBOARD_SCRIPT } from "./assets.ts";
import type {
  DashboardArtifactDetail,
  DashboardArtifactRow,
  DashboardCaveat,
  DashboardMetadataSection,
  DashboardSessionIndex,
  DashboardViewModel
} from "./types.ts";

export function renderDashboardHtml(model: DashboardViewModel): string {
  const maxExposure = Math.max(...model.artifacts.map((row) => row.total_exposure), 1);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Token Profiler Dashboard</title>
  <style>${DASHBOARD_CSS}</style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Token Profiler Dashboard</h1>
        <div class="subtle">${escapeHtml(model.run_id ?? model.session?.run_id ?? "Local run")} · generated ${escapeHtml(model.generated_at)}</div>
      </div>
      <span class="pill">${escapeHtml(model.privacy.storage_mode)} mode</span>
    </header>
    ${overview(model)}
    ${caveats(model.caveats)}
    ${taskNavigation(model)}
    <div class="layout">
      <section class="panel">
        <h2>Artifacts</h2>
        ${controls(model)}
        ${artifactTable(model.artifacts, maxExposure)}
      </section>
      <aside class="panel detail" data-detail>
        ${firstDetail(model)}
      </aside>
    </div>
    ${detailTemplates(model)}
  </main>
  <script type="application/json" id="dashboard-data">${escapeHtml(JSON.stringify(model))}</script>
  <script>${DASHBOARD_SCRIPT}</script>
</body>
</html>`;
}

export function renderDashboardSessionIndexHtml(index: DashboardSessionIndex): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Token Profiler Sessions</title>
  <style>${DASHBOARD_CSS}</style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Token Profiler Sessions</h1>
        <div class="subtle">Generated ${escapeHtml(index.generated_at)}</div>
      </div>
      <span class="pill">${formatNumber(index.sessions.length)} sessions</span>
    </header>
    ${caveats(index.caveats)}
    <section class="panel">
      <h2>Recent Sessions</h2>
      ${sessionTable(index)}
    </section>
  </main>
</body>
</html>`;
}

function overview(model: DashboardViewModel): string {
  const overview = model.overview;
  return `<section class="metric-grid" data-overview>
    ${metric("Input", valueOrDash(overview.input_tokens))}
    ${metric("Cached", valueOrDash(overview.cached_input_tokens))}
    ${metric("Uncached", valueOrDash(overview.uncached_input_tokens))}
    ${metric("Output", valueOrDash(overview.output_tokens))}
    ${metric("Exposure", formatNumber(overview.total_exposure))}
    ${metric("Repeated", formatNumber(overview.repeated_exposure))}
    ${metric("Replay", overview.replay_ratio === undefined ? "-" : formatPercent(overview.replay_ratio))}
    ${metric("Efficiency", overview.context_efficiency === undefined ? "-" : formatPercent(overview.context_efficiency))}
    ${metric("Requests", formatNumber(overview.request_count))}
    ${metric("Artifacts", formatNumber(overview.artifact_count))}
    ${metric("Attribution", typeof overview.attribution_coverage === "number" ? formatPercent(overview.attribution_coverage) : String(overview.attribution_coverage ?? "-"))}
    ${metric("Scope", overview.scope_label)}
  </section>`;
}

function metric(label: string, value: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function controls(model: DashboardViewModel): string {
  return `<div class="controls">
    <input data-filter-search type="search" placeholder="Search safe labels, categories, or IDs" aria-label="Search artifacts">
    <select data-filter-category aria-label="Artifact category">
      <option value="">All categories</option>
      ${model.filters.categories.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`).join("")}
    </select>
    <select data-filter-sort aria-label="Sort artifacts">
      <option value="estimated_uncached">Estimated uncached</option>
      <option value="total_exposure">Total exposure</option>
      <option value="repeated_exposure">Repeated exposure</option>
      <option value="inclusion_count">Inclusions</option>
    </select>
    <span class="pill">${formatNumber(model.artifacts.length)} rows</span>
  </div>`;
}

function taskNavigation(model: DashboardViewModel): string {
  if (model.task_groups.length === 0) return "";
  return `<section class="panel">
    <h2>Task Groups</h2>
    <div class="tasks">
      ${model.task_groups.map((group) => `<button class="task-button" data-task-filter="${escapeAttr(group.task_group_id)}" aria-pressed="false">
        ${escapeHtml(group.display_name)} <span class="muted">(${formatNumber(group.artifact_count)})</span>
      </button>`).join("")}
    </div>
  </section>`;
}

function artifactTable(rows: DashboardArtifactRow[], maxExposure: number): string {
  if (rows.length === 0) return `<div class="empty">No artifact events recorded.</div>`;
  return `<table>
    <thead><tr><th>Artifact</th><th>Category</th><th>Exposure</th><th>Repeated</th><th>Inclusions</th><th>Preview</th></tr></thead>
    <tbody data-artifact-body>
      ${rows.map((row) => artifactRow(row, maxExposure)).join("")}
    </tbody>
  </table>
  <div class="empty" data-empty hidden>No artifacts match the current filters.</div>`;
}

function sessionTable(index: DashboardSessionIndex): string {
  if (index.sessions.length === 0) return `<div class="empty">No profiler sessions found.</div>`;
  return `<table>
    <thead><tr><th>Session</th><th>Updated</th><th>Requests</th><th>Artifacts</th><th>Input</th><th>Cache</th><th>Status</th></tr></thead>
    <tbody>
      ${index.sessions.map((session) => `<tr>
        <td class="name">${escapeHtml(session.label ?? session.run_id)}<div class="id">${escapeHtml(session.run_dir)}</div></td>
        <td>${escapeHtml(session.updated_at ?? "-")}</td>
        <td>${valueOrDash(session.request_count)}</td>
        <td>${valueOrDash(session.artifact_count)}</td>
        <td>${valueOrDash(session.input_tokens)}</td>
        <td>${valueOrDash(session.cached_input_tokens)}</td>
        <td><span class="pill ${session.availability.status === "unavailable" ? "warn" : ""}">${escapeHtml(session.availability.status)}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function artifactRow(row: DashboardArtifactRow, maxExposure: number): string {
  const width = Math.round((row.total_exposure / maxExposure) * 100);
  return `<tr data-artifact-row tabindex="0"
    data-artifact-id="${escapeAttr(row.artifact_id)}"
    data-category="${escapeAttr(row.display_category)}"
    data-task-groups="${escapeAttr(row.task_group_ids.join(" "))}"
    data-search="${escapeAttr(row.search_text)}"
    data-estimated_uncached="${escapeAttr(String(row.estimated_uncached_input_tokens ?? 0))}"
    data-total_exposure="${escapeAttr(String(row.total_exposure))}"
    data-repeated_exposure="${escapeAttr(String(row.repeated_exposure))}"
    data-inclusion_count="${escapeAttr(String(row.inclusion_count))}">
    <td class="name">${escapeHtml(row.display_name)}<div class="id">${escapeHtml(row.stable_short_id)}</div></td>
    <td><span class="pill">${escapeHtml(row.display_category)}</span></td>
    <td>${formatNumber(row.total_exposure)}<div class="bar"><span style="width: ${width}%"></span></div></td>
    <td>${formatNumber(row.repeated_exposure)}</td>
    <td>${formatNumber(row.inclusion_count)}</td>
    <td><span class="pill ${row.preview_state === "hidden" ? "warn" : ""}">${escapeHtml(row.preview_state)}</span></td>
  </tr>`;
}

function firstDetail(model: DashboardViewModel): string {
  const first = model.artifacts.find((row) => row.detail_available);
  const detail = first ? model.artifact_details[first.artifact_id] : undefined;
  return detail ? detailMarkup(detail) : `<h2>Artifact Detail</h2><p class="muted">Select an artifact row to inspect details.</p>`;
}

function detailTemplates(model: DashboardViewModel): string {
  return Object.values(model.artifact_details)
    .map((detail) => `<template data-detail-template="${escapeAttr(detail.artifact_id)}">${detailMarkup(detail)}</template>`)
    .join("");
}

function detailMarkup(detail: DashboardArtifactDetail): string {
  return `<h2>${escapeHtml(detail.title)}</h2>
    <div class="subtle">${escapeHtml(detail.identity.display_category)} · ${escapeHtml(detail.identity.stable_short_id)}</div>
    <section class="detail-section">
      <h3>Metrics</h3>
      ${Object.entries(detail.metrics)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => kv(labelize(key), formatMetricValue(value)))
        .join("")}
    </section>
    ${detail.metadata_sections.map(sectionMarkup).join("")}
    ${toolLinks(detail)}
    ${content(detail)}
    ${caveats(detail.caveats)}`;
}

function sectionMarkup(section: DashboardMetadataSection): string {
  return `<section class="detail-section"><h3>${escapeHtml(section.title)}</h3>
    ${section.rows.map((row) => kv(row.label, row.value, row.visibility === "hidden")).join("")}
  </section>`;
}

function toolLinks(detail: DashboardArtifactDetail): string {
  if (detail.tool_links.length === 0) return "";
  return `<section class="detail-section"><h3>Tool Links</h3>
    ${detail.tool_links.map((link) => kv(link.match_state, link.call_id ?? link.link_id)).join("")}
  </section>`;
}

function content(detail: DashboardArtifactDetail): string {
  if (!detail.content?.preview && !detail.content?.raw) return "";
  return `<section class="detail-section"><h3>Content</h3>
    ${detail.content.preview ? `<pre>${escapeHtml(detail.content.preview)}</pre>` : ""}
    ${detail.content.raw ? `<button class="raw-button" data-raw-reveal>Reveal raw content</button><pre data-raw-content hidden>${escapeHtml(detail.content.raw)}</pre>` : ""}
  </section>`;
}

function caveats(items: DashboardCaveat[]): string {
  if (items.length === 0) return "";
  return `<div class="caveats">${items.map((item) => `<div class="caveat ${item.severity}"><strong>${escapeHtml(item.code)}</strong>: ${escapeHtml(item.message)}</div>`).join("")}</div>`;
}

function kv(label: string, value: string, hidden = false): string {
  return `<div class="kv"><span>${escapeHtml(label)}</span><span class="${hidden ? "hidden-field" : ""}">${escapeHtml(value)}</span></div>`;
}

function valueOrDash(value: number | undefined): string {
  return value === undefined ? "-" : formatNumber(value);
}

function formatMetricValue(value: string | number | boolean | undefined): string {
  if (typeof value === "number") return formatNumber(value);
  return String(value);
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
