import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { enrichProfilerSessions, readCodexSessionMetadata } from "../src/codex-sessions.js";

test("enriches profiler sessions from Codex session index by direct UUID", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "codex-session-index-test-"));

  try {
    await writeFile(
      join(codexHome, "session_index.jsonl"),
      `${JSON.stringify({
        id: "019ef64d-7666-7ba3-a9d6-ac0fe4cd2341",
        thread_name: "Track prompt exposure",
        updated_at: "2026-06-23T21:06:08.586525Z"
      })}\n`
    );

    const metadata = await readCodexSessionMetadata({ codexHome });
    const [session] = enrichProfilerSessions([
      {
        id: "codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd2341",
        updatedAt: new Date("2026-06-23T21:06:08.000Z")
      }
    ], metadata);

    assert.equal(session.codex.threadName, "Track prompt exposure");
    assert.equal(session.codex.match, "id");
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});

test("enriches profiler sessions from nearby Codex rollout timing", async () => {
  const codexHome = await mkdtemp(join(tmpdir(), "codex-rollout-test-"));
  const sessionId = "019ef6ea-8df7-7360-a7ef-a4f512ef226f";
  const rolloutDir = join(codexHome, "sessions", "2026", "06", "23");
  const rolloutPath = join(rolloutDir, `rollout-2026-06-23T19-57-07-${sessionId}.jsonl`);
  const updatedAt = new Date("2026-06-23T23:57:09.200Z");

  try {
    await mkdir(rolloutDir, { recursive: true });
    await writeFile(
      join(codexHome, "session_index.jsonl"),
      `${JSON.stringify({
        id: sessionId,
        thread_name: "Track prompt exposure",
        updated_at: "2026-06-23T23:57:09.260Z"
      })}\n`
    );
    await writeFile(
      rolloutPath,
      [
        JSON.stringify({
          type: "session_meta",
          payload: {
            session_id: sessionId,
            cwd: "/repo",
            source: "exec"
          }
        }),
        JSON.stringify({
          type: "event_msg",
          payload: {
            type: "user_message",
            message: "Reply with only: ok."
          }
        })
      ].join("\n")
    );
    await utimes(rolloutPath, updatedAt, updatedAt);

    const metadata = await readCodexSessionMetadata({ codexHome });
    const [session] = enrichProfilerSessions([
      {
        id: "codex-20260623T235707155Z-8f5ecda5",
        updatedAt: new Date("2026-06-23T23:57:09.240Z")
      }
    ], metadata);

    assert.equal(session.codex.threadName, "Track prompt exposure");
    assert.equal(session.codex.sessionId, sessionId);
    assert.equal(session.codex.match, "time+index");
  } finally {
    await rm(codexHome, { recursive: true, force: true });
  }
});
