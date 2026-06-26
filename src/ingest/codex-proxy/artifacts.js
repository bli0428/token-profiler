export function extractResponsesArtifacts(payload) {
  const artifacts = [];

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
  const calls = new Map();
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
      const toolMetadata = describeToolOutput({
        toolName,
        callId: item.call_id,
        output: item.output,
        callMetadata: call ? describeCallMetadata(call) : undefined
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
      const toolMetadata = describeToolOutput({
        toolName,
        callId: item.call_id,
        output: item.output,
        callMetadata: call ? describeCallMetadata(call) : undefined
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

function buildUpstreamUrl(upstream, incomingPath) {
  const target = new URL(upstream);
  const incoming = new URL(incomingPath, "http://localhost");
  const basePath = target.pathname.replace(/\/$/, "");
  target.pathname = basePath && incoming.pathname.startsWith(`${basePath}/`)
    ? incoming.pathname
    : `${basePath}${incoming.pathname.startsWith("/") ? "" : "/"}${incoming.pathname}`;
  target.search = incoming.search;
  return target;
}

function messageDescriptor(role, index, partIndex) {
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

function classifyToolOutput(toolName) {
  const name = String(toolName).toLowerCase();
  if (name.includes("search")) return "SEARCH_RESULT";
  if (name.includes("exec")) return "TOOL_OUTPUT";
  if (name.includes("test")) return "TEST_OUTPUT";
  return "TOOL_OUTPUT";
}

function addTextValue(artifacts, value, descriptor) {
  if (value === undefined || value === null) return;
  const content = typeof value === "string" ? value : JSON.stringify(value);
  if (content.length > 0) artifacts.push({ ...descriptor, content });
}

function describeFunctionCall({ toolName, callId, input }) {
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

function describeCustomToolCall({ toolName, callId, input }) {
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

function describeToolOutput({ toolName, callId, output, callMetadata }) {
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

function describeCallMetadata(call) {
  const toolName = call.name ?? "unknown";
  return call.type === "custom_tool_call"
    ? describeCustomToolCall({ toolName, callId: call.call_id, input: call.input }).metadata
    : describeFunctionCall({ toolName, callId: call.call_id, input: call.arguments }).metadata;
}

function summarizePatch(text) {
  const files = [];
  let adds = 0;
  let updates = 0;
  let deletes = 0;

  for (const line of text.split("\n")) {
    let match = line.match(/^\*\*\* Add File: (.+)$/);
    if (match) {
      adds += 1;
      files.push(match[1]);
      continue;
    }
    match = line.match(/^\*\*\* Update File: (.+)$/);
    if (match) {
      updates += 1;
      files.push(match[1]);
      continue;
    }
    match = line.match(/^\*\*\* Delete File: (.+)$/);
    if (match) {
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

function extractExecCommand(text) {
  const command = extractQuotedField(text, "cmd");
  if (!command) return null;
  const workdir = extractQuotedField(text, "workdir");
  return {
    command,
    workdir
  };
}

function extractQuotedField(text, key) {
  const candidates = [
    findQuotedField(text, `${key}:`),
    findQuotedField(text, `"${key}":`)
  ].filter(Boolean).sort((a, b) => a.index - b.index);
  return candidates[0]?.value;
}

function findQuotedField(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return null;
  let index = markerIndex + marker.length;
  while (/\s/.test(text[index])) index += 1;
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

function normalizeToolOutput(output) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    return output.map((part) => part?.text ?? JSON.stringify(part)).join("");
  }
  return JSON.stringify(output ?? "");
}

function firstContentLine(text) {
  const lines = String(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const outputIndex = lines.findIndex((line) => line === "Output:");
  const candidate = outputIndex >= 0 ? lines.slice(outputIndex + 1).find(Boolean) : lines.at(-1);
  return candidate ? truncateMiddle(candidate, 120) : undefined;
}

function parseJsonValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  );
}

function unescapeQuoted(value, quote) {
  if (quote === "\"") return parseJsonValue(`"${value}"`) ?? value;
  return value.replaceAll("\\'", "'").replaceAll("\\\\", "\\");
}

function truncateMiddle(value, width) {
  const text = String(value);
  if (text.length <= width) return text;
  const head = Math.max(1, Math.floor((width - 3) * 0.65));
  const tail = Math.max(1, width - 3 - head);
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function truncatePath(value, width) {
  const text = String(value);
  if (text.length <= width) return text;
  const parts = text.split(/[\\/]/);
  if (parts.length <= 1) return truncateMiddle(text, width);
  const basename = parts.at(-1);
  const dirname = parts.slice(0, -1).join("/");
  const remaining = width - basename.length - 4;
  return remaining > 4
    ? `${truncateMiddle(dirname, remaining)}/.../${basename}`
    : truncateMiddle(text, width);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

