import {
  classifyToolOutput,
  describeCallMetadata,
  describeCustomToolCall,
  describeFunctionCall,
  describeToolOutput
} from "./metadata.ts";
import {
  artifactContent,
  asArray,
  asProviderItem,
  isProviderItem,
  stringValue
} from "./payload.ts";
import type {
  CodexExtractedArtifact,
  CodexPatchArtifact,
  CodexPatchMetadata,
  CodexProviderItem,
  CodexResponsesFunctionCallItem,
  CodexResponsesFunctionCallOutputItem,
  CodexResponsesCustomToolCallItem,
  CodexResponsesCustomToolCallOutputItem,
  CodexResponsesInputItem,
  CodexResponsesMessageItem,
  CodexResponsesRequest,
  CodexResponsesToolDefinition,
  CodexResponsesUnknownInputObject,
  CodexToolCallArtifact,
  CodexToolCallMetadata,
  CodexUnknownInputMetadata
} from "./types.ts";

type InputItemContext = {
  item: CodexResponsesInputItem;
  index: number;
  callsById: Map<string, CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem>;
};

export function extractInstructionsArtifact(request: CodexResponsesRequest): CodexExtractedArtifact[] {
  const content = artifactContent(request.instructions);
  if (!content) return [];
  return [codexSystemArtifact(content)];
}

export function extractToolDefinitionArtifacts(tools: unknown): CodexExtractedArtifact[] {
  return asArray(tools).map((tool, index) => {
    const toolItem = asProviderItem(tool) as CodexResponsesToolDefinition;
    const functionItem = asProviderItem(toolItem.function);
    const name = stringValue(toolItem.name) ?? stringValue(functionItem.name) ?? stringValue(toolItem.type) ?? `tool_${index}`;
    return {
      kind: "tool_definition",
      artifactType: "SYSTEM_PROMPT",
      artifactName: `tool-definition:${name}`,
      artifactId: `SYSTEM_PROMPT:tool-definition:${name}`,
      content: JSON.stringify(tool)
    } satisfies CodexExtractedArtifact;
  });
}

export function indexToolCalls(inputs: CodexResponsesInputItem[]): Map<string, CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem> {
  const callsById = new Map<string, CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem>();
  for (const item of inputs) {
    if (typeof item === "string") continue;
    const callId = stringValue(item.call_id);
    if (isFunctionCallItem(item) && callId) {
      callsById.set(callId, item);
    }
    if (isCustomToolCallItem(item) && callId) {
      callsById.set(callId, item);
    }
  }
  return callsById;
}

export function extractInputItemArtifacts({
  item,
  index,
  callsById
}: InputItemContext): CodexExtractedArtifact[] {
  if (typeof item === "string") return [messageArtifact("user", index, 0, item)];
  if (!isProviderItem(item)) return [];

  if (isFunctionCallItem(item)) {
    return artifactFromContent(
      item,
      (content) => functionCallArtifact(item, index, content)
    );
  }
  if (isFunctionCallOutputItem(item)) {
    return artifactFromContent(
      item.output,
      (content) => functionCallOutputArtifact(item, index, callsById, content)
    );
  }
  if (isCustomToolCallItem(item)) {
    return artifactFromContent(
      item,
      (content) => customToolCallArtifact(item, index, content)
    );
  }
  if (isCustomToolCallOutputItem(item)) {
    return artifactFromContent(
      item.output,
      (content) => customToolCallOutputArtifact(item, index, callsById, content)
    );
  }
  if (isMessageItem(item)) return messageArtifacts(item, index);
  if (item.role) return messageArtifacts(item, index);
  return artifactFromContent(item, (content) => unknownInputArtifact(item, index, content));
}

function codexSystemArtifact(content: string): CodexExtractedArtifact {
  return {
    kind: "system_instruction",
    artifactType: "SYSTEM_PROMPT",
    artifactName: "instructions",
    artifactId: "SYSTEM_PROMPT:instructions",
    content
  };
}

function functionCallArtifact(item: CodexResponsesFunctionCallItem, index: number, content: string): CodexToolCallArtifact {
  const toolName = stringValue(item.name) ?? "unknown";
  const callId = stringValue(item.call_id);
  const toolCall = describeFunctionCall({ toolName, callId, input: item.arguments });
  return {
    kind: "tool_call",
    artifactType: "SUMMARY",
    artifactName: toolCall.artifactName,
    artifactId: `SUMMARY:tool-call:${callId ?? index}`,
    content,
    metadata: toolCall.metadata
  };
}

function functionCallOutputArtifact(
  item: CodexResponsesFunctionCallOutputItem,
  index: number,
  callsById: Map<string, CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem>,
  content: string
): CodexExtractedArtifact {
  const callId = stringValue(item.call_id);
  const call = callId ? callsById.get(callId) : undefined;
  const toolName = stringValue(call?.name) ?? "unknown";
  const callMetadata = call ? describeCallMetadata(call).metadata : undefined;
  const output = describeToolOutput({
    toolName,
    callId,
    output: item.output,
    callMetadata
  });
  return {
    kind: "tool_output",
    artifactType: classifyToolOutput(toolName),
    artifactName: output.artifactName,
    artifactId: `TOOL_OUTPUT:${callId ?? index}`,
    content,
    metadata: output.metadata
  };
}

