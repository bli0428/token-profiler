import { analyzeEvents } from "../../src/analysis/pipeline.ts";
import { artifact, usage } from "./analyzer-fixtures.js";
import { metadataOnlyRequestAccountingEvents } from "./request-accounting-fixtures.js";

export function dashboardSummary() {
  return analyzeEvents([
    artifact("req_1", "MSG:user:1", "MESSAGE", "user message", "hash_prompt", 5, 0, 5, {
      content_kind: "user_message",
      role: "user",
      prompt_summary: "Build dashboard"
    }),
    artifact("req_1", "CALL:exec:1", "TOOL_CALL", "tool-call:exec_command:call_1", "hash_call", 5, 5, 10, {
      content_kind: "command",
      tool_name: "exec_command",
      call_id: "call_1",
      command: "npm test",
      workdir: "/repo"
    }),
    artifact("req_1", "OUT:exec:1", "TOOL_OUTPUT", "tool:exec_command:call_1", "hash_out", 20, 10, 30, {
      content_kind: "command_output",
      tool_name: "exec_command",
      call_id: "call_1",
      command: "npm test",
      output_preview: "57 passing"
    }),
    artifact("req_2", "PATCH:1", "PATCH", "patch", "hash_patch", 14, 0, 14, {
      content_kind: "patch",
      tool_name: "apply_patch",
      touched_files: ["src/surfaces/html-report.ts"],
      patch_adds: 12,
      patch_updates: 1,
      patch_deletes: 0
    }),
    usage("req_1", 30, 10, 7),
    usage("req_2", 14, 0, 4)
  ]);
}

export function metadataOnlyLeakSummary() {
  return analyzeEvents([
    {
      schema_version: 1,
      run_id: "run_secret",
      request_id: "req_1",
      artifact_id: "OUT:secret",
      artifact_type: "TOOL_OUTPUT",
      artifact_name: "tool:exec_command:secret",
      content_hash: "hash_secret",
      local_token_count: 20,
      tokenizer: "o200k_base",
      storage_mode: "metadata",
      event_kind: "artifact",
      metadata: {
        content_kind: "command_output",
        tool_name: "exec_command",
        command: "print secret",
        output_preview: "SECRET_DO_NOT_LEAK"
      },
      timestamp: "2026-06-23T12:00:01.000Z"
    },
    usage("req_1", 20, 0, 1)
  ]);
}

export function metadataOnlyRequestAccountingSummary() {
  return analyzeEvents(metadataOnlyRequestAccountingEvents());
}
