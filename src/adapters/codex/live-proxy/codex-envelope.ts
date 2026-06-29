/**
 * Codex request-envelope parsing for live proxy routing.
 *
 * The Codex adapter owns these provider-facing request details. Downstream
 * canonical records should receive only explicit, privacy-safe mapped fields.
 */
import { z } from "zod";

export type CodexTurnMetadata = z.infer<typeof CodexTurnMetadataSchema>;
export type CodexClientMetadata = z.infer<typeof CodexClientMetadataSchema>;
export type CodexRequestHeaders = z.infer<typeof CodexRequestHeadersSchema>;
export type CodexResponsesApiRequest = z.infer<typeof CodexResponsesApiRequestSchema>;
export type CodexRequestShape = z.infer<typeof CodexRequestShapeSchema>;

export type CodexRequestTurnIdentity = {
  turnId?: string | undefined;
  turnIdentitySource: "direct_turn_id" | "missing" | "malformed";
  turnStartedAt?: string | undefined;
  caveats: Array<{
    code: string;
    severity: "info" | "warning";
    message: string;
  }>;
};

export type CodexCompatibilityHeaders = {
  installationId?: string | undefined;
  sessionId?: string | undefined;
  threadId?: string | undefined;
  windowId?: string | undefined;
  parentThreadId?: string | undefined;
  subagent?: string | undefined;
  clientRequestId?: string | undefined;
};

export type CodexTransportHeaders = {
  betaFeatures: string[];
  originator?: string | undefined;
  userAgent?: string | undefined;
  accountHeaderPresent: boolean;
  attestationPresent: boolean;
};

export type CodexRequestBodySummary = {
  model?: string | undefined;
  toolChoice?: string | undefined;
  parallelToolCalls?: boolean | undefined;
  reasoningEffort?: string | undefined;
  store?: boolean | undefined;
  stream?: boolean | undefined;
  include: string[];
  serviceTier?: string | undefined;
  promptCacheKey?: string | undefined;
  textVerbosity?: string | undefined;
  hasInstructions: boolean;
  inputItemCount?: number | undefined;
  inputItemTypes: string[];
  toolCount?: number | undefined;
  toolNames: string[];
  observedBodyKeys: string[];
  unknownBodyKeys: string[];
};

export type CodexRequestEnvelope = {
  body: CodexRequestBodySummary;
  turnMetadata: {
    clientMetadata?: CodexTurnMetadata | undefined;
    header?: CodexTurnMetadata | undefined;
  };
  turnIdentity: CodexRequestTurnIdentity;
  compatibility: {
    clientMetadata: CodexCompatibilityHeaders;
    headers: CodexCompatibilityHeaders;
  };
  transportHeaders: CodexTransportHeaders;
  observedHeaderKeys: string[];
  observedClientMetadataKeys: string[];
  unknownCodexHeaderKeys: string[];
  unknownCodexClientMetadataKeys: string[];
};

// Adapter-local parse state for the JSON string Codex sends in turn metadata fields.
type CodexTurnMetadataParseResult =
  | { status: "absent" }
  | { status: "malformed" }
  | { status: "parsed"; metadata: CodexTurnMetadata };

const KNOWN_CODEX_HEADERS = new Set([
  "x-codex-beta-features",
  "x-codex-installation-id",
  "x-codex-parent-thread-id",
  "x-codex-turn-metadata",
  "x-codex-turn-state",
  "x-codex-window-id"
]);

const KNOWN_CODEX_RESPONSES_BODY_KEYS = new Set([
  "client_metadata",
  "include",
  "input",
  "instructions",
  "model",
  "parallel_tool_calls",
  "previous_response_id",
  "prompt_cache_key",
  "reasoning",
  "service_tier",
  "store",
  "stream",
  "text",
  "tool_choice",
  "tools"
]);

const KNOWN_CODEX_INPUT_ITEM_TYPES = new Set([
  "custom_tool_call",
  "custom_tool_call_output",
  "function_call",
  "function_call_output",
  "message"
]);

