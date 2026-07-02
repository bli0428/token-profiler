import {
  firstContentLine,
  normalizeToolOutput,
  parseJsonValue,
  truncateMiddle,
  truncatePath
} from "./payload.ts";
import type {
  CodexPatchMetadata,
  CodexProviderItem,
  CodexSourceProvenance,
  CodexToolCallMetadata,
  CodexToolOutputMetadata
} from "./types.ts";

type ToolCallMetadataDraft = Omit<CodexToolCallMetadata, keyof CodexSourceProvenance>;
type PatchMetadataDraft = Omit<CodexPatchMetadata, keyof CodexSourceProvenance>;
type ToolOutputMetadataDraft = Omit<CodexToolOutputMetadata, keyof CodexSourceProvenance>;

type DescribedFunctionCall = {
  artifactName: string;
  metadata: ToolCallMetadataDraft;
};

type DescribedToolCall = {
  artifactName: string;
  metadata: ToolCallMetadataDraft | PatchMetadataDraft;
};

type PatchSummary = {
  files: string[];
  adds: number;
  updates: number;
  deletes: number;
  summary: string;
};

export function describeFunctionCall({
  toolName,
  callId,
  input
}: { toolName: string; callId: string | undefined; input: unknown }): DescribedFunctionCall {
  const parsed = parseJsonValue(input);
  const command = typeof parsed?.cmd === "string" ? parsed.cmd : undefined;
  const label = command
    ? `${toolName}: ${truncateMiddle(command, 80)}`
    : `tool-call:${toolName}:${callId ?? "unknown"}`;
  const metadata: ToolCallMetadataDraft = {
    tool_name: toolName,
    display_name: label,
    content_kind: command ? "command" : "tool_call"
  };
  if (callId) metadata.call_id = callId;
  if (command) metadata.command = command;
  if (typeof parsed?.workdir === "string") metadata.workdir = parsed.workdir;

  return {
    artifactName: label,
    metadata
  };
}

export function describeCustomToolCall({
  toolName,
  callId,
  input
}: { toolName: string; callId: string | undefined; input: unknown }): DescribedToolCall {
  const text = String(input ?? "");
  const patch = toolName === "apply_patch" || text.startsWith("*** Begin Patch")
    ? summarizePatch(text)
    : null;
  const embeddedCommand = extractExecCommand(text);
  const label = patch
    ? `${toolName}: ${patch.summary}`
    : embeddedCommand
      ? `${toolName}: ${truncateMiddle(embeddedCommand.command, 80)}`
      : `${toolName}:${callId ?? "unknown"}`;

  if (patch) {
    const metadata: PatchMetadataDraft = {
      tool_name: toolName,
      display_name: label,
      content_kind: "patch",
      touched_files: patch.files,
      patch_adds: patch.adds,
      patch_updates: patch.updates,
      patch_deletes: patch.deletes,
      patch_file_count: patch.files.length
    };
    if (callId) metadata.call_id = callId;
    return {
      artifactName: label,
      metadata
    };
  }

  const metadata: ToolCallMetadataDraft = {
    tool_name: toolName,
    display_name: label,
    content_kind: embeddedCommand ? "command" : "custom_tool_call"
  };
  if (callId) metadata.call_id = callId;
  if (embeddedCommand) {
    metadata.command = embeddedCommand.command;
    if (embeddedCommand.workdir) metadata.workdir = embeddedCommand.workdir;
  }

  return {
    artifactName: label,
    metadata
  };
}

