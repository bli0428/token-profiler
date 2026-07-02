import { describeCallMetadata, describeCustomToolCall, describeFunctionCall, describeToolOutput } from "./metadata.ts";
import {
  artifactTypeForInstructions,
  artifactTypeForMessageRole,
  artifactTypeForToolOutput,
  contentKindForMessageRole,
  sourceProvenance,
  withSourceProvenance
} from "./artifact-mapping.ts";
import {
  artifactContent,
  asArray,
  asProviderItem,
  stringValue
} from "./payload.ts";
import {
  protocolOutputArtifactId,
  protocolOutputArtifactTypeOverride,
  protocolToolName
} from "./protocol-items.ts";
import {
  classifySourceInputItem,
  indexToolCalls as indexSourceToolCalls,
  isMessageSource,
  isToolCallSource,
  isToolOutputSource,
  sourceMessageRole,
  type CodexSourceInputItem,
  type CodexSourceMessageItem,
  type CodexSourceOpaqueItem,
  type CodexSourceToolCallItem,
  type CodexSourceToolOutputItem
} from "./source-items.ts";
import type {
  CodexExtractedArtifact,
  CodexPatchArtifact,
  CodexPatchMetadata,
  CodexProviderItem,
  CodexReasoningStateArtifact,
  CodexReasoningStateMetadata,
  CodexResponsesInputItem,
  CodexResponsesRequest,
  CodexResponsesToolDefinition,
  CodexToolCallArtifact,
  CodexToolCallMetadata,
  CodexUnknownInputMetadata
} from "./types.ts";

type InputItemContext = {
  item: CodexResponsesInputItem;
  index: number;
  callsById: Map<string, CodexProviderItem>;
  titleCandidateKeys: Set<string>;
};

export const indexToolCalls = indexSourceToolCalls;

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
      content: JSON.stringify(tool),
      metadata: withSourceProvenance({
        content_kind: "tool_definition",
        role: "system",
        message_source: "system_context",
        title_candidate: false,
        part_index: 0
      }, sourceProvenance({
        sourceProtocolType: "tool_definition",
        sourceItemIndex: index,
        sourceToolName: name
      }))
    } satisfies CodexExtractedArtifact;
  });
}

export function extractInputItemArtifacts({
  item,
  index,
  callsById,
  titleCandidateKeys
}: InputItemContext): CodexExtractedArtifact[] {
  const sourceItem = classifySourceInputItem(item, index);
  if (!sourceItem) return [];

  if (isToolCallSource(sourceItem)) {
    return artifactFromContent(
      sourceItem.item,
      (content) => toolCallSourceArtifact(sourceItem, content)
    );
  }
  if (isToolOutputSource(sourceItem)) {
    return artifactFromContent(
      sourceItem.outputValue,
      (content) => toolOutputSourceArtifact(sourceItem, callsById, content)
    );
  }
  if (isMessageSource(sourceItem)) return messageArtifacts(sourceItem, titleCandidateKeys);
  if (sourceItem.sourceProtocolType === "reasoning") {
    return artifactFromContent(sourceItem.item, (content) => reasoningStateArtifact(sourceItem, content));
  }
  return artifactFromContent(sourceItem.item, (content) => unknownInputArtifact(sourceItem, content));
}

export function titleCandidateMessageKeys(inputs: CodexResponsesInputItem[]): Set<string> {
  const candidates = new Map<string, string>();
  for (const [index, item] of inputs.entries()) {
    const role = sourceMessageRole(item);
    if (role !== "user" && role !== "assistant") continue;
    if (isContextMessageInput(item)) continue;
    candidates.set(role, messageKey(index, role));
  }
  return new Set(candidates.values());
}

function codexSystemArtifact(content: string): CodexExtractedArtifact {
  return {
    kind: "system_instruction",
    artifactType: artifactTypeForInstructions(),
    artifactName: "instructions",
    artifactId: "SYSTEM_PROMPT:instructions",
    content,
    metadata: withSourceProvenance({
      content_kind: "system_prompt",
      role: "system",
      message_source: "system_context",
      title_candidate: false,
      part_index: 0
    }, sourceProvenance({ sourceProtocolType: "instructions" }))
  };
}

