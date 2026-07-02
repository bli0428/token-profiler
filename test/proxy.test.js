import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import test from "node:test";
import { disableCodexProxyConfig, enableCodexProxyConfig } from "../src/adapters/codex/live-proxy/config.ts";
import { buildUpstreamUrl, createProfilerProxy, extractResponsesArtifacts } from "../src/adapters/codex/live-proxy/index.ts";
import { SessionRouter } from "../src/adapters/codex/live-proxy/session-router.ts";
import { TokenProfiler } from "../src/core/capture/index.ts";

test("extracts instructions, tool definitions, messages, and tool output", () => {
  const artifacts = extractResponsesArtifacts({
    model: "gpt-test",
    instructions: "You are helpful.",
    tools: [{ type: "function", name: "search_docs", parameters: { type: "object" } }],
    input: [
      { type: "message", role: "user", content: [{ type: "input_text", text: "Find it" }] },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "I will search the docs." }] },
      { type: "function_call", name: "search_docs", call_id: "call_1", arguments: "{}" },
      { type: "function_call_output", call_id: "call_1", output: "Search result" }
    ]
  });

  assert.deepEqual(artifacts.map((artifact) => artifact.artifactType), [
    "SYSTEM_PROMPT",
    "SYSTEM_PROMPT",
    "USER_MESSAGE",
    "SUMMARY",
    "SUMMARY",
    "SEARCH_RESULT"
  ]);
  assert.equal(artifacts[2].metadata.content_kind, "user_message");
  assert.equal(artifacts[2].metadata.source_protocol, "openai_responses");
  assert.equal(artifacts[2].metadata.source_protocol_type, "message");
  assert.equal(artifacts[2].metadata.source_item_index, 0);
  assert.equal(artifacts[2].metadata.source_role, "user");
  assert.equal(artifacts[2].metadata.role, "user");
  assert.equal(artifacts[2].metadata.message_source, "current_turn");
  assert.equal(artifacts[2].metadata.title_candidate, true);
  assert.equal(artifacts[3].metadata.content_kind, "assistant_message");
  assert.equal(artifacts[3].metadata.source_protocol_type, "message");
  assert.equal(artifacts[3].metadata.source_item_index, 1);
  assert.equal(artifacts[3].metadata.source_role, "assistant");
  assert.equal(artifacts[3].metadata.role, "assistant");
  assert.equal(artifacts[3].metadata.message_source, "current_turn");
  assert.equal(artifacts[3].metadata.title_candidate, true);
  assert.equal(artifacts[4].metadata.source_protocol_type, "function_call");
  assert.equal(artifacts[4].metadata.source_item_index, 2);
  assert.equal(artifacts[4].metadata.source_tool_name, "search_docs");
  assert.equal(artifacts[5].metadata.source_protocol_type, "function_call_output");
  assert.equal(artifacts[5].metadata.source_item_index, 3);
  assert.equal(artifacts[5].metadata.source_tool_name, "search_docs");
  assert.equal(artifacts[5].artifactName, "tool:search_docs:call_1");
  assert.equal(artifacts[5].metadata.tool_name, "search_docs");
});

test("extracts system and tool definition source provenance", () => {
  const artifacts = extractResponsesArtifacts({
    instructions: "Follow the project conventions.",
    tools: [{ type: "function", name: "exec_command", parameters: { type: "object" } }],
    input: []
  });

  assert.equal(artifacts[0].metadata.content_kind, "system_prompt");
  assert.equal(artifacts[0].metadata.source_protocol, "openai_responses");
  assert.equal(artifacts[0].metadata.source_protocol_type, "instructions");
  assert.equal(artifacts[0].metadata.role, "system");
  assert.equal(artifacts[1].metadata.content_kind, "tool_definition");
  assert.equal(artifacts[1].metadata.source_protocol, "openai_responses");
  assert.equal(artifacts[1].metadata.source_protocol_type, "tool_definition");
  assert.equal(artifacts[1].metadata.source_item_index, 0);
  assert.equal(artifacts[1].metadata.source_tool_name, "exec_command");
});

