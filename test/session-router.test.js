import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { codexSessionRoute, parseCodexRequestEnvelope, toCodexRequestShape } from "../src/adapters/codex/live-proxy/codex-envelope.ts";
import { SessionRouter } from "../src/adapters/codex/live-proxy/session-router.ts";

test("uses an explicit profiler session header", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const session = router.resolve({
      headers: { "x-token-profiler-session": "secretary-task-123" },
      payload: { input: "hello" }
    });
    assert.equal(session.sessionId, "secretary-task-123");
    assert.equal(session.source, "header");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("reuses a generated session for the same active prompt fingerprint", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });
  const payload = { input: [{ role: "user", content: "same task" }] };

  try {
    const first = router.resolve({ payload });
    const second = router.resolve({ payload });
    assert.equal(second.sessionId, first.sessionId);
    assert.equal(second.source, "prompt_fingerprint");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("parses Codex turn metadata and safe header shape", () => {
  const envelope = parseCodexRequestEnvelope({
    headers: {
      "x-codex-turn-metadata": JSON.stringify({
        installation_id: "install-1",
        session_id: "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
        thread_id: "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
        turn_id: "019f0a51-9e25-7a61-9e6a-2e2c14c0c7d8",
        window_id: "019f06aa-c64a-70f0-a6ef-968b5954ef7f:1",
        request_kind: "turn",
        thread_source: "user",
        sandbox: "seatbelt",
        turn_started_at_unix_ms: 1782584548904,
        workspace_kind: "project"
      }),
      "x-codex-beta-features": "remote_compaction_v2",
      "x-codex-installation-id": "install-1",
      "x-client-request-id": "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
      "session-id": "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
      "thread-id": "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
      "x-oai-attestation": "opaque",
      "chatgpt-account-id": "account-1",
      authorization: "Bearer secret"
    }
  });

  assert.equal(envelope.turnMetadata.header.session_id, "019f06aa-c64a-70f0-a6ef-968b5954ef7f");
  assert.equal(envelope.turnMetadata.header.extra.workspace_kind, "project");
  assert.deepEqual(envelope.turnIdentity, {
    turnId: "019f0a51-9e25-7a61-9e6a-2e2c14c0c7d8",
    turnIdentitySource: "direct_turn_id",
    turnStartedAt: "2026-06-27T18:22:28.904Z",
    caveats: []
  });
  assert.deepEqual(envelope.transportHeaders.betaFeatures, ["remote_compaction_v2"]);
  assert.equal(envelope.transportHeaders.accountHeaderPresent, true);
  assert.equal(envelope.transportHeaders.attestationPresent, true);
  assert.equal(envelope.compatibility.headers.installationId, "install-1");
  assert.equal(envelope.compatibility.headers.sessionId, "019f06aa-c64a-70f0-a6ef-968b5954ef7f");
  assert.equal(envelope.observedHeaderKeys.includes("authorization"), true);
  assert.deepEqual(envelope.observedClientMetadataKeys, []);
});

test("routes direct Codex turn_id alongside session identity", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const session = router.resolve({
      payload: {
        client_metadata: {
          "x-codex-turn-metadata": JSON.stringify({
            session_id: "direct-session",
            thread_id: "direct-thread",
            turn_id: "turn-direct-1",
            turn_started_at_unix_ms: 1782584548904
          })
        }
      }
    });

    assert.equal(session.sessionId, "codex-direct-session");
    assert.equal(session.turnIdentity.turnId, "turn-direct-1");
    assert.equal(session.turnIdentity.turnIdentitySource, "direct_turn_id");
    assert.equal(session.turnIdentity.turnStartedAt, "2026-06-27T18:22:28.904Z");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("keeps missing Codex turn identity explicit without fallback ids", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const session = router.resolve({
      payload: {
        client_metadata: {
          "x-codex-turn-metadata": JSON.stringify({
            session_id: "missing-turn-session",
            thread_id: "missing-turn-thread"
          })
        },
        prompt_cache_key: "do-not-use-as-turn-id"
      }
    });

    assert.equal(session.sessionId, "codex-missing-turn-session");
    assert.equal(session.turnIdentity.turnIdentitySource, "missing");
    assert.equal("turnId" in session.turnIdentity, false);
    assert.equal(session.turnIdentity.caveats[0].code, "turn_identity_missing");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("keeps malformed Codex turn identity explicit without fallback ids", () => {
  const envelope = parseCodexRequestEnvelope({
    headers: {
      "x-codex-turn-metadata": "{not-json"
    },
    payload: {
      prompt_cache_key: "do-not-use-as-turn-id"
    }
  });

  assert.equal(envelope.turnIdentity.turnIdentitySource, "malformed");
  assert.equal("turnId" in envelope.turnIdentity, false);
  assert.equal(envelope.turnIdentity.caveats[0].code, "turn_identity_malformed");
});

test("fixture documents canonical request-level turn identity events", async () => {
  const raw = await readFile(
    join(process.cwd(), "test", "fixtures", "events", "turn-identity.jsonl"),
    "utf8"
  );
  const events = raw.trim().split("\n").map(JSON.parse);

  assert.deepEqual(events.map((event) => event.event_kind), [
    "request_turn_identity",
    "request_turn_identity",
    "request_turn_identity"
  ]);
  assert.deepEqual(events.map((event) => event.turn_identity_source), [
    "direct_turn_id",
    "missing",
    "malformed"
  ]);
  assert.equal(events[0].turn_id, "turn_direct_1");
  assert.equal("turn_id" in events[1], false);
  assert.equal("turn_id" in events[2], false);
});

test("prefers client_metadata Codex turn metadata over compatibility headers", () => {
  const envelope = parseCodexRequestEnvelope({
    headers: { "session-id": "header-session" },
    payload: {
      client_metadata: {
        "x-codex-turn-metadata": JSON.stringify({
          session_id: "client-session",
          thread_id: "client-thread",
          request_kind: "turn"
        })
      }
    }
  });

  assert.deepEqual(codexSessionRoute(envelope), {
    sessionId: "codex-client-session",
    source: "codex_turn_metadata"
  });
  assert.deepEqual(envelope.observedClientMetadataKeys, ["x-codex-turn-metadata"]);
});

test("keeps client metadata and header Codex turn metadata as separate observations", () => {
  const envelope = parseCodexRequestEnvelope({
    headers: {
      "x-codex-turn-metadata": JSON.stringify({
        session_id: "header-session",
        thread_id: "header-thread"
      }),
      "session-id": "compat-header-session"
    },
    payload: {
      client_metadata: {
        "x-codex-turn-metadata": JSON.stringify({
          session_id: "client-session",
          thread_id: "client-thread"
        }),
        "x-codex-installation-id": "client-installation",
        session_id: "compat-client-session"
      }
    }
  });

  assert.equal(envelope.turnMetadata.clientMetadata.session_id, "client-session");
  assert.equal(envelope.turnMetadata.header.session_id, "header-session");
  assert.equal(envelope.compatibility.clientMetadata.installationId, "client-installation");
  assert.equal(envelope.compatibility.clientMetadata.sessionId, "compat-client-session");
  assert.equal(envelope.compatibility.headers.sessionId, "compat-header-session");
  assert.deepEqual(codexSessionRoute(envelope), {
    sessionId: "codex-client-session",
    source: "codex_turn_metadata"
  });
});

test("parses the full observed Codex Responses request body shape", () => {
  const envelope = parseCodexRequestEnvelope({
    payload: {
      model: "gpt-5.5",
      instructions: "You are Codex.",
      input: [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Implement the task." }]
        },
        {
          type: "function_call",
          name: "exec_command",
          call_id: "call-1",
          arguments: "{\"cmd\":\"npm test\"}"
        },
        {
          type: "function_call_output",
          call_id: "call-1",
          output: "ok"
        },
        {
          type: "future_input_item",
          payload: "still observable"
        }
      ],
      tools: [
        { type: "function", name: "apply_patch" },
        { type: "function", function: { name: "exec_command" } }
      ],
      tool_choice: "auto",
      parallel_tool_calls: true,
      reasoning: { effort: "medium" },
      store: false,
      stream: true,
      include: ["reasoning.encrypted_content"],
      prompt_cache_key: "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
      text: { verbosity: "low" },
      client_metadata: {
        "x-codex-turn-metadata": JSON.stringify({
          session_id: "client-session",
          thread_id: "client-thread",
          request_kind: "turn"
        })
      },
      extra_body_field: "observed"
    }
  });

  assert.equal(envelope.body.model, "gpt-5.5");
  assert.equal(envelope.body.toolChoice, "auto");
  assert.equal(envelope.body.parallelToolCalls, true);
  assert.equal(envelope.body.reasoningEffort, "medium");
  assert.equal(envelope.body.store, false);
  assert.equal(envelope.body.stream, true);
  assert.deepEqual(envelope.body.include, ["reasoning.encrypted_content"]);
  assert.equal(envelope.body.promptCacheKey, "019f06aa-c64a-70f0-a6ef-968b5954ef7f");
  assert.equal(envelope.body.textVerbosity, "low");
  assert.equal(envelope.body.hasInstructions, true);
  assert.equal(envelope.body.inputItemCount, 4);
  assert.deepEqual(envelope.body.inputItemTypes, [
    "message",
    "function_call",
    "function_call_output",
    "future_input_item"
  ]);
  assert.equal(envelope.body.toolCount, 2);
  assert.deepEqual(envelope.body.toolNames, ["apply_patch", "exec_command"]);
  assert.equal(envelope.body.observedBodyKeys.includes("instructions"), true);
  assert.deepEqual(envelope.body.unknownBodyKeys, ["extra_body_field"]);
  assert.equal(envelope.turnMetadata.clientMetadata.session_id, "client-session");
});

test("rejects wrong types for known Codex Responses request fields", () => {
  assert.throws(() => toCodexRequestShape({
    payload: {
      model: "gpt-5.5",
      instructions: ["not", "a", "string"]
    }
  }));

  assert.throws(() => toCodexRequestShape({
    payload: {
      model: "gpt-5.5",
      reasoning: {
        effort: "medium",
        unmodeled_reasoning_field: true
      }
    }
  }));

  assert.throws(() => toCodexRequestShape({
    payload: {
      model: "gpt-5.5",
      client_metadata: {
        session_id: 123
      }
    }
  }));

  assert.throws(() => toCodexRequestShape({
    payload: {
      model: "gpt-5.5",
      input: [
        {
          type: "function_call",
          arguments: 123
        }
      ]
    }
  }));

  assert.throws(() => toCodexRequestShape({
    payload: {
      model: "gpt-5.5",
      tools: [
        {
          type: "function",
          function: { name: 123 }
        }
      ]
    }
  }));
});

test("routes Codex turn metadata before prompt cache key", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const session = router.resolve({
      headers: {
        "x-codex-turn-metadata": JSON.stringify({
          session_id: "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
          thread_id: "019f06aa-c64a-70f0-a6ef-968b5954ef7f",
          request_kind: "turn"
        })
      },
      payload: { prompt_cache_key: "shared-cache-bucket" }
    });
    assert.equal(session.sessionId, "codex-019f06aa-c64a-70f0-a6ef-968b5954ef7f");
    assert.equal(session.source, "codex_turn_metadata_header");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("groups new traffic with the same Codex session identity", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const first = router.resolve({
      payload: {
        client_metadata: {
          "x-codex-turn-metadata": JSON.stringify({
            session_id: "shared-codex-session",
            thread_id: "shared-thread",
            request_kind: "turn"
          })
        },
        prompt_cache_key: "first-cache-key"
      }
    });
    const second = router.resolve({
      payload: {
        client_metadata: {
          "x-codex-turn-metadata": JSON.stringify({
            session_id: "shared-codex-session",
            thread_id: "shared-thread",
            request_kind: "turn"
          })
        },
        prompt_cache_key: "second-cache-key"
      }
    });

    assert.equal(first.sessionId, "codex-shared-codex-session");
    assert.equal(second.sessionId, "codex-shared-codex-session");
    assert.equal(first.source, "codex_turn_metadata");
    assert.equal(second.source, "codex_turn_metadata");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("separates new traffic with different Codex session identities", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const first = router.resolve({
      payload: {
        client_metadata: {
          "x-codex-turn-metadata": JSON.stringify({
            session_id: "codex-session-one",
            thread_id: "shared-thread",
            request_kind: "turn"
          })
        },
        prompt_cache_key: "shared-cache-key"
      }
    });
    const second = router.resolve({
      payload: {
        client_metadata: {
          "x-codex-turn-metadata": JSON.stringify({
            session_id: "codex-session-two",
            thread_id: "shared-thread",
            request_kind: "turn"
          })
        },
        prompt_cache_key: "shared-cache-key"
      }
    });

    assert.equal(first.sessionId, "codex-codex-session-one");
    assert.equal(second.sessionId, "codex-codex-session-two");
    assert.notEqual(first.sessionId, second.sessionId);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("reports fallback source when Codex session identity is unavailable", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const session = router.resolve({
      payload: { prompt_cache_key: "fallback-cache-key" }
    });

    assert.equal(session.sessionId.startsWith("codex-cache-"), true);
    assert.equal(session.source, "prompt_cache_key");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("falls back from Codex compatibility session header before prompt cache key", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "session-router-test-"));
  const router = new SessionRouter({ rootDir });

  try {
    const session = router.resolve({
      headers: { "session-id": "019f06aa-c64a-70f0-a6ef-968b5954ef7f" },
      payload: { prompt_cache_key: "shared-cache-bucket" }
    });
    assert.equal(session.sessionId, "codex-019f06aa-c64a-70f0-a6ef-968b5954ef7f");
    assert.equal(session.source, "codex_session_header");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
