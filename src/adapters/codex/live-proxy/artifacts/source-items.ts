import { isProviderItem, stringValue } from "./payload.ts";
import {
  CODEX_PROTOCOL_ITEM_DESCRIPTORS,
  protocolInputValue,
  protocolItemDescriptor,
  protocolMessageRole,
  protocolMessageSource,
  protocolOutputValue,
  protocolProviderType,
  protocolToolName,
  type CodexKnownProtocolItemType
} from "./protocol-items.ts";
import type {
  CodexProviderItem,
  CodexResponsesInputItem,
  CodexResponsesMessageItem,
  CodexResponsesUnknownInputObject
} from "./types.ts";

type ProtocolTypesForGroup<GroupName extends string> = {
  [TypeName in CodexKnownProtocolItemType]: typeof CODEX_PROTOCOL_ITEM_DESCRIPTORS[TypeName]["group"] extends GroupName ? TypeName : never;
}[CodexKnownProtocolItemType];

export type CodexSourceMessageProtocolType = ProtocolTypesForGroup<"message">;
export type CodexSourceToolCallProtocolType = ProtocolTypesForGroup<"tool_call">;
export type CodexSourceToolOutputProtocolType = ProtocolTypesForGroup<"tool_output">;
export type CodexSourceOpaqueProtocolType = ProtocolTypesForGroup<"opaque"> | "unknown";

export type CodexSourceMessageItem = {
  sourceProtocolType: CodexSourceMessageProtocolType;
  item: CodexResponsesMessageItem | string;
  role: string;
  index: number;
  source: "string_input" | "typed_message" | "role_message" | "agent_message";
};

export type CodexSourceToolCallItem = {
  sourceProtocolType: CodexSourceToolCallProtocolType;
  item: CodexProviderItem;
  index: number;
  toolName: string;
  callId?: string;
  inputValue?: unknown;
};

export type CodexSourceToolOutputItem = {
  sourceProtocolType: CodexSourceToolOutputProtocolType;
  item: CodexProviderItem;
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

  const protocolSource = classifyKnownProtocolItem(item, index);
  if (protocolSource) return protocolSource;

  const role = stringValue(item.role);
  if (role) {
    return {
      sourceProtocolType: "message",
      item: item as CodexResponsesMessageItem,
      role,
      index,
      source: "role_message"
    };
  }

  const providerType = stringValue(item.type) ?? "unknown";
  return {
    sourceProtocolType: "unknown",
    item,
    index,
    providerType
  };
}

function classifyKnownProtocolItem(item: CodexProviderItem, index: number): CodexSourceInputItem | null {
  const descriptor = protocolItemDescriptor(item.type);
  if (!descriptor) return null;
  const sourceProtocolType = item.type as CodexKnownProtocolItemType;

  if (descriptor.group === "message") {
    return {
      sourceProtocolType: sourceProtocolType as CodexSourceMessageProtocolType,
      item: item as CodexResponsesMessageItem,
      role: protocolMessageRole(item),
      index,
      source: protocolMessageSource(item)
    };
  }
  if (descriptor.group === "tool_call") {
    return {
      sourceProtocolType: sourceProtocolType as CodexSourceToolCallProtocolType,
      item,
      index,
      toolName: protocolToolName(item),
      inputValue: protocolInputValue(item),
      ...optionalCallId(item)
    };
  }
  if (descriptor.group === "tool_output") {
    return {
      sourceProtocolType: sourceProtocolType as CodexSourceToolOutputProtocolType,
      item,
      index,
      outputValue: protocolOutputValue(item),
      ...optionalCallId(item)
    };
  }
  if (descriptor.group === "reasoning") {
    return {
      sourceProtocolType: "reasoning",
      item,
      index,
      providerType: "reasoning"
    };
  }
  return {
    sourceProtocolType: sourceProtocolType as CodexSourceOpaqueProtocolType,
    item,
    index,
    providerType: protocolProviderType(item)
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
  return protocolItemDescriptor(sourceItem.sourceProtocolType)?.group === "message";
}

export function isToolCallSource(sourceItem: CodexSourceInputItem): sourceItem is CodexSourceToolCallItem {
  return protocolItemDescriptor(sourceItem.sourceProtocolType)?.group === "tool_call";
}

export function isToolOutputSource(sourceItem: CodexSourceInputItem): sourceItem is CodexSourceToolOutputItem {
  return protocolItemDescriptor(sourceItem.sourceProtocolType)?.group === "tool_output";
}

function optionalCallId(item: { call_id?: unknown }): { callId?: string } {
  const callId = stringValue(item.call_id);
  return callId ? { callId } : {};
}
