export type CodexProviderItem = Record<string, unknown>;

/**
 * Adapter-local model for the Responses request body observed by the Codex live
 * proxy. Public fields are based on the OpenAI Responses create API:
 * https://platform.openai.com/docs/api-reference/responses/create
 *
 * Codex-specific custom tool call item shapes are based on observed live-proxy
 * payloads and fixture coverage in test/proxy.test.js; keep those quarantined in
 * this adapter rather than treating them as canonical project contracts.
 */
export type CodexResponsesRequest = CodexProviderItem & {
  model?: unknown;
  instructions?: unknown;
  tools?: unknown;
  input?: unknown;
  conversation?: CodexProviderItem;
  metadata?: CodexProviderItem;
  prompt_cache_key?: unknown;
  previous_response_id?: unknown;
};

export type CodexResponsesToolDefinition = CodexProviderItem & {
  type?: unknown;
  name?: unknown;
  function?: unknown;
};

export type CodexResponsesMessageItem = CodexProviderItem & {
  type?: "message";
  role?: unknown;
  content?: unknown;
};

export type CodexResponsesFunctionCallItem = CodexProviderItem & {
  type: "function_call";
  name?: unknown;
  call_id?: unknown;
  arguments?: unknown;
};

export type CodexResponsesFunctionCallOutputItem = CodexProviderItem & {
  type: "function_call_output";
  call_id?: unknown;
  output?: unknown;
};

export type CodexResponsesCustomToolCallItem = CodexProviderItem & {
  type: "custom_tool_call";
  name?: unknown;
  call_id?: unknown;
  input?: unknown;
};

export type CodexResponsesCustomToolCallOutputItem = CodexProviderItem & {
  type: "custom_tool_call_output";
  call_id?: unknown;
  output?: unknown;
};

export type CodexResponsesUnknownInputObject = CodexProviderItem & {
  type?: unknown;
  role?: unknown;
  content?: unknown;
};

export type CodexResponsesInputObject =
  | CodexResponsesMessageItem
  | CodexResponsesFunctionCallItem
  | CodexResponsesFunctionCallOutputItem
  | CodexResponsesCustomToolCallItem
  | CodexResponsesCustomToolCallOutputItem
  | CodexResponsesUnknownInputObject;

export type CodexResponsesInputItem = string | CodexResponsesInputObject;

export type CodexArtifactType =
  | "SYSTEM_PROMPT"
  | "USER_MESSAGE"
  | "FILE"
  | "REPO_MAP"
  | "TOOL_OUTPUT"
  | "SEARCH_RESULT"
  | "ERROR_LOG"
  | "TEST_OUTPUT"
  | "SUMMARY"
  | "CODEX_USAGE";

export type CodexArtifactMetadata =
  | CodexToolCallMetadata
  | CodexPatchMetadata
  | CodexToolOutputMetadata
  | CodexUnknownInputMetadata;

export type CodexToolCallMetadata = {
  tool_name: string;
  display_name: string;
  content_kind: "command" | "tool_call" | "custom_tool_call";
  call_id?: string;
  command?: string;
  workdir?: string;
};

export type CodexPatchMetadata = {
  tool_name: string;
  display_name: string;
  content_kind: "patch";
  touched_files: string[];
  patch_adds: number;
  patch_updates: number;
  patch_deletes: number;
  patch_file_count: number;
  call_id?: string;
};

export type CodexToolOutputMetadata = {
  tool_name: string;
  display_name: string;
  content_kind: "tool_output";
  call_id?: string;
  command?: string;
  workdir?: string;
  source_display_name?: string;
  source_content_kind?: string;
  touched_files?: string[];
  exit_code?: number;
  original_token_count?: number;
  output_preview?: string;
};

export type CodexUnknownInputMetadata = {
  content_kind: "unknown_input";
  provider_type: string;
  reason: string;
  observed_keys: string[];
};

type CodexArtifactBase = {
  artifactName: string;
  artifactId: string;
  content: string;
};

export type CodexSystemArtifact = CodexArtifactBase & {
  kind: "system_instruction";
  artifactType: "SYSTEM_PROMPT";
};

export type CodexToolDefinitionArtifact = CodexArtifactBase & {
  kind: "tool_definition";
  artifactType: "SYSTEM_PROMPT";
};

export type CodexMessageArtifact = CodexArtifactBase & {
  kind: "message";
  artifactType: "SYSTEM_PROMPT" | "USER_MESSAGE" | "SUMMARY";
  role: string;
  partIndex: number;
};

export type CodexToolCallArtifact = CodexArtifactBase & {
  kind: "tool_call";
  artifactType: "SUMMARY";
  metadata: CodexToolCallMetadata;
};

export type CodexPatchArtifact = CodexArtifactBase & {
  kind: "patch";
  artifactType: "SUMMARY";
  metadata: CodexPatchMetadata;
};

export type CodexToolOutputArtifact = CodexArtifactBase & {
  kind: "tool_output";
  artifactType: "TOOL_OUTPUT" | "SEARCH_RESULT" | "TEST_OUTPUT" | "SUMMARY";
  metadata: CodexToolOutputMetadata;
};

export type CodexUnknownArtifact = CodexArtifactBase & {
  kind: "unknown_input";
  artifactType: "SUMMARY";
  metadata: CodexUnknownInputMetadata;
};

export type CodexExtractedArtifact =
  | CodexSystemArtifact
  | CodexToolDefinitionArtifact
  | CodexMessageArtifact
  | CodexToolCallArtifact
  | CodexPatchArtifact
  | CodexToolOutputArtifact
  | CodexUnknownArtifact;

export type CodexCaptureRecord = {
  artifactType: CodexArtifactType;
  artifactName: string;
  artifactId: string;
  content: string;
  metadata?: CodexArtifactMetadata;
};
