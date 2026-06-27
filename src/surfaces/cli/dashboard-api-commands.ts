import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { enrichProfilerSessions, readCodexSessionMetadata } from "../../adapters/codex/log-import/index.ts";
import { startDashboardApiServer } from "../dashboard-api/server.ts";
import type { DashboardSessionTitleLookup } from "../dashboard-api/sessions.ts";
import { optionString, parseOptions, positionalArgs } from "./utils.ts";

export async function runDashboardApi(args: string[]): Promise<void> {
  const [subcommand = "help"] = positionalArgs(args);
  if (subcommand !== "serve") {
    throw new Error("Use: dashboard-api serve [--port <port>] [--host <host>] [--data-dir <path>] [--origin <origin>] [--codex-home <path>] [--no-codex]");
  }

  const options = parseOptions(args);
  const port = Number(options.port ?? 8788);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid --port value.");
  }

  await startDashboardApiServer({
    port,
    host: optionString(options.host, "127.0.0.1"),
    rootDir: resolve(optionString(options["data-dir"], join(homedir(), ".token-profiler"))),
    origin: typeof options.origin === "string" ? options.origin : undefined,
    sessionTitleLookup: options["no-codex"] ? undefined : createCodexSessionTitleLookup(
      resolve(optionString(options["codex-home"], join(homedir(), ".codex")))
    ),
    log: console.log
  });
}

function createCodexSessionTitleLookup(codexHome: string): DashboardSessionTitleLookup {
  return async (sessions) => {
    try {
      const metadata = await readCodexSessionMetadata({ codexHome });
      const enriched = enrichProfilerSessions(
        sessions.map((session) => ({
          id: session.run_id,
          updatedAt: session.updated_at
        })),
        metadata
      );

      return new Map(
        enriched
          .filter((session) => typeof session.codex?.threadName === "string" && session.codex.threadName.trim().length > 0)
          .map((session) => [session.id, session.codex.threadName.trim()])
      );
    } catch {
      return new Map();
    }
  };
}
