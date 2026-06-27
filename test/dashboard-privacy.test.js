import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardViewModel } from "../src/surfaces/dashboard/model.ts";
import { dashboardSummary, metadataOnlyLeakSummary } from "./helpers/dashboard-fixtures.js";

test("metadata-only dashboard model excludes hidden preview text from safe client data", () => {
  const model = createDashboardViewModel(metadataOnlyLeakSummary());

  assert.equal(JSON.stringify(model).includes("SECRET_DO_NOT_LEAK"), false);
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
  const states = [
    model.privacy.preview_state,
    ...model.artifacts.map((artifact) => artifact.preview_state),
    ...Object.values(model.artifact_details).map((detail) => detail.privacy.preview_state)
  ];

  assert.ok(states.some((state) => ["hidden", "preview", "raw_available"].includes(state)));
  assert.equal(JSON.stringify(model).includes("data-raw-content"), false);
});
