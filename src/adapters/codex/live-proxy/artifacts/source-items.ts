import { isProviderItem, stringValue } from "./payload.ts";
import type {
  CodexProviderItem,
  CodexResponsesCustomToolCallItem,
  CodexResponsesCustomToolCallOutputItem,
  CodexResponsesFunctionCallItem,
  CodexResponsesFunctionCallOutputItem,
  CodexResponsesInputItem,
  CodexResponsesMcpToolCallOutputItem,
  CodexResponsesMessageItem,
  CodexResponsesProtocolToolCallItem,
  CodexResponsesToolSearchOutputItem,
  CodexResponsesUnknownInputObject
} from "./types.ts";

export type CodexSourceMessageProtocolType = "message" | "agent_message";
export type CodexSourceToolCallProtocolType =
  | "function_call"
  | "custom_tool_call"
  | "local_shell_call"
  | "tool_search_call"
  | "web_search_call"
  | "image_generation_call";
export type CodexSourceToolOutputProtocolType =
  | "function_call_output"
  | "custom_tool_call_output"
  | "mcp_tool_call_output"
  | "tool_search_output";
export type CodexSourceOpaqueProtocolType =
  | "additional_tools"
  | "compaction"
  | "compaction_trigger"
  | "context_compaction"
  | "other"
  | "unknown";

export type CodexSourceMessageItem = {
  sourceProtocolType: CodexSourceMessageProtocolType;
  item: CodexResponsesMessageItem | string;
  role: string;
  index: number;
  source: "string_input" | "typed_message" | "role_message" | "agent_message";
};

export type CodexSourceToolCallItem = {
  sourceProtocolType: CodexSourceToolCallProtocolType;
  item: CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem | CodexResponsesProtocolToolCallItem;
  index: number;
  toolName: string;
  callId?: string;
  inputValue?: unknown;
};

export type CodexSourceToolOutputItem = {
  sourceProtocolType: CodexSourceToolOutputProtocolType;
  item: CodexResponsesFunctionCallOutputItem | CodexResponsesCustomToolCallOutputItem | CodexResponsesMcpToolCallOutputItem | CodexResponsesToolSearchOutputItem;
  index: number;
  callId?: string;
  outputValue: unknown;
};

export type CodexSourceReasoningItem = {
    sourceProtocolType: "reasoning";
    item: CodexResponsesUnknownInputObject;
    index: number;
    providerType: "reasoning";
};

export type CodexSourceOpaqueItem = {
  sourceProtocolType: CodexSourceOpaqueProtocolType;
  item: CodexResponsesUnknownInputObject;
  index: number;
  providerType: string;
};

export type CodexSourceInputItem =
  | CodexSourceMessageItem
  | CodexSourceToolCallItem
  | CodexSourceToolOutputItem
  | CodexSourceReasoningItem
  | CodexSourceOpaqueItem;

export function classifySourceInputItem(item: CodexResponsesInputItem, index: number): CodexSourceInputItem | null {
  if (typeof item === "string") {
    return {
      sourceProtocolType: "message",
      item,
      role: "user",
      index,
      source: "string_input"
    };
  }
  if (!isProviderItem(item)) return null;

  if (isFunctionCallItem(item)) {
    return {
      sourceProtocolType: "function_call",
      item,
      index,
      toolName: stringValue(item.name) ?? "unknown",
      inputValue: item.arguments,
      ...optionalCallId(item)
    };
  }
  if (isFunctionCallOutputItem(item)) {
    return {
      sourceProtocolType: "function_call_output",
      item,
      index,
      outputValue: item.output,
      ...optionalCallId(item)
    };
  }
  if (isCustomToolCallItem(item)) {
    return {
      sourceProtocolType: "custom_tool_call",
      item,
      index,
      toolName: stringValue(item.name) ?? "custom",
      inputValue: item.input,
      ...optionalCallId(item)
    };
  }
  if (isCustomToolCallOutputItem(item)) {
    return {
      sourceProtocolType: "custom_tool_call_output",
      item,
      index,
      outputValue: item.output,
      ...optionalCallId(item)
    };
  }
  if (isMcpToolCallOutputItem(item)) {
    return {
      sourceProtocolType: "mcp_tool_call_output",
      item,
      index,
      outputValue: item.output ?? item.result,
      ...optionalCallId(item)
    };
  }
  if (isToolSearchOutputItem(item)) {
    return {
      sourceProtocolType: "tool_search_output",
      item,
      index,
      outputValue: item.output ?? item.results,
      ...optionalCallId(item)
    };
  }
  if (isProtocolToolCallItem(item)) {
    return {
      sourceProtocolType: item.type,
      item,
      index,
      toolName: protocolToolName(item),
      inputValue: item.arguments ?? item.input ?? item.action ?? item.query,
      ...optionalCallId(item)
    };
  }

  const role = stringValue(item.role);
  if (isMessageItem(item) || role) {
    return {
      sourceProtocolType: "message",
      item: item as CodexResponsesMessageItem,
      role: role ?? "unknown",
      index,
      source: isMessageItem(item) ? "typed_message" : "role_message"
    };
  }

  const providerType = stringValue(item.type) ?? "unknown";
  if (providerType === "agent_message") {
    return {
      sourceProtocolType: "agent_message",
      item: item as CodexResponsesMessageItem,
      role: "assistant",
      index,
      source: "agent_message"
    };
  }
  if (providerType === "reasoning") {
    return {
      sourceProtocolType: "reasoning",
      item,
      index,
      providerType
    };
  }
  if (isOpaqueProtocolType(providerType)) {
    return {
      sourceProtocolType: providerType,
      item,
      index,
      providerType
    };
  }
  return {
    sourceProtocolType: "unknown",
    item,
    index,
    providerType
  };
}

