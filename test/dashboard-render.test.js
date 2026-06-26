import assert from "node:assert/strict";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { createDashboardViewModel } from "../src/surfaces/dashboard/model.ts";
import { renderDashboardHtml } from "../src/surfaces/dashboard/render.ts";
import { artifact, usage } from "./helpers/analyzer-fixtures.js";
import { dashboardSummary } from "./helpers/dashboard-fixtures.js";

test("dashboard renders overview cards, artifact table, task navigation, and caveats", () => {
  const html = renderDashboardHtml(createDashboardViewModel(dashboardSummary()));

  assert.match(html, /Token Profiler Dashboard/);
  assert.match(html, /data-overview/);
  assert.match(html, /data-artifact-row/);
  assert.match(html, /Task Groups/);
  assert.match(html, /local_artifact_attribution_estimate/);
});

test("dashboard renders artifact detail templates and client state hooks", () => {
  const html = renderDashboardHtml(createDashboardViewModel(dashboardSummary()));

  assert.match(html, /data-detail-template="OUT:exec:1"/);
  assert.match(html, /Tool Links/);
  assert.match(html, /data-filter-search/);
  assert.match(html, /data-task-filter="task:req_1:req_2"/);
});

test("dashboard renders no-match empty state and sortable fields", () => {
  const html = renderDashboardHtml(createDashboardViewModel(dashboardSummary()));

  assert.match(html, /No artifacts match the current filters/);
  assert.match(html, /data-estimated_uncached/);
  assert.match(html, /data-total_exposure/);
  assert.match(html, /data-repeated_exposure/);
});

test("dashboard renders a synthetic 1000 artifact run", () => {
  const events = [];
  for (let index = 0; index < 1000; index += 1) {
    events.push(artifact("req_1", `FILE:${index}`, "FILE", `src/file-${index}.ts`, `hash_${index}`, 1, index, index + 1));
  }
  events.push(usage("req_1", 1000, 250, 50));

  const started = Date.now();
  const html = renderDashboardHtml(createDashboardViewModel(analyzeEvents(events)));

  assert.match(html, /Token Profiler Dashboard/);
  assert.match(html, /1,000 rows/);
  assert.ok(Date.now() - started < 1000);
});
