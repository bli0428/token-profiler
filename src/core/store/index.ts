import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export class JsonlEventStore {
  rootDir: string;
  runId: string;
  runDir: string;
  eventsPath: string;

  constructor({ rootDir = ".token-profiler", runId }: { rootDir?: string; runId: string }) {
    if (!runId) {
      throw new Error("JsonlEventStore requires a runId.");
    }

    this.rootDir = rootDir;
    this.runId = runId;
    this.runDir = join(rootDir, "runs", runId);
    this.eventsPath = join(this.runDir, "events.jsonl");
  }

  async append(event: unknown) {
    await mkdir(dirname(this.eventsPath), { recursive: true });
    await writeFile(this.eventsPath, `${JSON.stringify(event)}\n`, { flag: "a" });
  }

  async readAll() {
    let raw;

    try {
      raw = await readFile(this.eventsPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }

    return raw
      .split("\n")
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(`Invalid JSONL at ${this.eventsPath}:${index + 1}: ${(error as Error).message}`);
        }
      });
  }
}

export async function readEventsFromRunDir(runDir: string): Promise<unknown[]> {
  const eventsPath = join(runDir, "events.jsonl");
  let raw;

  try {
    raw = await readFile(eventsPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`No events found at ${eventsPath}`);
    }

    throw error;
  }

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${eventsPath}:${index + 1}: ${(error as Error).message}`);
      }
    });
}
