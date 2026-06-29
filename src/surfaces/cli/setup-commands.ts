import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { runDaemon } from "./daemon-commands.ts";
import { runCodexConfig } from "./proxy-commands.ts";
import { optionString, parseOptions, positionalArgs } from "./utils.ts";

export async function runSetup(args: string[]): Promise<void> {
  const [target = "help"] = positionalArgs(args);
  if (target !== "codex") {
    throw new Error("Use: setup codex [--auth chatgpt|api] [--autostart] [--data-dir <path>] [--config <path>]");
  }

  const options = parseOptions(args);
  const authMode = optionString(options.auth, "chatgpt");
  if (!["chatgpt", "api"].includes(authMode)) throw new Error("--auth must be chatgpt or api.");

  const rootDir = resolve(optionString(options["data-dir"], join(homedir(), ".token-profiler")));
  const proxyPort = optionString(options["proxy-port"] ?? options.port, "8787");
  const host = optionString(options.host, "127.0.0.1");
  const proxyUrl = authMode === "chatgpt"
    ? `http://${host}:${proxyPort}`
    : `http://${host}:${proxyPort}/v1`;

  const enableArgs = ["enable", "--auth", authMode, "--url", proxyUrl];
  if (typeof options.config === "string") {
    enableArgs.push("--config", options.config);
  }
  await runCodexConfig(enableArgs);

  if (options.autostart) {
    const launchAgentPath = await installLaunchAgent({
      authMode,
      rootDir,
      host,
      proxyPort,
      dashboardPort: optionString(options["dashboard-port"], "8788"),
      origin: optionString(options.origin, "http://127.0.0.1:5173"),
      upstream: typeof options.upstream === "string" ? options.upstream : undefined,
      captureMode: typeof options["capture-mode"] === "string" ? options["capture-mode"] : undefined,
      codexHome: typeof options["codex-home"] === "string" ? options["codex-home"] : undefined,
      noCodex: Boolean(options["no-codex"])
    });
    console.log(`Installed token profiler LaunchAgent at ${launchAgentPath}`);

    const daemonArgs = [
      "ensure",
      "--auth",
      authMode,
      "--data-dir",
      rootDir,
      "--host",
      host,
      "--proxy-port",
      proxyPort,
      "--dashboard-port",
      optionString(options["dashboard-port"], "8788"),
      "--origin",
      optionString(options.origin, "http://127.0.0.1:5173")
    ];
    if (typeof options.upstream === "string") daemonArgs.push("--upstream", options.upstream);
    if (typeof options["capture-mode"] === "string") daemonArgs.push("--capture-mode", options["capture-mode"]);
    if (typeof options["codex-home"] === "string") daemonArgs.push("--codex-home", options["codex-home"]);
    if (options["no-codex"]) daemonArgs.push("--no-codex");

    await runDaemon(daemonArgs);
  }

  console.log("Restart Codex before starting a new monitored session.");
}

type LaunchAgentOptions = {
  authMode: string;
  rootDir: string;
  host: string;
  proxyPort: string;
  dashboardPort: string;
  origin: string;
  upstream?: string | undefined;
  captureMode?: string | undefined;
  codexHome?: string | undefined;
  noCodex?: boolean | undefined;
};

async function installLaunchAgent(options: LaunchAgentOptions): Promise<string> {
  if (process.platform !== "darwin") {
    throw new Error("--autostart currently installs a macOS LaunchAgent and requires macOS.");
  }

  const cliPath = process.argv[1];
  if (!cliPath) throw new Error("Cannot install autostart without a CLI entrypoint path.");

  await mkdir(options.rootDir, { recursive: true });
  const launchAgentPath = join(homedir(), "Library", "LaunchAgents", "com.token-profiler.daemon.plist");
  await mkdir(dirname(launchAgentPath), { recursive: true });

  const plist = launchAgentPlist({
    nodePath: process.execPath,
    cliPath,
    ...options
  });
  await writeFile(launchAgentPath, plist, "utf8");
  return launchAgentPath;
}

type LaunchAgentPlistOptions = LaunchAgentOptions & {
  nodePath: string;
  cliPath: string;
};

export function launchAgentPlist(options: LaunchAgentPlistOptions): string {
  const args = [
    options.nodePath,
    options.cliPath,
    "daemon",
    "ensure",
    "--auth",
    options.authMode,
    "--data-dir",
    options.rootDir,
    "--host",
    options.host,
    "--proxy-port",
    options.proxyPort,
    "--dashboard-port",
    options.dashboardPort,
    "--origin",
    options.origin
  ];
  if (options.upstream) args.push("--upstream", options.upstream);
  if (options.captureMode) args.push("--capture-mode", options.captureMode);
  if (options.codexHome) args.push("--codex-home", options.codexHome);
  if (options.noCodex) args.push("--no-codex");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.token-profiler.daemon</string>
  <key>ProgramArguments</key>
  <array>
${args.map((arg) => `    <string>${escapePlist(arg)}</string>`).join("\n")}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${escapePlist(join(options.rootDir, "launchd.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${escapePlist(join(options.rootDir, "launchd.log"))}</string>
</dict>
</plist>
`;
}

function escapePlist(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
