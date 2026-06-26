import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { startDashboardApiServer } from "../dashboard-api/server.ts";
import { optionString, parseOptions, positionalArgs } from "./utils.ts";

export async function runDashboardApi(args: string[]): Promise<void> {
  const [subcommand = "help"] = positionalArgs(args);
  if (subcommand !== "serve") {
    throw new Error("Use: dashboard-api serve [--port <port>] [--host <host>] [--data-dir <path>] [--origin <origin>]");
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
    log: console.log
  });
}