export const CodexTurnMetadataSchema = z.object({
  installation_id: z.string().optional(),
  session_id: z.string().optional(),
  thread_id: z.string().optional(),
  turn_id: z.string().optional(),
  window_id: z.string().optional(),
  request_kind: z.string().optional(),
  forked_from_thread_id: z.string().optional(),
  parent_thread_id: z.string().optional(),
  subagent_kind: z.string().optional(),
  thread_source: z.string().optional(),
  sandbox: z.string().optional(),
  workspaces: z.record(z.string(), z.unknown()).optional(),
  turn_started_at_unix_ms: z.number().finite().optional(),
  compaction: z.unknown().optional()
}).passthrough().transform(({
  installation_id,
  session_id,
  thread_id,
  turn_id,
  window_id,
  request_kind,
  forked_from_thread_id,
  parent_thread_id,
  subagent_kind,
  thread_source,
  sandbox,
  workspaces,
  turn_started_at_unix_ms,
  compaction,
  ...extra
}) => ({
  installation_id,
  session_id,
  thread_id,
  turn_id,
  window_id,
  request_kind,
  forked_from_thread_id,
  parent_thread_id,
  subagent_kind,
  thread_source,
  sandbox,
  workspaces,
  turn_started_at_unix_ms,
  compaction,
  extra
}));

export const CodexClientMetadataSchema = z.object({
  "x-codex-turn-metadata": z.string().optional(),
  "x-codex-installation-id": z.string().optional(),
  session_id: z.string().optional(),
  thread_id: z.string().optional(),
  turn_id: z.string().optional(),
  "x-codex-window-id": z.string().optional(),
  "x-codex-parent-thread-id": z.string().optional(),
  "x-openai-subagent": z.string().optional()
}).catchall(z.string());

export const CodexRequestHeadersSchema = z.object({
  "x-codex-turn-metadata": z.string().optional(),
  "x-codex-installation-id": z.string().optional(),
  "x-codex-window-id": z.string().optional(),
  "x-codex-parent-thread-id": z.string().optional(),
  "x-openai-subagent": z.string().optional(),
  "x-codex-beta-features": z.string().optional(),
  "x-client-request-id": z.string().optional(),
  "session-id": z.string().optional(),
  "thread-id": z.string().optional(),
  "originator": z.string().optional(),
  "user-agent": z.string().optional(),
  "chatgpt-account-id": z.string().optional(),
  "x-oai-attestation": z.string().optional()
}).catchall(z.string());

export const CodexReasoningSchema = z.object({
  effort: z.string().optional(),
  summary: z.string().optional(),
  context: z.enum(["auto", "current_turn", "all_turns"]).optional()
}).strict();

export const CodexTextFormatSchema = z.object({
  type: z.literal("json_schema").optional(),
  strict: z.boolean().optional(),
  schema: z.unknown().optional(),
  name: z.string().optional()
}).strict();

export const CodexTextControlsSchema = z.object({
  verbosity: z.string().optional(),
  format: CodexTextFormatSchema.optional()
}).strict();

export const CodexContentPartSchema = z.union([
  z.string(),
  z.object({
    type: z.string().optional(),
    text: z.string().optional()
  }).passthrough()
]);

export const CodexMessageInputItemSchema = z.object({
  type: z.literal("message").optional(),
  role: z.string().optional(),
  content: z.union([
    z.string(),
    z.array(CodexContentPartSchema)
  ]).optional()
}).passthrough();

export const CodexFunctionCallInputItemSchema = z.object({
  type: z.literal("function_call"),
  name: z.string().optional(),
  call_id: z.string().optional(),
  arguments: z.union([z.string(), z.record(z.string(), z.unknown())]).optional()
}).passthrough();

export const CodexFunctionCallOutputInputItemSchema = z.object({
  type: z.literal("function_call_output"),
  call_id: z.string().optional(),
  output: z.unknown().optional()
}).passthrough();

