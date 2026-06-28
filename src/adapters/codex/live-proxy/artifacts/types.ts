export type CodexProviderItem = Record<string, unknown>;

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