test("tool output inherits command metadata from its paired function call", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "function_call",
        name: "exec_command",
        call_id: "call_exec_output",
        arguments: JSON.stringify({
          cmd: "npm test",
          workdir: "/repo"
        })
      },
      {
        type: "function_call_output",
        call_id: "call_exec_output",
        output: "Chunk ID: test\nProcess exited with code 0\nOutput:\nall good"
      }
    ]
  });

  assert.equal(artifacts[1].artifactName, "exec_command output: npm test");
  assert.equal(artifacts[1].metadata.command, "npm test");
  assert.equal(artifacts[1].metadata.workdir, "/repo");
  assert.equal(artifacts[1].metadata.exit_code, 0);
  assert.equal(artifacts[1].metadata.output_preview, "all good");
});

test("custom tool output inherits metadata from its paired custom call", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "custom_tool_call",
        name: "exec",
        call_id: "call_custom_exec_output",
        input: "const r = await tools.exec_command({cmd: \"rg RuntimeAction\", workdir: \"/repo\"});"
      },
      {
        type: "custom_tool_call_output",
        call_id: "call_custom_exec_output",
        output: "Exit code: 0\nOutput:\nai_conversation_engine/runtime/actions.py"
      }
    ]
  });

  assert.equal(artifacts[1].artifactName, "exec output: rg RuntimeAction");
  assert.equal(artifacts[1].metadata.command, "rg RuntimeAction");
  assert.equal(artifacts[1].metadata.workdir, "/repo");
  assert.equal(artifacts[1].metadata.output_preview, "ai_conversation_engine/runtime/actions.py");
});

test("extracts readable metadata for custom apply_patch calls", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "custom_tool_call",
        name: "apply_patch",
        call_id: "call_patch",
        input: [
          "*** Begin Patch",
          "*** Add File: tests/example.test.js",
          "+test('works', () => {});",
          "*** Update File: src/example.js",
          "@@",
          "+export const ok = true;",
          "*** End Patch"
        ].join("\n")
      },
      {
        type: "custom_tool_call_output",
        call_id: "call_patch",
        output: "Exit code: 0\nWall time: 0.1 seconds\nOutput:\nSuccess."
      }
    ]
  });

  assert.equal(artifacts[0].artifactName, "apply_patch: modify tests/example.test.js (+1 files)");
  assert.equal(artifacts[0].metadata.content_kind, "patch");
  assert.equal(artifacts[0].metadata.source_protocol_type, "custom_tool_call");
  assert.equal(artifacts[0].metadata.source_tool_name, "apply_patch");
  assert.deepEqual(artifacts[0].metadata.touched_files, [
    "tests/example.test.js",
    "src/example.js"
  ]);
  assert.equal(artifacts[0].metadata.patch_adds, 1);
  assert.equal(artifacts[0].metadata.patch_updates, 1);
  assert.equal(artifacts[1].metadata.exit_code, 0);
});

test("extracts readable metadata for embedded exec custom calls", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "custom_tool_call",
        name: "exec",
        call_id: "call_exec",
        input: "const r = await tools.exec_command({cmd: \"node -e \\\"console.log('ok')\\\"\", workdir: \"/repo\"});"
      }
    ]
  });

  assert.equal(artifacts[0].metadata.content_kind, "command");
  assert.equal(artifacts[0].metadata.command, "node -e \"console.log('ok')\"");
  assert.equal(artifacts[0].metadata.workdir, "/repo");
  assert.match(artifacts[0].artifactName, /exec: node -e/);
});

test("extracts unsupported input items as explicit unknown artifacts", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "future_input",
        text: "shape we do not understand yet"
      }
    ]
  });

  assert.equal(artifacts[0].kind, "unknown_input");
  assert.equal(artifacts[0].metadata.content_kind, "unknown_input");
  assert.equal(artifacts[0].metadata.source_protocol_type, "unknown");
  assert.equal(artifacts[0].metadata.provider_type, "future_input");
  assert.deepEqual(artifacts[0].metadata.observed_keys, ["text", "type"]);
});

