import { isProviderItem, stringValue } from "./payload.ts";
import type {
  CodexProviderItem,
  CodexResponsesCustomToolCallItem,
  CodexResponsesCustomToolCallOutputItem,
  CodexResponsesFunctionCallItem,
  CodexResponsesFunctionCallOutputItem,
  CodexResponsesInputItem,
  CodexResponsesMessageItem,
  CodexResponsesUnknownInputObject
} from "./types.ts";

export type CodexSourceInputItem =
  | {
    sourceProtocolType: "message";
    item: CodexResponsesMessageItem | string;
    role: string;
    index: number;
    source: "string_input" | "typed_message" | "role_message";
  }
  | {
    sourceProtocolType: "function_call";
    item: CodexResponsesFunctionCallItem;
    index: number;
    toolName: string;
    callId?: string;
  }
  | {
    sourceProtocolType: "function_call_output";
    item: CodexResponsesFunctionCallOutputItem;
    index: number;
    callId?: string;
  }
  | {
    sourceProtocolType: "custom_tool_call";
    item: CodexResponsesCustomToolCallItem;
    index: number;
    toolName: string;
    callId?: string;
  }
  | {
    sourceProtocolType: "custom_tool_call_output";
    item: CodexResponsesCustomToolCallOutputItem;
    index: number;
    callId?: string;
  }
  | {
    sourceProtocolType: "reasoning";
    item: CodexResponsesUnknownInputObject;
    index: number;
    providerType: "reasoning";
  }
  | {
    sourceProtocolType: "unknown";
    item: CodexResponsesUnknownInputObject;
    index: number;
    providerType: string;
  };

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
      ...optionalCallId(item)
    };
  }
  if (isFunctionCallOutputItem(item)) {
    return {
      sourceProtocolType: "function_call_output",
      item,
      index,
      ...optionalCallId(item)
    };
  }
  if (isCustomToolCallItem(item)) {
    return {
      sourceProtocolType: "custom_tool_call",
      item,
      index,
      toolName: stringValue(item.name) ?? "custom",
      ...optionalCallId(item)
    };
  }
  if (isCustomToolCallOutputItem(item)) {
    return {
      sourceProtocolType: "custom_tool_call_output",
      item,
      index,
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
  if (providerType === "reasoning") {
    return {
      sourceProtocolType: "reasoning",
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

export function indexToolCalls(inputs: CodexResponsesInputItem[]): Map<string, CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem> {
  const callsById = new Map<string, CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem>();
  for (const [index, item] of inputs.entries()) {
    const sourceItem = classifySourceInputItem(item, index);
    if (!sourceItem) continue;
    if (sourceItem.sourceProtocolType !== "function_call" && sourceItem.sourceProtocolType !== "custom_tool_call") continue;
    if (sourceItem.callId) callsById.set(sourceItem.callId, sourceItem.item);
  }
  return callsById;
}

export function sourceMessageRole(item: CodexResponsesInputItem): string | undefined {
  const sourceItem = classifySourceInputItem(item, -1);
  return sourceItem?.sourceProtocolType === "message" ? sourceItem.role : undefined;
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

function isMessageItem(item: CodexProviderItem): item is CodexResponsesMessageItem {
  return item.type === "message";
}

function optionalCallId(item: { call_id?: unknown }): { callId?: string } {
  const callId = stringValue(item.call_id);
  return callId ? { callId } : {};
}