export const CodexCustomToolCallInputItemSchema = z.object({
  type: z.literal("custom_tool_call"),
  name: z.string().optional(),
  call_id: z.string().optional(),
  input: z.unknown().optional()
}).passthrough();

export const CodexCustomToolCallOutputInputItemSchema = z.object({
  type: z.literal("custom_tool_call_output"),
  call_id: z.string().optional(),
  output: z.unknown().optional()
}).passthrough();

export const CodexUnknownInputItemSchema = z.record(z.string(), z.unknown()).superRefine((item, context) => {
  if (typeof item.type === "string" && KNOWN_CODEX_INPUT_ITEM_TYPES.has(item.type)) {
    context.addIssue({
      code: "custom",
      message: `known Codex input item type did not match its schema: ${item.type}`,
      path: ["type"]
    });
  }
});

export const CodexInputItemSchema = z.union([
  z.string(),
  CodexFunctionCallInputItemSchema,
  CodexFunctionCallOutputInputItemSchema,
  CodexCustomToolCallInputItemSchema,
  CodexCustomToolCallOutputInputItemSchema,
  CodexMessageInputItemSchema,
  CodexUnknownInputItemSchema
]);

export const CodexToolDefinitionSchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  function: z.object({
    name: z.string().optional()
  }).passthrough().optional()
}).passthrough();

export const CodexResponsesApiRequestSchema = z.object({
  model: z.string().optional(),
  instructions: z.string().optional(),
  input: z.array(CodexInputItemSchema).optional(),
  tools: z.array(CodexToolDefinitionSchema).optional(),
  tool_choice: z.string().optional(),
  parallel_tool_calls: z.boolean().optional(),
  reasoning: CodexReasoningSchema.optional(),
  store: z.boolean().optional(),
  stream: z.boolean().optional(),
  include: z.array(z.string()).optional(),
  service_tier: z.string().optional(),
  prompt_cache_key: z.string().optional(),
  text: CodexTextControlsSchema.optional(),
  previous_response_id: z.string().optional(),
  client_metadata: CodexClientMetadataSchema.optional()
}).passthrough();

export const CodexRequestShapeSchema = z.object({
  headers: CodexRequestHeadersSchema,
  body: CodexResponsesApiRequestSchema
}).strict();

export function parseCodexRequestEnvelope({
  headers = {},
  payload = {}
}: {
  headers?: Record<string, unknown>;
  payload?: Record<string, any>;
}): CodexRequestEnvelope {
  return normalizeCodexRequestShape(toCodexRequestShape({ headers, payload }));
}

export function toCodexRequestShape({
  headers = {},
  payload = {}
}: {
  headers?: Record<string, unknown>;
  payload?: Record<string, any>;
}): CodexRequestShape {
  return CodexRequestShapeSchema.parse({
    headers: normalizeHeaders(headers),
    body: objectValue(payload) ?? {}
  });
}

