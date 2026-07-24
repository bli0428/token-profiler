import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export class JsonlEventStore {
  rootDir: string;
  runId: string;
  runDir: string;
  eventsPath: string;

  constructor({ rootDir = join(homedir(), ".token-profiler"), runId }: { rootDir?: string; runId: string }) {
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

/** Reads canonical JSONL without allocating the complete event file. */
export async function* streamEventsFromRunDir(runDir: string): AsyncGenerator<unknown> {
  const eventsPath = join(runDir, "events.jsonl");
  const input = createReadStream(eventsPath, { encoding: "utf8" });
  let lineNumber = 0;
  let pending = "";
  try {
    for await (const chunk of input) {
      pending += chunk;
      let newline = pending.indexOf("\n");

      while (newline !== -1) {
        const line = pending.slice(0, newline).replace(/\r$/, "");
        pending = pending.slice(newline + 1);
        lineNumber += 1;

        if (line) {
          try {
            yield JSON.parse(line);
          } catch (error) {
            throw new Error(`Invalid JSONL at ${eventsPath}:${lineNumber}: ${(error as Error).message}`);
          }
        }

        newline = pending.indexOf("\n");
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`No events found at ${eventsPath}`);
    throw error;
  } finally {
    input.destroy();
  }
}
