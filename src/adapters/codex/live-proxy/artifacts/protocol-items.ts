import { stringValue } from "./payload.ts";

type ProtocolProviderItem = Record<string, unknown>;

export type CodexProtocolItemGroup =
  | "message"
  | "tool_call"
  | "tool_output"
  | "reasoning"
  | "opaque";

type CodexProtocolItemDescriptor = {
  group: CodexProtocolItemGroup;
  defaultRole?: string;
  messageSource?: "typed_message" | "agent_message";
  defaultToolName?: string;
  outputArtifactIdPrefix?: string;
  outputArtifactType?: "SUMMARY";
  providerType?: string;
  inputValue?: (item: ProtocolProviderItem) => unknown;
  outputValue?: (item: ProtocolProviderItem) => unknown;
};

export const CODEX_PROTOCOL_ITEM_DESCRIPTORS = {
  message: {
    group: "message",
    messageSource: "typed_message"
  },
  agent_message: {
    group: "message",
    defaultRole: "assistant",
    messageSource: "agent_message"
  },
  function_call: {
    group: "tool_call",
    defaultToolName: "unknown",
    inputValue: (item) => item.arguments
  },
  custom_tool_call: {
    group: "tool_call",
    defaultToolName: "custom",
    inputValue: (item) => item.input
  },
  local_shell_call: {
    group: "tool_call",
    defaultToolName: "local_shell",
    inputValue: (item) => item.arguments ?? item.input ?? item.action ?? item.query
  },
  tool_search_call: {
    group: "tool_call",
    defaultToolName: "tool_search",
    inputValue: (item) => item.arguments ?? item.input ?? item.action ?? item.query
  },
  web_search_call: {
    group: "tool_call",
    defaultToolName: "web_search",
    inputValue: (item) => item.arguments ?? item.input ?? item.action ?? item.query
  },
  image_generation_call: {
    group: "tool_call",
    defaultToolName: "image_generation",
    inputValue: (item) => item.arguments ?? item.input ?? item.action ?? item.query
  },
  function_call_output: {
    group: "tool_output",
    defaultToolName: "unknown",
    outputArtifactIdPrefix: "TOOL_OUTPUT",
    outputValue: (item) => item.output
  },
  custom_tool_call_output: {
    group: "tool_output",
    defaultToolName: "custom_tool",
    outputArtifactIdPrefix: "SUMMARY:custom-tool-call-output",
    outputArtifactType: "SUMMARY",
    outputValue: (item) => item.output
  },
  mcp_tool_call_output: {
    group: "tool_output",
    defaultToolName: "mcp_tool",
    outputArtifactIdPrefix: "TOOL_OUTPUT:mcp",
    outputValue: (item) => item.output ?? item.result
  },
  tool_search_output: {
    group: "tool_output",
    defaultToolName: "tool_search",
    outputArtifactIdPrefix: "SEARCH_RESULT:tool-search",
    outputValue: (item) => item.output ?? item.results
  },
  reasoning: {
    group: "reasoning",
    providerType: "reasoning"
  },
  additional_tools: {
    group: "opaque",
    providerType: "additional_tools"
  },
  compaction: {
    group: "opaque",
    providerType: "compaction"
  },
  compaction_trigger: {
    group: "opaque",
    providerType: "compaction_trigger"
  },
  context_compaction: {
    group: "opaque",
    providerType: "context_compaction"
  },
  other: {
    group: "opaque",
    providerType: "other"
  }
} as const satisfies Record<string, CodexProtocolItemDescriptor>;

export type CodexKnownProtocolItemType = keyof typeof CODEX_PROTOCOL_ITEM_DESCRIPTORS;
export type CodexSourceProtocolType =
  | "instructions"
  | "tool_definition"
  | CodexKnownProtocolItemType
  | "unknown";

export function protocolItemDescriptor(type: unknown): CodexProtocolItemDescriptor | undefined {
  return typeof type === "string"
    ? CODEX_PROTOCOL_ITEM_DESCRIPTORS[type as CodexKnownProtocolItemType]
    : undefined;
}

export function protocolToolName(item: ProtocolProviderItem): string {
  return stringValue(item.name)
    ?? protocolItemDescriptor(item.type)?.defaultToolName
    ?? "unknown";
}

export function protocolInputValue(item: ProtocolProviderItem): unknown {
  return protocolItemDescriptor(item.type)?.inputValue?.(item);
}

export function protocolOutputValue(item: ProtocolProviderItem): unknown {
  return protocolItemDescriptor(item.type)?.outputValue?.(item);
}

export function protocolOutputArtifactId(type: unknown, callId: string | undefined, index: number): string {
  const prefix = protocolItemDescriptor(type)?.outputArtifactIdPrefix ?? "TOOL_OUTPUT";
  return `${prefix}:${callId ?? index}`;
}

export function protocolOutputArtifactTypeOverride(type: unknown): "SUMMARY" | undefined {
  return protocolItemDescriptor(type)?.outputArtifactType;
}

export function protocolProviderType(item: ProtocolProviderItem): string {
  return protocolItemDescriptor(item.type)?.providerType
    ?? stringValue(item.type)
    ?? "unknown";
}

export function protocolMessageRole(item: ProtocolProviderItem): string {
  return stringValue(item.role)
    ?? protocolItemDescriptor(item.type)?.defaultRole
    ?? "unknown";
}

export function protocolMessageSource(item: ProtocolProviderItem): "typed_message" | "role_message" | "agent_message" {
  return protocolItemDescriptor(item.type)?.messageSource
    ?? (stringValue(item.role) ? "role_message" : "typed_message");
}
