import { artifact, usage } from "./analyzer-fixtures.js";

export function requestAccountingEvents() {
  const early = artifact("req_early", "MSG:early", "MESSAGE", "user early", "hash_early", 8, 0, 8, {
    content_kind: "user_message",
    role: "user",
    prompt_summary: "Early request"
  });
  early.timestamp = "2026-06-23T12:00:00.000Z";
  early.artifact_index = 0;

  const first = artifact("req_same_a", "FILE:a", "FILE", "a.ts", "hash_a", 6, 0, 6, {
    content_kind: "file_context",
    display_name: "a.ts"
  });
  first.timestamp = "2026-06-23T12:00:01.000Z";
  first.artifact_index = 0;

  const second = artifact("req_same_b", "FILE:b", "FILE", "b.ts", "hash_b", 10, 0, 10, {
    content_kind: "file_context",
    display_name: "b.ts"
  });
  second.timestamp = "2026-06-23T12:00:01.000Z";
  second.artifact_index = 0;

  const missingUsage = artifact("req_missing", "OUT:missing", "TOOL_OUTPUT", "tool:exec:missing", "hash_missing", 12, 0, 12, {
    content_kind: "command_output",
    tool_name: "exec_command"
  });
  missingUsage.timestamp = "2026-06-23T12:00:02.000Z";
  missingUsage.artifact_index = 0;

  const earlyUsage = usage("req_early", 8, 2, 3);
  earlyUsage.timestamp = "2026-06-23T12:00:00.500Z";
  earlyUsage.response_id = "resp_early";
  const firstUsage = usage("req_same_a", 6, 1, 4);
  firstUsage.timestamp = "2026-06-23T12:00:01.500Z";
  const secondUsage = usage("req_same_b", 30, 20, 5);
  secondUsage.timestamp = "2026-06-23T12:00:01.500Z";

  return [second, early, first, missingUsage, secondUsage, earlyUsage, firstUsage];
}

export function requestArtifactInclusionEvents() {
  const call = artifact("req_detail", "CALL:exec:detail", "TOOL_CALL", "tool-call:exec_command:detail", "hash_call_detail", 5, 0, 5, {
    content_kind: "command",
    tool_name: "exec_command",
    call_id: "detail",
    command: "npm test"
  });
  call.artifact_index = 0;
  call.timestamp = "2026-06-23T12:00:01.000Z";

  const output = artifact("req_detail", "OUT:exec:detail", "TOOL_OUTPUT", "tool:exec_command:detail", "hash_out_detail", 15, 5, 20, {
    content_kind: "command_output",
    tool_name: "exec_command",
    call_id: "detail",
    output_preview: "tests passed"
  });
  output.artifact_index = 1;
  output.timestamp = "2026-06-23T12:00:01.000Z";

  const noOffsets = artifact("req_no_offsets", "FILE:no-offsets", "FILE", "no-offsets.ts", "hash_no_offsets", 11, 0, 11, {
    content_kind: "file_context",
    display_name: "no-offsets.ts"
  });
  delete noOffsets.token_start;
  delete noOffsets.token_end;
  noOffsets.timestamp = "2026-06-23T12:00:02.000Z";

  return [
    output,
    call,
    noOffsets,
    usage("req_detail", 20, 8, 4),
    usage("req_no_offsets", 11, 3, 2)
  ];
}

export function metadataOnlyRequestAccountingEvents() {
  return [
    {
      schema_version: 1,
      run_id: "run_secret",
      request_id: "req_secret",
      artifact_id: "OUT:secret",
      artifact_type: "TOOL_OUTPUT",
      artifact_name: "tool:exec_command:secret",
      content_hash: "hash_secret_request",
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
    usage("req_secret", 20, 0, 1)
  ];
}