test("extracts reasoning input items as opaque reasoning state artifacts", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "reasoning",
        summary: [],
        encrypted_content: "opaque-state"
      }
    ]
  });

  assert.equal(artifacts[0].kind, "reasoning_state");
  assert.equal(artifacts[0].artifactName, "Reasoning state");
  assert.equal(artifacts[0].metadata.content_kind, "reasoning_state");
  assert.equal(artifacts[0].metadata.source_protocol_type, "reasoning");
  assert.equal(artifacts[0].metadata.provider_type, "reasoning");
  assert.equal(artifacts[0].metadata.reason, "opaque_reasoning_state");
  assert.deepEqual(artifacts[0].metadata.observed_keys, ["encrypted_content", "summary", "type"]);
});

test("extracts newer Codex protocol tool calls and outputs explicitly", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "local_shell_call",
        call_id: "call_shell",
        action: {
          cmd: "npm run lint",
          workdir: "/repo"
        }
      },
      {
        type: "function_call_output",
        call_id: "call_shell",
        output: "Process exited with code 0\nOutput:\nlint ok"
      },
      {
        type: "mcp_tool_call_output",
        call_id: "call_mcp",
        output: "MCP result"
      },
      {
        type: "tool_search_output",
        call_id: "call_search",
        results: [{ title: "Search hit" }]
      }
    ]
  });

  assert.equal(artifacts[0].kind, "tool_call");
  assert.equal(artifacts[0].metadata.source_protocol_type, "local_shell_call");
  assert.equal(artifacts[0].metadata.source_tool_name, "local_shell");
  assert.equal(artifacts[0].metadata.command, "npm run lint");
  assert.equal(artifacts[1].kind, "tool_output");
  assert.equal(artifacts[1].metadata.source_protocol_type, "function_call_output");
  assert.equal(artifacts[1].metadata.source_tool_name, "local_shell");
  assert.equal(artifacts[1].metadata.command, "npm run lint");
  assert.equal(artifacts[1].metadata.output_preview, "lint ok");
  assert.equal(artifacts[2].kind, "tool_output");
  assert.equal(artifacts[2].metadata.source_protocol_type, "mcp_tool_call_output");
  assert.equal(artifacts[2].metadata.source_tool_name, "mcp_tool");
  assert.equal(artifacts[3].kind, "tool_output");
  assert.equal(artifacts[3].artifactType, "SEARCH_RESULT");
  assert.equal(artifacts[3].metadata.source_protocol_type, "tool_search_output");
  assert.equal(artifacts[3].metadata.source_tool_name, "tool_search");
});

test("extracts agent messages and protocol control items with explicit provenance", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "agent_message",
        content: [{ type: "output_text", text: "I checked the repo." }]
      },
      {
        type: "compaction",
        summary: "Compacted conversation state"
      },
      {
        type: "additional_tools",
        tools: [{ name: "extra_tool" }]
      }
    ]
  });

  assert.equal(artifacts[0].kind, "message");
  assert.equal(artifacts[0].metadata.content_kind, "assistant_message");
  assert.equal(artifacts[0].metadata.source_protocol_type, "agent_message");
  assert.equal(artifacts[0].metadata.source_role, "assistant");
  assert.equal(artifacts[1].kind, "unknown_input");
  assert.equal(artifacts[1].metadata.provider_type, "compaction");
  assert.equal(artifacts[1].metadata.source_protocol_type, "compaction");
  assert.equal(artifacts[2].kind, "unknown_input");
  assert.equal(artifacts[2].metadata.provider_type, "additional_tools");
  assert.equal(artifacts[2].metadata.source_protocol_type, "additional_tools");
});

test("marks injected Codex context messages as ineligible for titles", () => {
  const artifacts = extractResponsesArtifacts({
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "# AGENTS.md instructions for /repo\n\n<INSTRUCTIONS>Read the plan.</INSTRUCTIONS>" }]
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Fix the dashboard request title preview." }]
      }
    ]
  });

  assert.equal(artifacts[0].metadata.message_source, "agent_context");
  assert.equal(artifacts[0].metadata.title_candidate, false);
  assert.equal(artifacts[1].metadata.message_source, "current_turn");
  assert.equal(artifacts[1].metadata.title_candidate, true);
});