function toolCallSourceArtifact(sourceItem: CodexSourceToolCallItem, content: string): CodexToolCallArtifact | CodexPatchArtifact {
  if (sourceItem.sourceProtocolType === "custom_tool_call") return customToolCallArtifact(sourceItem, content);
  const toolCall = describeFunctionCall({ toolName: sourceItem.toolName, callId: sourceItem.callId, input: sourceItem.inputValue });
  return {
    kind: "tool_call",
    artifactType: "SUMMARY",
    artifactName: toolCall.artifactName,
    artifactId: `SUMMARY:tool-call:${sourceItem.callId ?? sourceItem.index}`,
    content,
    metadata: withSourceProvenance(toolCall.metadata, provenanceForSourceItem(sourceItem))
  };
}

function toolOutputSourceArtifact(
  sourceItem: CodexSourceToolOutputItem,
  callsById: Map<string, CodexProviderItem>,
  content: string
): CodexExtractedArtifact {
  const callId = sourceItem.callId;
  const call = callId ? callsById.get(callId) : undefined;
  const toolName = call ? protocolToolName(call) : protocolToolName(sourceItem.item);
  const callMetadata = call ? describeCallMetadata(call).metadata : undefined;
  const output = describeToolOutput({
    toolName,
    callId,
    output: sourceItem.outputValue,
    callMetadata
  });
  const artifactType = protocolOutputArtifactTypeOverride(sourceItem.sourceProtocolType)
    ?? artifactTypeForToolOutput(toolName);
  return {
    kind: "tool_output",
    artifactType,
    artifactName: output.artifactName,
    artifactId: protocolOutputArtifactId(sourceItem.sourceProtocolType, callId, sourceItem.index),
    content,
    metadata: withSourceProvenance(output.metadata, sourceProvenance({
      sourceProtocolType: sourceItem.sourceProtocolType,
      sourceItemIndex: sourceItem.index,
      sourceToolName: toolName
    }))
  };
}

function customToolCallArtifact(sourceItem: CodexSourceToolCallItem, content: string): CodexToolCallArtifact | CodexPatchArtifact {
  const toolCall = describeCustomToolCall({
    toolName: sourceItem.toolName,
    callId: sourceItem.callId,
    input: sourceItem.inputValue
  });
  return toolCallArtifact({
    artifactName: toolCall.artifactName,
    artifactId: `SUMMARY:custom-tool-call:${sourceItem.callId ?? sourceItem.index}`,
    content,
    metadata: withSourceProvenance(toolCall.metadata, provenanceForSourceItem(sourceItem))
  });
}

function messageArtifacts(sourceItem: CodexSourceMessageItem, titleCandidateKeys: Set<string>): CodexExtractedArtifact[] {
  const role = sourceItem.role;
  const titleCandidate = titleCandidateKeys.has(messageKey(sourceItem.index, role));
  const source = messageSource({
    role,
    index: sourceItem.index,
    titleCandidate,
    contextMessage: isContextMessageInput(sourceItem.item)
  });
  if (typeof sourceItem.item === "string") {
    return [messageArtifact(sourceItem, 0, sourceItem.item, titleCandidate, source)];
  }
  return asArray(sourceItem.item.content).flatMap((part, partIndex) => {
    const partItem = asProviderItem(part);
    const text = typeof part === "string" ? part : stringValue(partItem.text);
    return artifactFromContent(text, (content) => messageArtifact(sourceItem, partIndex, content, titleCandidate, source));
  });
}

