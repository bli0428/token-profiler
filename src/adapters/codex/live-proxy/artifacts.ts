/**
 * Responses API artifact extraction for Codex live proxy requests.
 *
 * This module is the provider-specific boundary for request payload inspection:
 * it turns Codex/Responses request shapes into artifact descriptors that the
 * profiler can persist as canonical records.
 */
type ProviderItem = Record<string, any>;
type ArtifactDescriptor = {
  artifactType: string;
  artifactName: string;
  artifactId: string;
  metadata?: Record<string, any>;
};
type ExtractedArtifact = ArtifactDescriptor & { content: string };

/**
 * Extracts profileable artifacts from a Responses API request payload.
 *
 * @param payload - Parsed provider request payload.
 * @returns Ordered artifacts for instructions, tool definitions, input messages, tool calls, and tool outputs.
 */
export function extractResponsesArtifacts(payload: ProviderItem): ExtractedArtifact[] {
  const artifacts: ExtractedArtifact[] = [];

  addTextValue(artifacts, payload.instructions, {
    artifactType: "SYSTEM_PROMPT",
    artifactName: "instructions",
    artifactId: "SYSTEM_PROMPT:instructions"
  });

  for (const [index, tool] of asArray(payload.tools).entries()) {
    const name = tool?.name ?? tool?.function?.name ?? tool?.type ?? `tool_${index}`;
    artifacts.push({
      artifactType: "SYSTEM_PROMPT",
      artifactName: `tool-definition:${name}`,
      artifactId: `SYSTEM_PROMPT:tool-definition:${name}`,
      content: JSON.stringify(tool)
    });
  }

  const inputs = asArray(payload.input);
  const calls = new Map<string, ProviderItem>();
  for (const item of inputs) {
    if (item?.type === "function_call" && item.call_id) calls.set(item.call_id, item);
    if (item?.type === "custom_tool_call" && item.call_id) calls.set(item.call_id, item);
  }

  for (const [index, item] of inputs.entries()) {
    if (typeof item === "string") {
      addTextValue(artifacts, item, messageDescriptor("user", index, 0));
      continue;
    }
    if (!item || typeof item !== "object") continue;

    if (item.type === "function_call") {
      const toolName = item.name ?? "unknown";
      const toolMetadata = describeFunctionCall({ toolName, callId: item.call_id, input: item.arguments });
      addTextValue(artifacts, { name: toolName, arguments: item.arguments }, {
        artifactType: "SUMMARY",
        artifactName: toolMetadata.artifactName,
        artifactId: `SUMMARY:tool-call:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "function_call_output") {
      const call = calls.get(item.call_id);
      const toolName = call?.name ?? "unknown";
      const callMetadata = call ? describeCallMetadata(call) : undefined;
      const toolMetadata = describeToolOutput({
        toolName,
        callId: item.call_id,
        output: item.output,
        ...(callMetadata ? { callMetadata } : {})
      });
      addTextValue(artifacts, item.output, {
        artifactType: classifyToolOutput(toolName),
        artifactName: toolMetadata.artifactName,
        artifactId: `TOOL_OUTPUT:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "custom_tool_call") {
      const toolName = item.name ?? "custom";
      const toolMetadata = describeCustomToolCall({
        toolName,
        callId: item.call_id,
        input: item.input
      });
      addTextValue(artifacts, item, {
        artifactType: "SUMMARY",
        artifactName: toolMetadata.artifactName,
        artifactId: `SUMMARY:custom-tool-call:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "custom_tool_call_output") {
      const call = calls.get(item.call_id);
      const toolName = call?.name ?? "custom_tool";
      const callMetadata = call ? describeCallMetadata(call) : undefined;
      const toolMetadata = describeToolOutput({
        toolName,
        callId: item.call_id,
        output: item.output,
        ...(callMetadata ? { callMetadata } : {})
      });
      addTextValue(artifacts, item.output, {
        artifactType: "SUMMARY",
        artifactName: toolMetadata.artifactName,
        artifactId: `SUMMARY:custom-tool-call-output:${item.call_id ?? index}`,
        metadata: toolMetadata.metadata
      });
      continue;
    }

    if (item.type === "message" || item.role) {
      const role = item.role ?? "unknown";
      const parts = asArray(item.content);
      for (const [partIndex, part] of parts.entries()) {
        const text = typeof part === "string" ? part : part?.text;
        addTextValue(artifacts, text, messageDescriptor(role, index, partIndex));
      }
      continue;
    }

    addTextValue(artifacts, item, {
      artifactType: "SUMMARY",
      artifactName: `input:${item.type ?? "unknown"}:${index}`,
      artifactId: `SUMMARY:input:${item.type ?? "unknown"}:${index}`
    });
  }

  return artifacts;
}

/**
 * Builds an artifact descriptor for a message content part.
 *
 * @param role - Message role from the provider payload.
 * @param index - Zero-based input item index.
 * @param partIndex - Zero-based message content part index.
 * @returns Artifact descriptor with role-based artifact type, name, and id.
 */
function messageDescriptor(role: string, index: number, partIndex: number): ArtifactDescriptor {
  const artifactType = role === "system" || role === "developer"
    ? "SYSTEM_PROMPT"
    : role === "user"
      ? "USER_MESSAGE"
      : "SUMMARY";

  return {
    artifactType,
    artifactName: `message:${role}:${index}:${partIndex}`,
    artifactId: `${artifactType}:message:${role}:${index}:${partIndex}`
  };
}

/**
 * Classifies tool output into the nearest canonical artifact type.
 *
 * @param toolName - Provider tool name or unknown value.
 * @returns Artifact type string used by the profiler.
 */
function classifyToolOutput(toolName: unknown): string {
  const name = String(toolName).toLowerCase();
  if (name.includes("search")) return "SEARCH_RESULT";
  if (name.includes("exec")) return "TOOL_OUTPUT";
  if (name.includes("test")) return "TEST_OUTPUT";
  return "TOOL_OUTPUT";
}

/**
 * Adds a stringified content artifact when a value is present and non-empty.
 *
 * @param artifacts - Mutable artifact list to append to.
 * @param value - Provider value to stringify as artifact content.
 * @param descriptor - Artifact identity and metadata fields to attach.
 * @returns Nothing.
 */
function addTextValue(artifacts: ExtractedArtifact[], value: unknown, descriptor: ArtifactDescriptor): void {
  if (value === undefined || value === null) return;
  const content = typeof value === "string" ? value : JSON.stringify(value);
  if (content.length > 0) artifacts.push({ ...descriptor, content });
}

/**
 * Describes a standard Responses API function call for artifact metadata.
 *
 * @param toolName - Name of the called tool.
 * @param callId - Provider call id used to link call and output items.
 * @param input - Function arguments, usually a JSON string.
 * @returns Artifact display name and compact metadata for the function call.
 */
function describeFunctionCall({
  toolName,
  callId,
  input
}: { toolName: string; callId?: string; input?: unknown }) {
  const parsed = parseJsonValue(input);
  const command = typeof parsed?.cmd === "string" ? parsed.cmd : undefined;
  const label = command
    ? `${toolName}: ${truncateMiddle(command, 80)}`
    : `tool-call:${toolName}:${callId ?? "unknown"}`;
  return {
    artifactName: label,
    metadata: compactObject({
      tool_name: toolName,
      call_id: callId,
      display_name: label,
      command,
      workdir: typeof parsed?.workdir === "string" ? parsed.workdir : undefined,
      content_kind: command ? "command" : "tool_call"
    })
  };
}

/**
 * Describes a custom tool call for artifact metadata.
 *
 * @param toolName - Name of the custom tool.
 * @param callId - Provider call id used to link call and output items.
 * @param input - Custom tool input text or object.
 * @returns Artifact display name and compact metadata for patches, commands, or generic custom calls.
 */
function describeCustomToolCall({
  toolName,
  callId,
  input
}: { toolName: string; callId?: string; input?: unknown }) {
  const text = String(input ?? "");
  const patch = toolName === "apply_patch" || text.startsWith("*** Begin Patch")
    ? summarizePatch(text)
    : null;
  const embeddedCommand = extractExecCommand(text);
  const contentKind = patch ? "patch" : embeddedCommand ? "command" : "custom_tool_call";
  const label = patch
    ? `${toolName}: ${patch.summary}`
    : embeddedCommand
      ? `${toolName}: ${truncateMiddle(embeddedCommand.command, 80)}`
      : `${toolName}:${callId ?? "unknown"}`;

  return {
    artifactName: label,
    metadata: compactObject({
      tool_name: toolName,
      call_id: callId,
      display_name: label,
      content_kind: contentKind,
      command: embeddedCommand?.command,
      workdir: embeddedCommand?.workdir,
      touched_files: patch?.files,
      patch_adds: patch?.adds,
      patch_updates: patch?.updates,
      patch_deletes: patch?.deletes,
      patch_file_count: patch?.files.length
    })
  };
}

/**
 * Describes a tool output and links it back to call metadata when available.
 *
 * @param toolName - Name of the tool that produced the output.
 * @param callId - Provider call id used to link call and output items.
 * @param output - Provider output value.
 * @param callMetadata - Metadata previously derived from the matching call item.
 * @returns Artifact display name and compact metadata for the tool output.
 */
function describeToolOutput({
  toolName,
  callId,
  output,
  callMetadata
}: { toolName: string; callId?: string; output?: unknown; callMetadata?: Record<string, any> }) {
  const text = normalizeToolOutput(output);
  const exitCode = text.match(/(?:Exit code|Process exited with code):?\s*(-?\d+)/i)?.[1];
  const tokenCount = text.match(/Original token count:\s*([0-9,]+)/i)?.[1];
  const command = callMetadata?.command;
  const label = command
    ? `${toolName} output: ${truncateMiddle(command, 72)}`
    : `tool:${toolName}:${callId ?? "unknown"}`;
  return {
    artifactName: label,
    metadata: compactObject({
      tool_name: toolName,
      call_id: callId,
      display_name: label,
      content_kind: "tool_output",
      command,
      workdir: callMetadata?.workdir,
      source_display_name: callMetadata?.display_name,
      source_content_kind: callMetadata?.content_kind,
      touched_files: callMetadata?.touched_files,
      exit_code: exitCode === undefined ? undefined : Number(exitCode),
      original_token_count: tokenCount === undefined ? undefined : Number(tokenCount.replaceAll(",", "")),
      output_preview: firstContentLine(text)
    })
  };
}

/**
 * Builds metadata for a provider call item.
 *
 * @param call - Function or custom tool call item from the provider payload.
 * @returns Compact metadata derived from the call shape.
 */
function describeCallMetadata(call: ProviderItem) {
  const toolName = call.name ?? "unknown";
  return call.type === "custom_tool_call"
    ? describeCustomToolCall({ toolName, callId: call.call_id, input: call.input }).metadata
    : describeFunctionCall({ toolName, callId: call.call_id, input: call.arguments }).metadata;
}

/**
 * Summarizes an apply-patch style payload.
 *
 * @param text - Patch text to scan for add, update, and delete file markers.
 * @returns File list, operation counts, and a compact display summary.
 */
function summarizePatch(text: string) {
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

/**
 * Extracts an embedded exec command from a custom tool payload.
 *
 * @param text - Custom tool payload text.
 * @returns Command and optional working directory, or `null` when no command field exists.
 */
function extractExecCommand(text: string): { command: string; workdir?: string } | null {
  const command = extractQuotedField(text, "cmd");
  if (!command) return null;
  const workdir = extractQuotedField(text, "workdir");
  return workdir ? { command, workdir } : { command };
}

/**
 * Extracts the earliest quoted value for a named field.
 *
 * @param text - Source text to scan.
 * @param key - Field key to find with either `key:` or JSON-style `"key":` syntax.
 * @returns Unescaped quoted field value, or `undefined` when absent.
 */
function extractQuotedField(text: string, key: string): string | undefined {
  const candidates = [
    findQuotedField(text, `${key}:`),
    findQuotedField(text, `"${key}":`)
  ].filter((candidate): candidate is { index: number; value: string } => Boolean(candidate))
    .sort((a, b) => a.index - b.index);
  return candidates[0]?.value;
}

/**
 * Finds a quoted value after a specific field marker.
 *
 * @param text - Source text to scan.
 * @param marker - Exact marker to locate before the quoted value.
 * @returns Marker index and unescaped value, or `null` when the marker/value is not found.
 */
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

/**
 * Normalizes a provider tool output value into text for inspection and previews.
 *
 * @param output - Output value from a tool result item.
 * @returns String output, concatenated text parts, or JSON for structured values.
 */
function normalizeToolOutput(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    return output.map((part) => part?.text ?? JSON.stringify(part)).join("");
  }
  return JSON.stringify(output ?? "");
}

/**
 * Selects a compact preview line from tool output text.
 *
 * @param text - Tool output text.
 * @returns Truncated first meaningful output line, or `undefined` for empty output.
 */
function firstContentLine(text: string): string | undefined {
  const lines = String(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const outputIndex = lines.findIndex((line) => line === "Output:");
  const candidate = outputIndex >= 0 ? lines.slice(outputIndex + 1).find(Boolean) : lines.at(-1);
  return candidate ? truncateMiddle(candidate, 120) : undefined;
}

/**
 * Parses a JSON string while leaving already-structured values unchanged.
 *
 * @param value - Value to parse when it is a string.
 * @returns Parsed JSON value, original non-string value, or `undefined` when parsing fails.
 */
function parseJsonValue(value: unknown): any {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Removes nullish entries from a metadata object.
 *
 * @param value - Metadata object that may include `undefined` or `null` values.
 * @returns New object containing only defined, non-null entries.
 */
function compactObject(value: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  );
}

/**
 * Unescapes a quoted field value found in free-form text.
 *
 * @param value - Quoted value without surrounding quote characters.
 * @param quote - Quote character that surrounded the value.
 * @returns Unescaped field value.
 */
function unescapeQuoted(value: string, quote: string): string {
  if (quote === "\"") return parseJsonValue(`"${value}"`) ?? value;
  return value.replaceAll("\\'", "'").replaceAll("\\\\", "\\");
}

/**
 * Shortens long display text while preserving the beginning and end.
 *
 * @param value - Value to stringify and truncate.
 * @param width - Maximum returned string length.
 * @returns Original text when it fits, otherwise middle-truncated text.
 */
function truncateMiddle(value: unknown, width: number): string {
  const text = String(value);
  if (text.length <= width) return text;
  const head = Math.max(1, Math.floor((width - 3) * 0.65));
  const tail = Math.max(1, width - 3 - head);
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

/**
 * Shortens a path-like value while keeping the basename visible when possible.
 *
 * @param value - Path-like value to stringify and truncate.
 * @param width - Maximum returned string length.
 * @returns Original path when it fits, otherwise a compact path summary.
 */
function truncatePath(value: unknown, width: number): string {
  const text = String(value);
  if (text.length <= width) return text;
  const parts = text.split(/[\\/]/);
  if (parts.length <= 1) return truncateMiddle(text, width);
  const basename = parts.at(-1) ?? "";
  const dirname = parts.slice(0, -1).join("/");
  const remaining = width - basename.length - 4;
  return remaining > 4
    ? `${truncateMiddle(dirname, remaining)}/.../${basename}`
    : truncateMiddle(text, width);
}

/**
 * Wraps a value as an array for uniform payload traversal.
 *
 * @param value - Candidate scalar, array, or nullish value.
 * @returns The original array, a single-value array, or an empty array for nullish input.
 */
function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}