export function indexToolCalls(inputs: CodexResponsesInputItem[]): Map<string, CodexProviderItem> {
  const callsById = new Map<string, CodexProviderItem>();
  for (const [index, item] of inputs.entries()) {
    const sourceItem = classifySourceInputItem(item, index);
    if (!sourceItem) continue;
    if (!isToolCallSource(sourceItem)) continue;
    if (sourceItem.callId) callsById.set(sourceItem.callId, sourceItem.item);
  }
  return callsById;
}

export function sourceMessageRole(item: CodexResponsesInputItem): string | undefined {
  const sourceItem = classifySourceInputItem(item, -1);
  return sourceItem && isMessageSource(sourceItem) ? sourceItem.role : undefined;
}

export function isMessageSource(sourceItem: CodexSourceInputItem): sourceItem is CodexSourceMessageItem {
  return sourceItem.sourceProtocolType === "message" || sourceItem.sourceProtocolType === "agent_message";
}

export function isToolCallSource(sourceItem: CodexSourceInputItem): sourceItem is CodexSourceToolCallItem {
  return sourceItem.sourceProtocolType === "function_call"
    || sourceItem.sourceProtocolType === "custom_tool_call"
    || sourceItem.sourceProtocolType === "local_shell_call"
    || sourceItem.sourceProtocolType === "tool_search_call"
    || sourceItem.sourceProtocolType === "web_search_call"
    || sourceItem.sourceProtocolType === "image_generation_call";
}

export function isToolOutputSource(sourceItem: CodexSourceInputItem): sourceItem is CodexSourceToolOutputItem {
  return sourceItem.sourceProtocolType === "function_call_output"
    || sourceItem.sourceProtocolType === "custom_tool_call_output"
    || sourceItem.sourceProtocolType === "mcp_tool_call_output"
    || sourceItem.sourceProtocolType === "tool_search_output";
}

export function isFunctionCallItem(item: CodexProviderItem): item is CodexResponsesFunctionCallItem {
  return item.type === "function_call";
}

export function isCustomToolCallItem(item: CodexProviderItem): item is CodexResponsesCustomToolCallItem {
  return item.type === "custom_tool_call";
}

function isFunctionCallOutputItem(item: CodexProviderItem): item is CodexResponsesFunctionCallOutputItem {
  return item.type === "function_call_output";
}

function isCustomToolCallOutputItem(item: CodexProviderItem): item is CodexResponsesCustomToolCallOutputItem {
  return item.type === "custom_tool_call_output";
}

function isMcpToolCallOutputItem(item: CodexProviderItem): item is CodexResponsesMcpToolCallOutputItem {
  return item.type === "mcp_tool_call_output";
}

function isToolSearchOutputItem(item: CodexProviderItem): item is CodexResponsesToolSearchOutputItem {
  return item.type === "tool_search_output";
}

function isProtocolToolCallItem(item: CodexProviderItem): item is CodexResponsesProtocolToolCallItem {
  return item.type === "local_shell_call"
    || item.type === "tool_search_call"
    || item.type === "web_search_call"
    || item.type === "image_generation_call";
}

function isMessageItem(item: CodexProviderItem): item is CodexResponsesMessageItem {
  return item.type === "message";
}

function protocolToolName(item: CodexResponsesProtocolToolCallItem): string {
  const explicitName = stringValue(item.name);
  if (explicitName) return explicitName;
  if (item.type === "local_shell_call") return "local_shell";
  if (item.type === "tool_search_call") return "tool_search";
  if (item.type === "web_search_call") return "web_search";
  if (item.type === "image_generation_call") return "image_generation";
  return "unknown";
}

function isOpaqueProtocolType(type: string): type is CodexSourceOpaqueProtocolType {
  return type === "additional_tools"
    || type === "compaction"
    || type === "compaction_trigger"
    || type === "context_compaction"
    || type === "other";
}

function optionalCallId(item: { call_id?: unknown }): { callId?: string } {
  const callId = stringValue(item.call_id);
  return callId ? { callId } : {};
}
