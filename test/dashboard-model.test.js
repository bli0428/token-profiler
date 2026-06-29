import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeEvents } from "../src/analysis/pipeline.ts";
import { createDashboardViewModel, dashboardOverview } from "../src/surfaces/dashboard-api/view-model.ts";
import { dashboardSummary } from "./helpers/dashboard-fixtures.js";

async function fixture(name) {
  const text = await readFile(new URL(`./fixtures/events/${name}`, import.meta.url), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

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

test("analysis builds turns with request and artifact children", async () => {
  const summary = analyzeEvents(await fixture("turn-hierarchy.jsonl"));
  const turns = summary.turns;

  assert.equal(turns.length, 3);
  assert.deepEqual(turns[0].request_ids, ["req_1", "req_2"]);
  assert.deepEqual(turns[0].requests.map((request) => request.request_id), ["req_1", "req_2"]);
  assert.ok(turns[0].artifact_ids.includes("PATCH:alpha"));
  assert.equal(turns[0].grouping_source, "direct_turn_id");
  assert.equal(turns[0].confidence, "complete");
  assert.equal(turns[0].requests[1].artifact_inclusions.some((artifact) => artifact.artifact_id === "PATCH:alpha"), true);
});

test("analysis prefers assistant preview for request titles", async () => {
  const summary = analyzeEvents(await fixture("turn-hierarchy.jsonl"));
  const alpha = summary.turns.find((turn) => turn.turn_id === "turn_alpha");
  const secondRequest = alpha.requests.find((request) => request.request_id === "req_2");

  assert.equal(alpha.display_title, "Refactor capture flow");
  assert.equal(alpha.title_source, "user_preview");
  assert.equal(secondRequest.display_title, "Wiring turn identity through recording");
  assert.equal(secondRequest.title_source, "assistant_preview");
});

test("analysis uses captured assistant message metadata before command labels", () => {
  const summary = analyzeEvents([
    {
      schema_version: 1,
      event_kind: "request_turn_identity",
      run_id: "run_adapter_message_metadata",
      request_id: "req_with_assistant_preview",
      turn_id: "turn_with_assistant_preview",
      turn_identity_source: "direct_turn_id",
      caveats: [],
      timestamp: "2026-06-29T12:00:00.000Z"
    },
    {
      schema_version: 1,
      event_kind: "artifact",
      run_id: "run_adapter_message_metadata",
      request_id: "req_with_assistant_preview",
      artifact_id: "SUMMARY:message:assistant:0:0",
      artifact_type: "SUMMARY",
      artifact_name: "message:assistant:0:0",
      content_hash: "hash_assistant_preview",
      local_token_count: 7,
      tokenizer: "o200k_base",
      storage_mode: "preview",
      artifact_index: 0,
      token_start: 0,
      token_end: 7,
      metadata: {
        content_kind: "assistant_message",
        role: "assistant",
        message_source: "current_turn",
        title_candidate: true,
        part_index: 0
      },
      preview: {
        head: "I'll inspect the dashboard title path.",
        tail: "",
        char_count: 38,
        line_count: 1,
        truncated: false
      },
      timestamp: "2026-06-29T12:00:01.000Z"
    },
    {
      schema_version: 1,
      event_kind: "artifact",
      run_id: "run_adapter_message_metadata",
      request_id: "req_with_assistant_preview",
      artifact_id: "SUMMARY:tool-call:call_sed",
      artifact_type: "SUMMARY",
      artifact_name: "exec_command: sed -n '1,220p' src/analysis/turn-groups.ts",
      content_hash: "hash_sed_command",
      local_token_count: 12,
      tokenizer: "o200k_base",
      storage_mode: "metadata",
      artifact_index: 1,
      token_start: 7,
      token_end: 19,
      metadata: {
        content_kind: "command",
        tool_name: "exec_command",
        call_id: "call_sed",
        command: "sed -n '1,220p' src/analysis/turn-groups.ts",
        display_name: "exec_command: sed -n '1,220p' src/analysis/turn-groups.ts"
      },
      timestamp: "2026-06-29T12:00:02.000Z"
    },
    {
      schema_version: 1,
      event_kind: "request_usage",
      run_id: "run_adapter_message_metadata",
      request_id: "req_with_assistant_preview",
      input_tokens: 19,
      cached_input_tokens: 0,
      uncached_input_tokens: 19,
      output_tokens: 3,
      total_tokens: 22,
      timestamp: "2026-06-29T12:00:03.000Z"
    }
  ]);
  const turn = summary.turns.find((candidate) => candidate.turn_id === "turn_with_assistant_preview");
  const request = turn.requests.find((candidate) => candidate.request_id === "req_with_assistant_preview");

  assert.equal(request.display_title, "I'll inspect the dashboard title path.");
  assert.equal(request.title_source, "assistant_preview");
});

test("analysis ignores non-title context messages for turn titles", () => {
  const summary = analyzeEvents([
    {
      schema_version: 1,
      event_kind: "request_turn_identity",
      run_id: "run_context_title_filter",
      request_id: "req_context_title_filter",
      turn_id: "turn_context_title_filter",
      turn_identity_source: "direct_turn_id",
      caveats: [],
      timestamp: "2026-06-29T12:00:00.000Z"
    },
    {
      schema_version: 1,
      event_kind: "artifact",
      run_id: "run_context_title_filter",
      request_id: "req_context_title_filter",
      artifact_id: "USER_MESSAGE:message:user:1:0",
      artifact_type: "USER_MESSAGE",
      artifact_name: "message:user:1:0",
      content_hash: "hash_agent_context",
      local_token_count: 12,
      tokenizer: "o200k_base",
      storage_mode: "preview",
      artifact_index: 0,
      token_start: 0,
      token_end: 12,
      metadata: {
        content_kind: "user_message",
        role: "user",
        message_source: "agent_context",
        title_candidate: false,
        part_index: 0
      },
      preview: {
        head: "# AGENTS.md instructions for /repo",
        tail: "",
        char_count: 32,
        line_count: 1,
        truncated: false
      },
      timestamp: "2026-06-29T12:00:01.000Z"
    },
    {
      schema_version: 1,
      event_kind: "artifact",
      run_id: "run_context_title_filter",
      request_id: "req_context_title_filter",
      artifact_id: "USER_MESSAGE:message:user:2:0",
      artifact_type: "USER_MESSAGE",
      artifact_name: "message:user:2:0",
      content_hash: "hash_current_prompt",
      local_token_count: 8,
      tokenizer: "o200k_base",
      storage_mode: "preview",
      artifact_index: 1,
      token_start: 12,
      token_end: 20,
      metadata: {
        content_kind: "user_message",
        role: "user",
        message_source: "current_turn",
        title_candidate: true,
        part_index: 0
      },
      preview: {
        head: "Fix the dashboard request title preview.",
        tail: "",
        char_count: 40,
        line_count: 1,
        truncated: false
      },
      timestamp: "2026-06-29T12:00:02.000Z"
    },
    {
      schema_version: 1,
      event_kind: "request_usage",
      run_id: "run_context_title_filter",
      request_id: "req_context_title_filter",
      input_tokens: 20,
      cached_input_tokens: 0,
      uncached_input_tokens: 20,
      output_tokens: 3,
      total_tokens: 23,
      timestamp: "2026-06-29T12:00:03.000Z"
    }
  ]);
  const turn = summary.turns.find((candidate) => candidate.turn_id === "turn_context_title_filter");

  assert.equal(turn.display_title, "Fix the dashboard request title preview.");
  assert.equal(turn.title_source, "user_preview");
});

test("dashboard model preserves turn request title sources", async () => {
  const summary = analyzeEvents(await fixture("turn-hierarchy.jsonl"));
  const model = createDashboardViewModel(summary);
  const alpha = model.turns.find((turn) => turn.turn_id === "turn_alpha");
  const beta = model.turns.find((turn) => turn.turn_id === "turn_beta");

  assert.equal(alpha.requests.find((request) => request.request_id === "req_2").title_source, "assistant_preview");
  assert.equal(beta.requests[0].title_source, "action_label");
  assert.equal(alpha.requests.find((request) => request.request_id === "req_2").display_title, "Wiring turn identity through recording");
});

test("analysis groups missing turn identity under explicit fallback", async () => {
  const summary = analyzeEvents(await fixture("turn-hierarchy.jsonl"));
  const fallback = summary.turns.find((turn) => turn.grouping_source === "missing_turn_id");

  assert.ok(fallback);
  assert.equal(fallback.turn_id, "turn:fallback:missing");
  assert.deepEqual(fallback.request_ids, ["req_4"]);
  assert.equal(fallback.confidence, "fallback");
  assert.equal(fallback.title_source, "fallback");
  assert.ok(fallback.caveats.some((caveat) => caveat.code === "turn_identity_missing"));
});

test("analysis groups metadata-only requests by direct turn id without content previews", async () => {
  const summary = analyzeEvents(await fixture("turn-hierarchy-metadata.jsonl"));
  const turn = summary.turns[0];

  assert.equal(summary.turns.length, 1);
  assert.equal(turn.turn_id, "turn_metadata_only");
  assert.deepEqual(turn.request_ids, ["req_meta_1", "req_meta_2"]);
  assert.equal(turn.title_source, "turn_id");
  assert.equal(turn.display_title, "turn_metadata_only");
  assert.equal(turn.privacy.prompt_available, false);
});
