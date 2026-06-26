import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { TokenProfiler } from "../../../core/capture/index.ts";
import { createRequestUsageEvent } from "../../../core/events/index.ts";

const ROLLOUT_RE = /^rollout-.+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;

type CodexSessionMetadata = {
  index: Map<string, any>;
  rollouts: any[];
};

export async function importCodexRolloutUsage({
  rolloutPath,
  runId,
  rootDir
}: {
  rolloutPath: string;
  runId: string;
  rootDir?: string;
}): Promise<{ imported: number; skipped: number }> {
  const profiler = new TokenProfiler({ runId, ...(rootDir ? { rootDir } : {}) });
  const raw = await readFile(resolve(rolloutPath), "utf8");
  const lines = raw.split("\n").filter(Boolean);
  let imported = 0;
  let skipped = 0;

  for (const line of lines) {
    const entry: any = parseJson(line);
    if (!entry || entry.type !== "event_msg" || entry.payload?.type !== "token_count") {
      skipped += 1;
      continue;
    }

    const usage = entry.payload.info?.last_token_usage;
    if (!usage) {
      skipped += 1;
      continue;
    }

    imported += 1;

    await profiler.store.append(createRequestUsageEvent({
      runId,
      requestId: `codex_request_${String(imported).padStart(4, "0")}`,
      responseId: entry.payload.info?.id,
      usage,
      timestamp: entry.timestamp ?? new Date().toISOString()
    }));
  }

  return { imported, skipped };
}

export async function readCodexSessionMetadata({
  codexHome,
  maxRollouts = 500
}: {
  codexHome: string;
  maxRollouts?: number;
}): Promise<CodexSessionMetadata> {
  const index = await readSessionIndex(codexHome);
  const rollouts = await readRollouts(codexHome, maxRollouts);
  return { index, rollouts };
}

export function enrichProfilerSessions(sessions: any[], metadata: CodexSessionMetadata, {
  maxTimeDeltaMs = 10_000
} = {}): any[] {
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

async function readSessionIndex(codexHome: string): Promise<Map<string, any>> {
  const indexPath = join(codexHome, "session_index.jsonl");
  const raw = await readFile(indexPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });

  const index = new Map();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const entry: any = parseJson(line);
    if (!entry?.id) continue;
    index.set(entry.id, {
      sessionId: entry.id,
      threadName: entry.thread_name,
      updatedAt: parseDate(entry.updated_at)
    });
  }
  return index;
}

async function readRollouts(codexHome: string, maxRollouts: number): Promise<any[]> {
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
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
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

async function readRolloutMetadata(file: string): Promise<any> {
  const raw = await readFile(file, "utf8").catch(() => "");
  let sessionId = basename(file).match(ROLLOUT_RE)?.[1];
  let cwd;
  let source;
  let eventUserMessage;
  let responseUserMessage;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const event: any = parseJson(line);
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

async function listJsonlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
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

function nearestRollout(updatedAt: Date, rollouts: any[], maxTimeDeltaMs: number): any {
  let best;
  for (const rollout of rollouts) {
    const deltaMs = Math.abs(rollout.updatedAt.getTime() - updatedAt.getTime());
    if (deltaMs > maxTimeDeltaMs) continue;
    if (!best || deltaMs < best.deltaMs) best = { ...rollout, deltaMs };
  }
  return best;
}

function extractEventUserMessage(event: any): string | undefined {
  if (event.payload?.type !== "user_message") return undefined;
  return truncateTitle(event.payload.message);
}

function extractResponseUserMessage(event: any): string | undefined {
  const message = event.payload?.type === "message" ? event.payload : event.payload?.payload;
  if (message?.role !== "user") return undefined;
  const parts = message.content
    ?.map((part: any) => part?.text)
    .filter(Boolean);
  const text = parts?.at(-1);
  return truncateTitle(text);
}

function truncateTitle(value: unknown): string | undefined {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
