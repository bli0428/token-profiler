import assert from "node:assert/strict";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { createDashboardViewModel, dashboardOverview } from "../src/surfaces/dashboard-api/view-model.ts";
import { dashboardSummary } from "./helpers/dashboard-fixtures.js";

test("dashboard overview mirrors analyzer totals", () => {
  const summary = dashboardSummary();
  const model = createDashboardViewModel(summary);

  assert.equal(model.overview.input_tokens, summary.totals.input_tokens);
  assert.equal(model.overview.cached_input_tokens, summary.totals.cached_input_tokens);
  assert.equal(model.overview.uncached_input_tokens, summary.totals.uncached_input_tokens);
  assert.equal(model.overview.output_tokens, summary.totals.output_tokens);
  assert.equal(model.overview.total_exposure, summary.totals.total_exposure);
  assert.equal(model.overview.repeated_exposure, summary.totals.repeated_exposure);
  assert.equal(model.overview.request_count, summary.requests.length);
  assert.equal(model.overview.artifact_count, summary.artifacts.length);
});

test("dashboard artifact rows use legibility labels and deterministic ordering", () => {
  const model = createDashboardViewModel(dashboardSummary());
  const row = model.artifacts.find((artifact) => artifact.artifact_id === "OUT:exec:1");

  assert.ok(row);
  assert.equal(row.display_category, "command_output");
  assert.match(row.display_name, /npm test/);
  assert.ok(row.stable_short_id);
  assert.equal(row.detail_available, true);
  assert.deepEqual(model.artifacts.map((artifact) => artifact.artifact_id), [
    "OUT:exec:1",
    "PATCH:1",
    "CALL:exec:1",
    "MSG:user:1"
  ]);
});

test("dashboard maps artifact details and task memberships", () => {
  const model = createDashboardViewModel(dashboardSummary());
  const detail = model.artifact_details["OUT:exec:1"];

  assert.ok(detail);
  assert.equal(detail.identity.display_category, "command_output");
  assert.equal(detail.tool_links[0].match_state, "exact");
  assert.deepEqual(detail.task_group_ids, ["task:req_1:req_2"]);
  assert.ok(detail.metadata_sections.some((section) => section.title === "Command"));
});

test("dashboard forwards preview-mode user message content to artifact details", () => {
  const summary = analyzeEvents([
    {
      schema_version: 1,
      run_id: "run_preview",
      request_id: "proxy_fccc22f5-6865-4220-bfba-ef540d2e8ae9",
      artifact_id: "MSG:user:preview",
      artifact_type: "MESSAGE",
      artifact_name: "message:user:1:0",
      content_hash: "hash_preview_message",
      local_token_count: 12,
      tokenizer: "o200k_base",
      storage_mode: "preview",
      event_kind: "artifact",
      metadata: {
        content_kind: "user_message",
        role: "user"
      },
      preview: {
        head: "Move the storage mode pill into the dashboard navbar",
        tail: "",
        char_count: 52,
        line_count: 1,
        truncated: false
      },
      timestamp: "2026-06-23T12:00:01.000Z"
    }
  ]);
  const model = createDashboardViewModel(summary);
  const detail = model.artifact_details["MSG:user:preview"];

  assert.equal(detail.content.preview, "Move the storage mode pill into the dashboard navbar");
});

test("dashboard can derive task-scoped overview without mutating run data", () => {
  const summary = dashboardSummary();
  const model = createDashboardViewModel(summary);
  const scoped = dashboardOverview(summary, model.artifacts, model.caveats, model.task_groups[0]);

  assert.equal(scoped.scope, "task_group");
  assert.equal(scoped.scope_id, "task:req_1:req_2");
  assert.equal(scoped.artifact_count, model.task_groups[0].artifact_count);
  assert.equal(model.overview.scope, "run");
});
