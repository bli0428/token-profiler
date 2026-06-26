import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardViewModel } from "../src/surfaces/dashboard/model.ts";
import { renderDashboardHtml } from "../src/surfaces/dashboard/render.ts";
import { dashboardSummary, metadataOnlyLeakSummary } from "./helpers/dashboard-fixtures.js";

test("metadata-only dashboard excludes hidden preview text from model search and HTML", () => {
  const model = createDashboardViewModel(metadataOnlyLeakSummary());
  const html = renderDashboardHtml(model);

  assert.equal(JSON.stringify(model).includes("SECRET_DO_NOT_LEAK"), false);
  assert.equal(html.includes("SECRET_DO_NOT_LEAK"), false);
  assert.equal(model.artifacts[0].preview_state, "hidden");
});

test("dashboard distinguishes hidden and unavailable detail fields", () => {
  const model = createDashboardViewModel(metadataOnlyLeakSummary());
  const detail = model.artifact_details["OUT:secret"];
  const command = detail.metadata_sections.find((section) => section.title === "Command");

  assert.ok(command);
  assert.equal(command.rows.find((row) => row.label === "Output Preview").visibility, "hidden");
  assert.equal(command.rows.find((row) => row.label === "Workdir").visibility, "unavailable");
});

test("preview and raw-available states are represented without raw reveal by default", () => {
  const model = createDashboardViewModel(dashboardSummary());
  const html = renderDashboardHtml(model);

  assert.match(html, /hidden|preview|raw_available/);
  assert.equal(html.includes("data-raw-content hidden"), false);
});