test("joins upstream and incoming paths without duplicating a shared base", () => {
  assert.equal(
    buildUpstreamUrl("https://api.openai.com/v1", "/responses?stream=true").toString(),
    "https://api.openai.com/v1/responses?stream=true"
  );
  assert.equal(
    buildUpstreamUrl("https://api.openai.com/v1", "/v1/responses").toString(),
    "https://api.openai.com/v1/responses"
  );
});

test("Codex config enable and disable restore the prior value", () => {
  const original = 'model = "gpt-test"\nmodel_provider = "openai"\n\n[features]\nresponses_websockets = true\n\n[projects.test]\ntrusted = true\n';
  const enabled = enableCodexProxyConfig(original, "http://127.0.0.1:8787/v1");

  assert.match(enabled.config, /model_provider = "token-profiler"/);
  assert.match(enabled.config, /base_url = "http:\/\/127\.0\.0\.1:8787\/v1"/);
  assert.match(enabled.config, /supports_websockets = false/);
  assert.equal(disableCodexProxyConfig(enabled.config, enabled.state), original);
});

test("Codex config inserts a top-level value before the first table", () => {
  const original = '[projects.test]\ntrusted = true\n';
  const enabled = enableCodexProxyConfig(original, "http://127.0.0.1:8787/v1");

  assert.ok(enabled.config.indexOf("model_provider") < enabled.config.indexOf("[projects.test]"));
  assert.match(enabled.config, /\[model_providers\.token-profiler\]/);
  assert.equal(disableCodexProxyConfig(enabled.config, enabled.state), original);
});

test("Codex config disable refuses to overwrite a later manual change", () => {
  const enabled = enableCodexProxyConfig("", "http://127.0.0.1:8787/v1");
  const changed = enabled.config.replace('model_provider = "token-profiler"', 'model_provider = "openai"');

  assert.throws(
    () => disableCodexProxyConfig(changed, enabled.state),
    /refusing to overwrite/
  );
});

