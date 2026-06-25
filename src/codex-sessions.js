import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";

const ROLLOUT_RE = /^rollout-.+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;

export async function readCodexSessionMetadata({
  codexHome,
  maxRollouts = 500
}) {
  const index = await readSessionIndex(codexHome);
  const rollouts = await readRollouts(codexHome, maxRollouts);
  return { index, rollouts };
}

export function enrichProfilerSessions(sessions, metadata, {
  maxTimeDeltaMs = 10_000
} = {}) {
  const direct = new Map();
  for (const [id, entry] of metadata.index) {
    direct.set(`codex-${id}`, entry);
  }

  return sessions.map((session) => {
    const directEntry = direct.get(session.id);
    if (directEntry) {
      return { ...session, codex: { ...directEntry, match: "id" } };
    }

    const nearby = nearestRollout(session.updatedAt, metadata.rollouts, maxTimeDeltaMs);
    if (!nearby) return session;

    const indexed = metadata.index.get(nearby.sessionId);
    return {
      ...session,
      codex: {
        sessionId: nearby.sessionId,
        threadName: indexed?.threadName ?? nearby.firstUserMessage,
        updatedAt: indexed?.updatedAt ?? nearby.updatedAt,
        cwd: nearby.cwd,
        source: nearby.source,
        match: indexed ? "time+index" : "time+rollout",
        deltaMs: nearby.deltaMs
      }
    };
  });
}

async function readSessionIndex(codexHome) {
  const indexPath = join(codexHome, "session_index.jsonl");
  const raw = await readFile(indexPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });

  const index = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const entry = parseJson(line);
    if (!entry?.id) continue;
    index.set(entry.id, {
      sessionId: entry.id,
      threadName: entry.thread_name,
      updatedAt: parseDate(entry.updated_at)
    });
  }
  return index;
}

async function readRollouts(codexHome, maxRollouts) {
  const files = [
    ...await listJsonlFiles(join(codexHome, "sessions")),
    ...await listJsonlFiles(join(codexHome, "archived_sessions"))
  ];

  const stats = [];
  for (const file of files) {
    const fileStat = await stat(file).catch(() => null);
    if (fileStat) stats.push({ file, updatedAt: fileStat.mtime });
  }

  const newest = stats
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, maxRollouts);

  const rollouts = [];
  for (const entry of newest) {
    const metadata = await readRolloutMetadata(entry.file);
    if (!metadata?.sessionId) continue;
    rollouts.push({
      ...metadata,
      path: entry.file,
      updatedAt: entry.updatedAt
    });
  }
  return rollouts;
}

async function readRolloutMetadata(file) {
  const raw = await readFile(file, "utf8").catch(() => "");
  let sessionId = basename(file).match(ROLLOUT_RE)?.[1];
  let cwd;
  let source;
  let eventUserMessage;
  let responseUserMessage;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const event = parseJson(line);
    if (!event) continue;

    if (event.type === "session_meta") {
      sessionId = event.payload?.session_id ?? event.payload?.id ?? sessionId;
      cwd = event.payload?.cwd ?? cwd;
      source = event.payload?.source ?? source;
    }

    if (!eventUserMessage && event.type === "event_msg") {
      eventUserMessage = extractEventUserMessage(event);
    }

    if (!responseUserMessage && event.type === "response_item") {
      responseUserMessage = extractResponseUserMessage(event);
    }

    if (sessionId && cwd && eventUserMessage) break;
  }

  const firstUserMessage = eventUserMessage ?? responseUserMessage;
  return { sessionId, cwd, source, firstUserMessage };
}

async function listJsonlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonlFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(path);
    }
  }
  return files;
}

function nearestRollout(updatedAt, rollouts, maxTimeDeltaMs) {
  let best;
  for (const rollout of rollouts) {
    const deltaMs = Math.abs(rollout.updatedAt.getTime() - updatedAt.getTime());
    if (deltaMs > maxTimeDeltaMs) continue;
    if (!best || deltaMs < best.deltaMs) best = { ...rollout, deltaMs };
  }
  return best;
}

function extractEventUserMessage(event) {
  if (event.payload?.type !== "user_message") return undefined;
  return truncateTitle(event.payload.message);
}

function extractResponseUserMessage(event) {
  const message = event.payload?.type === "message" ? event.payload : event.payload?.payload;
  if (message?.role !== "user") return undefined;
  const parts = message.content
    ?.map((part) => part?.text)
    .filter(Boolean);
  const text = parts?.at(-1);
  return truncateTitle(text);
}

function truncateTitle(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}

function parseJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function parseDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
