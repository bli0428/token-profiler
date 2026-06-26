import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import { TokenProfiler } from "../../core/capture/index.ts";
import { importCodexRolloutUsage } from "../../ingest/codex-log-import/index.ts";

import { listFiles, optionString, parseOptions, positionalArgs, required } from "./utils.ts";

export async function runDemo(): Promise<void> {
  const rootDir = join(homedir(), ".token-profiler");
  const demoRunDir = join(rootDir, "runs", "demo");
  const profiler = new (TokenProfiler as any)({ runId: "demo", rootDir });
  await mkdir(demoRunDir, { recursive: true });
  await writeFile(join(demoRunDir, "events.jsonl"), "");

  const system = "You are a coding agent. Be concise, careful, and useful.";
  const repoMap = ["src/auth.js", "src/server.js", "src/db.js"].join("\n");
  const authFile = "export function authenticate(user, password) { return Boolean(user && password); }\n";
  const buildLog = "warning: dependency cache missed\n".repeat(240);

  await profiler.recordAsync({
    requestId: "req_001",
    artifactType: "SYSTEM_PROMPT",
    artifactName: "system",
    content: system
  });
  await profiler.recordAsync({
    requestId: "req_001",
    artifactType: "REPO_MAP",
    artifactName: "repo_map",
    content: repoMap
  });
  await profiler.recordAsync({
    requestId: "req_001",
    artifactType: "FILE",
    artifactName: "src/auth.js",
    content: authFile
  });
  await profiler.recordAsync({
    requestId: "req_002",
    artifactType: "REPO_MAP",
    artifactName: "repo_map",
    content: repoMap
  });
  await profiler.recordAsync({
    requestId: "req_002",
    artifactType: "FILE",
    artifactName: "src/auth.js",
    content: authFile
  });
  await profiler.recordAsync({
    requestId: "req_002",
    artifactType: "TEST_OUTPUT",
    artifactName: "build.log",
    content: buildLog
  });
  await profiler.recordAsync({
    requestId: "req_003",
    artifactType: "TEST_OUTPUT",
    artifactName: "build.log",
    content: buildLog
  });

  console.log(`Wrote demo events to ${join(demoRunDir, "events.jsonl")}`);
}


export async function runRecord(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const runId = required(options, "run");
  const requestId = required(options, "request");
  const artifactType = required(options, "type");
  const artifactName = required(options, "name");
  const content = options.content
    ? await readFile(resolve(String(options.content)), "utf8")
    : required(options, "text");

  const profiler = new (TokenProfiler as any)({ runId });
  const event = await profiler.recordAsync({
    requestId,
    artifactType,
    artifactName,
    artifactId: options.id,
    content
  });

  console.log(JSON.stringify(event, null, 2));
}


export async function runWatch(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const runId = required(options, "run");
  const intervalMs = Number(options.interval ?? 2000);
  const root = resolve(optionString(options.cwd, process.cwd()));
  const paths = positionalArgs(args).map((path) => resolve(root, path));
  const targets = paths.length > 0 ? paths : [root];
  const profiler = new (TokenProfiler as any)({ runId });
  const known = new Map<string, string>();

  console.log(`Watching ${targets.map((target) => relative(root, target) || ".").join(", ")}`);
  console.log(`Writing events to ${join(homedir(), ".token-profiler", "runs", runId, "events.jsonl")}`);

  const scan = async (): Promise<void> => {
    const files = await listFiles(targets, root);

    for (const file of files) {
      let stat;

      try {
        stat = statSync(file);
      } catch {
        continue;
      }

      const previous = known.get(file);
      const signature = `${stat.mtimeMs}:${stat.size}`;

      if (previous === signature) {
        continue;
      }

      known.set(file, signature);

      const content = await readFile(file, "utf8").catch(() => null);

      if (content === null) {
        continue;
      }

      const artifactName = relative(root, file);
      const requestId = `watch_${new Date().toISOString()}`;
      const event = await profiler.recordAsync({
        requestId,
        artifactType: "FILE",
        artifactName,
        content
      });

      console.log(`recorded FILE ${artifactName} (${event.local_token_count} tokens)`);
    }
  };

  await scan();
  const timer = setInterval(() => {
    scan().catch((error) => console.error(error instanceof Error ? error.message : String(error)));
  }, intervalMs);

  const stop = async (): Promise<void> => {
    clearInterval(timer);
    await profiler.flush();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}


export async function runCommand(args: string[]): Promise<void> {
  const separatorIndex = args.indexOf("--");

  if (separatorIndex === -1) {
    throw new Error("Use: run --run <id> --name <artifact-name> -- <command> [args...]");
  }

  const optionArgs = args.slice(0, separatorIndex);
  const commandArgs = args.slice(separatorIndex + 1);
  const options = parseOptions(optionArgs);
  const runId = required(options, "run");
  const artifactName = optionString(options.name, commandArgs.join(" "));
  const artifactType = optionString(options.type, "TOOL_OUTPUT");
  const requestId = optionString(options.request, `cmd_${new Date().toISOString()}`);

  if (commandArgs.length === 0) {
    throw new Error("Missing command after --");
  }
  const command = commandArgs[0];
  if (!command) {
    throw new Error("Missing command after --");
  }

  const child = spawn(command, commandArgs.slice(1), {
    cwd: optionString(options.cwd, process.cwd()),
    stdio: ["inherit", "pipe", "pipe"] as const
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.on("close", resolveExit);
  });

  const profiler = new (TokenProfiler as any)({ runId });
  const output = [stdout, stderr].filter(Boolean).join("\n");

  if (output.length > 0) {
    await profiler.recordAsync({
      requestId,
      artifactType,
      artifactName,
      content: output
    });
  }

  process.exitCode = exitCode;
}


export async function runCodexImport(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const rolloutPath = positionalArgs(args)[0];

  if (!rolloutPath) {
    throw new Error("Use: codex-import <rollout.jsonl> --run <id>");
  }

  const runId = required(options, "run");
  const { imported } = await importCodexRolloutUsage({ rolloutPath, runId });

  console.log(`Imported ${imported} Codex token usage events.`);
}
