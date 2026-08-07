import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const FILE_NAME = "dashboard-session-catalog-v1.json";
export type SessionCatalogEntry = { run_id: string; label: string; updated_at: string; source_bytes: number; source_mtime_ms: number; request_count?: number; artifact_count?: number; input_tokens?: number; cached_input_tokens?: number; uncached_input_tokens?: number; output_tokens?: number; availability_status: "complete" | "partial" | "unavailable" };
type SessionCatalog = { schema_version: 2; sessions: SessionCatalogEntry[] };

export async function readCurrentSessionCatalog(rootDir: string, sources: Map<string, { size: number; mtimeMs: number }>): Promise<SessionCatalogEntry[] | undefined> {
  try {
    const catalog = JSON.parse(await readFile(join(rootDir, FILE_NAME), "utf8")) as SessionCatalog;
    if (catalog.schema_version !== 2 || !Array.isArray(catalog.sessions) || catalog.sessions.length !== sources.size) return undefined;
    return catalog.sessions.every((entry) => {
      const source = sources.get(entry.run_id);
      return typeof entry.label === "string" && source?.size === entry.source_bytes && source.mtimeMs === entry.source_mtime_ms;
    }) ? catalog.sessions : undefined;
  } catch { return undefined; }
}

export async function writeSessionCatalog(rootDir: string, sessions: SessionCatalogEntry[]): Promise<void> {
  await writeFile(join(rootDir, FILE_NAME), JSON.stringify({ schema_version: 2, sessions }), "utf8");
}
