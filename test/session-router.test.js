import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SessionRouter } from "../src/session-router.js";

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