function messageArtifact(
  sourceItem: CodexSourceMessageItem,
  partIndex: number,
  content: string,
  titleCandidate: boolean,
  source: "agent_context" | "conversation_history" | "current_turn" | "system_context" | "unknown"
): CodexExtractedArtifact {
  const role = sourceItem.role;
  const artifactType = artifactTypeForMessageRole(role);
  return {
    kind: "message",
    artifactType,
    artifactName: `message:${role}:${sourceItem.index}:${partIndex}`,
    artifactId: `${artifactType}:message:${role}:${sourceItem.index}:${partIndex}`,
    role,
    partIndex,
    content,
    metadata: withSourceProvenance({
      content_kind: contentKindForMessageRole(role),
      role,
      message_source: source,
      title_candidate: titleCandidate,
      part_index: partIndex
    }, provenanceForSourceItem(sourceItem))
  };
}

function messageKey(index: number, role: string): string {
  return `${index}:${role}`;
}

function messageSource({
  role,
  index,
  titleCandidate,
  contextMessage
}: {
  role: string;
  index: number;
  titleCandidate: boolean;
  contextMessage: boolean;
}): "agent_context" | "conversation_history" | "current_turn" | "system_context" | "unknown" {
  if (role === "system" || role === "developer") return "system_context";
  if (contextMessage) return "agent_context";
  if (titleCandidate) return "current_turn";
  if (role === "user" || role === "assistant") return "conversation_history";
  return "unknown";
}

function isContextMessageInput(item: CodexResponsesInputItem): boolean {
  if (typeof item === "string") return isContextMessageText(item);
  return isContextMessageText(asArray(item.content)
    .map((part) => {
      if (typeof part === "string") return part;
      return stringValue(asProviderItem(part).text) ?? "";
    })
    .join("\n"));
}

function isContextMessageText(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("# AGENTS.md instructions")
    || trimmed.startsWith("<environment_context>")
    || trimmed.startsWith("<permissions instructions>")
    || trimmed.startsWith("<app-context>")
    || trimmed.startsWith("<collaboration_mode>")
    || trimmed.startsWith("<skills_instructions>")
    || trimmed.startsWith("<plugins_instructions>");
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

function unknownInputArtifact(sourceItem: CodexSourceOpaqueItem, content: string): CodexExtractedArtifact {
  const providerType = sourceItem.providerType;
  const metadata: CodexUnknownInputMetadata = {
    content_kind: "unknown_input",
    provider_type: providerType,
    reason: "unsupported_responses_input_item",
    observed_keys: Object.keys(sourceItem.item).sort(),
    ...provenanceForSourceItem(sourceItem)
  };
  return {
    kind: "unknown_input",
    artifactType: "SUMMARY",
    artifactName: `input:${providerType}:${sourceItem.index}`,
    artifactId: `SUMMARY:input:${providerType}:${sourceItem.index}`,
    content,
    metadata
  };
}

function reasoningStateArtifact(sourceItem: Extract<CodexSourceInputItem, { sourceProtocolType: "reasoning" }>, content: string): CodexReasoningStateArtifact {
  const metadata: CodexReasoningStateMetadata = {
    content_kind: "reasoning_state",
    provider_type: "reasoning",
    reason: "opaque_reasoning_state",
    observed_keys: Object.keys(sourceItem.item).sort(),
    ...provenanceForSourceItem(sourceItem)
  };
  return {
    kind: "reasoning_state",
    artifactType: "SUMMARY",
    artifactName: "Reasoning state",
    artifactId: `SUMMARY:input:reasoning:${sourceItem.index}`,
    content,
    metadata
  };
}

function provenanceForSourceItem(sourceItem: CodexSourceInputItem) {
  return sourceProvenance({
    sourceProtocolType: sourceItem.sourceProtocolType,
    sourceItemIndex: sourceItem.index,
    ...("role" in sourceItem ? { sourceRole: sourceItem.role } : {}),
    ...("toolName" in sourceItem ? { sourceToolName: sourceItem.toolName } : {})
  });
}

function artifactFromContent(
  value: unknown,
  buildArtifact: (content: string) => CodexExtractedArtifact
): CodexExtractedArtifact[] {
  const content = artifactContent(value);
  return content && content.length > 0 ? [buildArtifact(content)] : [];
}
