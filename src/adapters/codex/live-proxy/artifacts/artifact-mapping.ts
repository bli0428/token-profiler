import type {
  CodexArtifactMetadata,
  CodexArtifactType,
  CodexSourceProtocolType,
  CodexSourceProvenance
} from "./types.ts";

export const CODEX_SOURCE_PROTOCOL = "openai_responses" as const;

export type CodexSourceMappingInput = {
  sourceProtocolType: CodexSourceProtocolType;
  sourceItemIndex?: number;
  sourceRole?: string;
  sourceToolName?: string;
};

export function sourceProvenance({
  sourceProtocolType,
  sourceItemIndex,
  sourceRole,
  sourceToolName
}: CodexSourceMappingInput): CodexSourceProvenance {
  return {
    source_protocol: CODEX_SOURCE_PROTOCOL,
    source_protocol_type: sourceProtocolType,
    ...(typeof sourceItemIndex === "number" && Number.isInteger(sourceItemIndex) && sourceItemIndex >= 0 ? { source_item_index: sourceItemIndex } : {}),
    ...(sourceRole ? { source_role: sourceRole } : {}),
    ...(sourceToolName ? { source_tool_name: sourceToolName } : {})
  };
}

export function withSourceProvenance<T extends CodexArtifactMetadata>(
  metadata: Omit<T, keyof CodexSourceProvenance>,
  provenance: CodexSourceProvenance
): T {
  return {
    ...provenance,
    ...metadata
  } as T;
}

export function artifactTypeForMessageRole(role: string): "SYSTEM_PROMPT" | "USER_MESSAGE" | "SUMMARY" {
  if (role === "system" || role === "developer") return "SYSTEM_PROMPT";
  if (role === "user") return "USER_MESSAGE";
  return "SUMMARY";
}

export function contentKindForMessageRole(role: string): "assistant_message" | "system_message" | "user_message" {
  if (role === "assistant") return "assistant_message";
  if (role === "system" || role === "developer") return "system_message";
  return "user_message";
}

export function artifactTypeForToolOutput(toolName: unknown): "TOOL_OUTPUT" | "SEARCH_RESULT" | "TEST_OUTPUT" {
  const name = String(toolName).toLowerCase();
  if (name.includes("search")) return "SEARCH_RESULT";
  if (name.includes("exec")) return "TOOL_OUTPUT";
  if (name.includes("test")) return "TEST_OUTPUT";
  return "TOOL_OUTPUT";
}

export function artifactTypeForInstructions(): "SYSTEM_PROMPT" {
  return "SYSTEM_PROMPT";
}