test("proxy forwards auth and streaming bytes but stores only artifact metadata in metadata mode", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "token-profiler-test-"));
  let receivedAuth;
  const upstream = http.createServer((request, response) => {
    receivedAuth = request.headers.authorization;
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write("data: first\n\n");
      response.end("data: second\n\n");
    });
  });
  await listen(upstream);

  const upstreamPort = upstream.address().port;
  const profiler = new TokenProfiler({ runId: "integration", rootDir, storageMode: "metadata" });
  const proxy = createProfilerProxy({
    profiler,
    upstream: `http://127.0.0.1:${upstreamPort}`,
    port: 0,
    logger: { error() {} }
  });
  const address = await proxy.listen();

  try {
    const body = JSON.stringify({
      model: "gpt-test",
      instructions: "secret system text",
      input: [
        { type: "message", role: "user", content: [{ type: "input_text", text: "secret user text" }] },
        { type: "message", role: "assistant", content: [{ type: "output_text", text: "secret assistant text" }] }
      ],
      stream: true
    });
    const result = await request({
      port: address.port,
      path: "/v1/responses",
      body,
      headers: { authorization: "Bearer secret-token" }
    });

    assert.equal(result, "data: first\n\ndata: second\n\n");
    assert.equal(receivedAuth, "Bearer secret-token");

    const events = (await readFile(join(rootDir, "runs", "integration", "events.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse);
    const turnIdentity = events.find((event) => event.event_kind === "request_turn_identity");
    const artifacts = events.filter((event) => event.event_kind === "artifact");
    assert.equal(events.length, 4);
    assert.equal(turnIdentity.turn_identity_source, "missing");
    assert.equal(artifacts.length, 3);
    assert.equal(artifacts.every((event) => event.storage_mode === "metadata"), true);
    assert.equal(artifacts.every((event) => Number.isFinite(event.local_token_count)), true);
    assert.equal(artifacts.some((event) => "content" in event), false);
    assert.equal(artifacts.some((event) => "preview" in event), false);
    assert.deepEqual(artifacts.map((event) => event.metadata.content_kind), [
      "system_prompt",
      "user_message",
      "assistant_message"
    ]);
    assert.deepEqual(artifacts.map((event) => event.metadata.title_candidate), [
      false,
      true,
      true
    ]);
    assert.equal(artifacts[0].artifact_index, 0);
    assert.equal(artifacts[0].token_start, 0);
    assert.equal(artifacts[0].token_end, artifacts[0].local_token_count);
    assert.equal(artifacts[1].artifact_index, 1);
    assert.equal(artifacts[1].token_start, artifacts[0].token_end);
    assert.equal(artifacts[1].token_end, artifacts[0].local_token_count + artifacts[1].local_token_count);
    assert.equal(JSON.stringify(events).includes("secret-token"), false);
    assert.equal(JSON.stringify(events).includes("secret system text"), false);
    assert.equal(JSON.stringify(events).includes("secret user text"), false);
    assert.equal(JSON.stringify(events).includes("secret assistant text"), false);
  } finally {
    await proxy.close();
    await new Promise((resolve) => upstream.close(resolve));
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("proxy profiles compressed request bodies without changing forwarded bytes", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "token-profiler-gzip-test-"));
  let receivedBody;
  const upstream = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      receivedBody = Buffer.concat(chunks);
      response.end("ok");
    });
  });
  await listen(upstream);
  const profiler = new TokenProfiler({ runId: "gzip", rootDir });
  const proxy = createProfilerProxy({
    profiler,
    upstream: `http://127.0.0.1:${upstream.address().port}`,
    port: 0,
    logger: { error() {} }
  });
  const address = await proxy.listen();

  try {
    const compressed = gzipSync(JSON.stringify({ instructions: "compressed prompt", input: "hello" }));
    await request({
      port: address.port,
      path: "/responses",
      body: compressed,
      headers: { "content-encoding": "gzip" }
    });
    assert.deepEqual(receivedBody, compressed);
    const events = await readFile(join(rootDir, "runs", "gzip", "events.jsonl"), "utf8");
    assert.match(events, /SYSTEM_PROMPT/);
    assert.match(events, /USER_MESSAGE/);
  } finally {
    await proxy.close();
    await new Promise((resolve) => upstream.close(resolve));
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("proxy stores exact prompt-cache usage in the automatic session", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "token-profiler-cache-test-"));
  const upstream = http.createServer((request, response) => {
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(`data: ${JSON.stringify({
        type: "response.completed",
        response: {
          id: "resp_cache_1",
          usage: {
            input_tokens: 1200,
            input_tokens_details: { cached_tokens: 1024 },
            output_tokens: 40,
            total_tokens: 1240
          }
        }
      })}\n\n`);
    });
  });
  await listen(upstream);
  const sessionRouter = new SessionRouter({ rootDir });
  const proxy = createProfilerProxy({
    sessionRouter,
    upstream: `http://127.0.0.1:${upstream.address().port}`,
    port: 0,
    logger: { error() {} }
  });
  const address = await proxy.listen();

  try {
    await request({
      port: address.port,
      path: "/responses",
      body: JSON.stringify({ input: "hello", stream: true }),
      headers: { "x-token-profiler-session": "automatic-session" }
    });
    const events = (await readFile(
      join(rootDir, "runs", "automatic-session", "events.jsonl"),
      "utf8"
    )).trim().split("\n").map(JSON.parse);
    const usage = events.find((event) => event.event_kind === "request_usage");
    assert.equal(usage.input_tokens, 1200);
    assert.equal(usage.cached_input_tokens, 1024);
    assert.equal(usage.uncached_input_tokens, 176);
  } finally {
    await proxy.close();
    await new Promise((resolve) => upstream.close(resolve));
    await rm(rootDir, { recursive: true, force: true });
  }
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function request({ port, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const outgoing = http.request({
      host: "127.0.0.1",
      port,
      path,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        ...headers
      }
    }, (response) => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => resolve(data));
    });
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}