function customToolCallArtifact(item: CodexResponsesCustomToolCallItem, index: number, content: string): CodexToolCallArtifact | CodexPatchArtifact {
  const toolName = stringValue(item.name) ?? "custom";
  const callId = stringValue(item.call_id);
  const toolCall = describeCustomToolCall({
    toolName,
    callId,
    input: item.input
  });
  return toolCallArtifact({
    artifactName: toolCall.artifactName,
    artifactId: `SUMMARY:custom-tool-call:${callId ?? index}`,
    content,
    metadata: toolCall.metadata
  });
}

function customToolCallOutputArtifact(
  item: CodexResponsesCustomToolCallOutputItem,
  index: number,
  callsById: Map<string, CodexResponsesFunctionCallItem | CodexResponsesCustomToolCallItem>,
  content: string
): CodexExtractedArtifact {
  const callId = stringValue(item.call_id);
  const call = callId ? callsById.get(callId) : undefined;
  const toolName = stringValue(call?.name) ?? "custom_tool";
  const callMetadata = call ? describeCallMetadata(call).metadata : undefined;
  const output = describeToolOutput({
    toolName,
    callId,
    output: item.output,
    callMetadata
  });
  return {
    kind: "tool_output",
    artifactType: "SUMMARY",
    artifactName: output.artifactName,
    artifactId: `SUMMARY:custom-tool-call-output:${callId ?? index}`,
    content,
    metadata: output.metadata
  };
}

function messageArtifacts(item: CodexProviderItem, index: number): CodexExtractedArtifact[] {
  const role = stringValue(item.role) ?? "unknown";
  return asArray(item.content).flatMap((part, partIndex) => {
    const partItem = asProviderItem(part);
    const text = typeof part === "string" ? part : stringValue(partItem.text);
    return artifactFromContent(text, (content) => messageArtifact(role, index, partIndex, content));
  });
}

function messageArtifact(role: string, index: number, partIndex: number, content: string): CodexExtractedArtifact {
  const artifactType = messageArtifactType(role);
  return {
    kind: "message",
    artifactType,
    artifactName: `message:${role}:${index}:${partIndex}`,
    artifactId: `${artifactType}:message:${role}:${index}:${partIndex}`,
    role,
    partIndex,
    content
  };
}

function messageArtifactType(role: string): "SYSTEM_PROMPT" | "USER_MESSAGE" | "SUMMARY" {
  if (role === "system" || role === "developer") return "SYSTEM_PROMPT";
  if (role === "user") return "USER_MESSAGE";
  return "SUMMARY";
}

function toolCallArtifact({
  artifactName,
  artifactId,
  content,
  metadata
}: {
  artifactName: string;
  artifactId: string;
  content: string;
  metadata: CodexToolCallMetadata | CodexPatchMetadata;
}): CodexToolCallArtifact | CodexPatchArtifact {
  if (metadata.content_kind === "patch") {
    return {
      kind: "patch",
      artifactType: "SUMMARY",
      artifactName,
      artifactId,
      content,
      metadata
    };
  }
  return {
    kind: "tool_call",
    artifactType: "SUMMARY",
    artifactName,
    artifactId,
    content,
    metadata
  };
}

function unknownInputArtifact(item: CodexResponsesUnknownInputObject, index: number, content: string): CodexExtractedArtifact {
  const providerType = stringValue(item.type) ?? "unknown";
  const metadata: CodexUnknownInputMetadata = {
    content_kind: "unknown_input",
    provider_type: providerType,
    reason: "unsupported_responses_input_item",
    observed_keys: Object.keys(item).sort()
  };
  return {
    kind: "unknown_input",
    artifactType: "SUMMARY",
    artifactName: `input:${providerType}:${index}`,
    artifactId: `SUMMARY:input:${providerType}:${index}`,
    content,
    metadata
  };
}

function artifactFromContent(
  value: unknown,
  buildArtifact: (content: string) => CodexExtractedArtifact
): CodexExtractedArtifact[] {
  const content = artifactContent(value);
  return content && content.length > 0 ? [buildArtifact(content)] : [];
}

function isFunctionCallItem(item: CodexProviderItem): item is CodexResponsesFunctionCallItem {
  return item.type === "function_call";
}

function isFunctionCallOutputItem(item: CodexProviderItem): item is CodexResponsesFunctionCallOutputItem {
  return item.type === "function_call_output";
}

function isCustomToolCallItem(item: CodexProviderItem): item is CodexResponsesCustomToolCallItem {
  return item.type === "custom_tool_call";
}

function isCustomToolCallOutputItem(item: CodexProviderItem): item is CodexResponsesCustomToolCallOutputItem {
  return item.type === "custom_tool_call_output";
}

function isMessageItem(item: CodexProviderItem): item is CodexResponsesMessageItem {
  return item.type === "message";
}