export function describeToolOutput({
  toolName,
  callId,
  output,
  callMetadata
}: {
  toolName: string;
  callId: string | undefined;
  output: unknown;
  callMetadata: ToolCallMetadataDraft | PatchMetadataDraft | undefined;
}) {
  const text = normalizeToolOutput(output);
  const exitCode = text.match(/(?:Exit code|Process exited with code):?\s*(-?\d+)/i)?.[1];
  const tokenCount = text.match(/Original token count:\s*([0-9,]+)/i)?.[1];
  const command = callMetadata && "command" in callMetadata ? callMetadata.command : undefined;
  const label = command
    ? `${toolName} output: ${truncateMiddle(command, 72)}`
    : `tool:${toolName}:${callId ?? "unknown"}`;
  const metadata: ToolOutputMetadataDraft = {
    tool_name: toolName,
    display_name: label,
    content_kind: "tool_output"
  };
  if (callId) metadata.call_id = callId;
  if (command) metadata.command = command;
  if (callMetadata && "workdir" in callMetadata && callMetadata.workdir) metadata.workdir = callMetadata.workdir;
  if (callMetadata?.display_name) metadata.source_display_name = callMetadata.display_name;
  if (callMetadata?.content_kind) metadata.source_content_kind = callMetadata.content_kind;
  if (callMetadata && "touched_files" in callMetadata) metadata.touched_files = callMetadata.touched_files;
  if (exitCode !== undefined) metadata.exit_code = Number(exitCode);
  if (tokenCount !== undefined) metadata.original_token_count = Number(tokenCount.replaceAll(",", ""));
  const preview = firstContentLine(text);
  if (preview) metadata.output_preview = preview;

  return {
    artifactName: label,
    metadata
  };
}

export function describeCallMetadata(call: CodexProviderItem): DescribedToolCall {
  const toolName = stringValue(call.name) ?? "unknown";
  return call.type === "custom_tool_call"
    ? describeCustomToolCall({ toolName, callId: stringValue(call.call_id), input: call.input })
    : describeFunctionCall({ toolName, callId: stringValue(call.call_id), input: call.arguments });
}

function summarizePatch(text: string): PatchSummary {
  const files: string[] = [];
  let adds = 0;
  let updates = 0;
  let deletes = 0;

  for (const line of text.split("\n")) {
    let match = line.match(/^\*\*\* Add File: (.+)$/);
    if (match?.[1]) {
      adds += 1;
      files.push(match[1]);
      continue;
    }
    match = line.match(/^\*\*\* Update File: (.+)$/);
    if (match?.[1]) {
      updates += 1;
      files.push(match[1]);
      continue;
    }
    match = line.match(/^\*\*\* Delete File: (.+)$/);
    if (match?.[1]) {
      deletes += 1;
      files.push(match[1]);
    }
  }

  const action = adds && !updates && !deletes
    ? "add"
    : updates && !adds && !deletes
      ? "update"
      : deletes && !adds && !updates
        ? "delete"
        : "modify";
  const firstFile = files[0] ?? "patch";
  const suffix = files.length > 1 ? ` (+${files.length - 1} files)` : "";
  return {
    files,
    adds,
    updates,
    deletes,
    summary: `${action} ${truncatePath(firstFile, 56)}${suffix}`
  };
}

function extractExecCommand(text: string): { command: string; workdir?: string } | null {
  const command = extractQuotedField(text, "cmd");
  if (!command) return null;
  const workdir = extractQuotedField(text, "workdir");
  return workdir ? { command, workdir } : { command };
}

function extractQuotedField(text: string, key: string): string | undefined {
  const candidates = [
    findQuotedField(text, `${key}:`),
    findQuotedField(text, `"${key}":`)
  ].filter((candidate): candidate is { index: number; value: string } => Boolean(candidate))
    .sort((a, b) => a.index - b.index);
  return candidates[0]?.value;
}

function findQuotedField(text: string, marker: string): { index: number; value: string } | null {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return null;
  let index = markerIndex + marker.length;
  while (true) {
    const char = text[index];
    if (char === undefined || !/\s/.test(char)) break;
    index += 1;
  }
  const quote = text[index];
  if (quote !== "\"" && quote !== "'") return null;
  index += 1;
  let value = "";
  for (; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\") {
      value += char;
      if (index + 1 < text.length) {
        value += text[index + 1];
        index += 1;
      }
      continue;
    }
    if (char === quote) {
      return {
        index: markerIndex,
        value: unescapeQuoted(value, quote)
      };
    }
    value += char;
  }
  return null;
}

function unescapeQuoted(value: string, quote: string): string {
  if (quote === "\"") return parseJsonValue(`"${value}"`) ?? value;
  return value.replaceAll("\\'", "'").replaceAll("\\\\", "\\");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