export function normalizeCodexRequestShape(request: CodexRequestShape): CodexRequestEnvelope {
  const clientMetadata = request.body.client_metadata;
  const clientMetadataTurn = parseCodexTurnMetadataField(clientMetadata?.["x-codex-turn-metadata"]);
  const headerTurn = parseCodexTurnMetadataField(request.headers["x-codex-turn-metadata"]);

  return {
    body: {
      model: request.body.model,
      toolChoice: request.body.tool_choice,
      parallelToolCalls: request.body.parallel_tool_calls,
      reasoningEffort: request.body.reasoning?.effort,
      store: request.body.store,
      stream: request.body.stream,
      include: request.body.include ?? [],
      serviceTier: request.body.service_tier,
      promptCacheKey: request.body.prompt_cache_key,
      textVerbosity: request.body.text?.verbosity,
      hasInstructions: typeof request.body.instructions === "string" && request.body.instructions.length > 0,
      inputItemCount: request.body.input?.length,
      inputItemTypes: request.body.input?.map(inputItemType) ?? [],
      toolCount: request.body.tools?.length,
      toolNames: request.body.tools?.map(toolName).filter((name): name is string => Boolean(name)) ?? [],
      observedBodyKeys: Object.keys(request.body).sort(),
      unknownBodyKeys: Object.keys(request.body)
        .filter((key) => !KNOWN_CODEX_RESPONSES_BODY_KEYS.has(key))
        .sort()
    },
    turnMetadata: {
      ...(clientMetadataTurn.status === "parsed" ? { clientMetadata: clientMetadataTurn.metadata } : {}),
      ...(headerTurn.status === "parsed" ? { header: headerTurn.metadata } : {})
    },
    turnIdentity: resolveTurnIdentity({ clientMetadata, clientMetadataTurn, headerTurn }),
    compatibility: {
      clientMetadata: {
        installationId: clientMetadata?.["x-codex-installation-id"],
        sessionId: clientMetadata?.session_id,
        threadId: clientMetadata?.thread_id,
        windowId: clientMetadata?.["x-codex-window-id"],
        parentThreadId: clientMetadata?.["x-codex-parent-thread-id"],
        subagent: clientMetadata?.["x-openai-subagent"]
      },
      headers: {
        installationId: request.headers["x-codex-installation-id"],
        sessionId: request.headers["session-id"],
        threadId: request.headers["thread-id"],
        windowId: request.headers["x-codex-window-id"],
        parentThreadId: request.headers["x-codex-parent-thread-id"],
        subagent: request.headers["x-openai-subagent"],
        clientRequestId: request.headers["x-client-request-id"]
      }
    },
    transportHeaders: {
      betaFeatures: betaFeatures(request.headers["x-codex-beta-features"]),
      originator: request.headers.originator,
      userAgent: request.headers["user-agent"],
      accountHeaderPresent: request.headers["chatgpt-account-id"] !== undefined,
      attestationPresent: request.headers["x-oai-attestation"] !== undefined
    },
    observedHeaderKeys: Object.keys(request.headers).sort(),
    observedClientMetadataKeys: clientMetadata ? Object.keys(clientMetadata).sort() : [],
    unknownCodexHeaderKeys: Object.keys(request.headers)
      .filter((key) => key.startsWith("x-codex-") && !KNOWN_CODEX_HEADERS.has(key))
      .sort(),
    unknownCodexClientMetadataKeys: clientMetadata
      ? Object.keys(clientMetadata)
        .filter((key) => key.startsWith("x-codex-") && !KNOWN_CODEX_HEADERS.has(key))
        .sort()
      : []
  };
}

export function codexSessionRoute(envelope: CodexRequestEnvelope): { sessionId: string; source: string } | undefined {
  const clientMetadataTurn = envelope.turnMetadata.clientMetadata;
  if (clientMetadataTurn?.session_id) return { sessionId: `codex-${clientMetadataTurn.session_id}`, source: "codex_turn_metadata" };
  if (clientMetadataTurn?.thread_id) return { sessionId: `codex-${clientMetadataTurn.thread_id}`, source: "codex_turn_metadata_thread" };

  const headerTurn = envelope.turnMetadata.header;
  if (headerTurn?.session_id) return { sessionId: `codex-${headerTurn.session_id}`, source: "codex_turn_metadata_header" };
  if (headerTurn?.thread_id) return { sessionId: `codex-${headerTurn.thread_id}`, source: "codex_turn_metadata_header_thread" };

  const clientMetadataCompatibility = envelope.compatibility.clientMetadata;
  if (clientMetadataCompatibility.sessionId) return { sessionId: `codex-${clientMetadataCompatibility.sessionId}`, source: "codex_client_metadata_session" };
  if (clientMetadataCompatibility.threadId) return { sessionId: `codex-${clientMetadataCompatibility.threadId}`, source: "codex_client_metadata_thread" };

  const headerCompatibility = envelope.compatibility.headers;
  if (headerCompatibility.sessionId) return { sessionId: `codex-${headerCompatibility.sessionId}`, source: "codex_session_header" };
  if (headerCompatibility.threadId) return { sessionId: `codex-${headerCompatibility.threadId}`, source: "codex_thread_header" };

  const windowThreadId = windowThreadIdValue(
    clientMetadataTurn?.window_id
      ?? headerTurn?.window_id
      ?? clientMetadataCompatibility.windowId
      ?? headerCompatibility.windowId
  );
  if (windowThreadId) return { sessionId: `codex-${windowThreadId}`, source: "codex_window_id" };

  return undefined;
}

function normalizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const string = headerValue(value);
    if (string !== undefined) normalized[key.toLowerCase()] = string;
  }
  return normalized;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function headerValue(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return stringValue(candidate);
}

function parseCodexTurnMetadataField(value: string | undefined): CodexTurnMetadataParseResult {
  if (!value) return { status: "absent" };

  try {
    const parsed = JSON.parse(value);
    const result = CodexTurnMetadataSchema.safeParse(parsed);
    return result.success
      ? { status: "parsed", metadata: result.data }
      : { status: "malformed" };
  } catch {
    return { status: "malformed" };
  }
}

function resolveTurnIdentity({
  clientMetadata,
  clientMetadataTurn,
  headerTurn
}: {
  clientMetadata?: CodexClientMetadata | undefined;
  clientMetadataTurn: CodexTurnMetadataParseResult;
  headerTurn: CodexTurnMetadataParseResult;
}): CodexRequestTurnIdentity {
  if (clientMetadataTurn.status === "malformed") {
    return malformedTurnIdentity("Codex client_metadata turn metadata could not be parsed.");
  }
  const clientTurnMetadata = clientMetadataTurn.status === "parsed" ? clientMetadataTurn.metadata : undefined;
  const clientTurnId = nonEmptyString(clientTurnMetadata?.turn_id);
  if (clientTurnId) {
    return {
      turnId: clientTurnId,
      turnIdentitySource: "direct_turn_id",
      turnStartedAt: unixMsToIso(clientTurnMetadata?.turn_started_at_unix_ms),
      caveats: []
    };
  }

  if (headerTurn.status === "malformed") {
    return malformedTurnIdentity("Codex header turn metadata could not be parsed.");
  }
  const headerTurnMetadata = headerTurn.status === "parsed" ? headerTurn.metadata : undefined;
  const headerTurnId = nonEmptyString(headerTurnMetadata?.turn_id);
  if (headerTurnId) {
    return {
      turnId: headerTurnId,
      turnIdentitySource: "direct_turn_id",
      turnStartedAt: unixMsToIso(headerTurnMetadata?.turn_started_at_unix_ms),
      caveats: []
    };
  }

  const directClientTurnId = nonEmptyString(clientMetadata?.turn_id);
  if (directClientTurnId) {
    return {
      turnId: directClientTurnId,
      turnIdentitySource: "direct_turn_id",
      caveats: []
    };
  }

  return {
    turnIdentitySource: "missing",
    caveats: [{
      code: "turn_identity_missing",
      severity: "info",
      message: "Codex request metadata did not include a direct turn identity."
    }]
  };
}

function malformedTurnIdentity(message: string): CodexRequestTurnIdentity {
  return {
    turnIdentitySource: "malformed",
    caveats: [{
      code: "turn_identity_malformed",
      severity: "warning",
      message
    }]
  };
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function unixMsToIso(value: unknown): string | undefined {
  if (!Number.isFinite(value)) return undefined;
  const date = new Date(value as number);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function betaFeatures(value: string | undefined): string[] {
  return value
    ? value.split(",").map((feature) => feature.trim()).filter(Boolean)
    : [];
}

function inputItemType(item: z.infer<typeof CodexInputItemSchema>): string {
  if (typeof item === "string") return "string";
  if (typeof item.type === "string" && item.type.length > 0) return item.type;
  if (typeof item.role === "string" && item.role.length > 0) return "message";
  return "unknown";
}

function toolName(tool: z.infer<typeof CodexToolDefinitionSchema>): string | undefined {
  return tool.name ?? tool.function?.name ?? tool.type;
}

function windowThreadIdValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.split(":")[0] || undefined;
}
