import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type CodexAuthMode = "chatgpt" | "api";

/**
 * Resolves the proxy upstream authentication mode.
 *
 * An explicit CLI value always wins. Otherwise the mode is inferred from
 * Codex's non-secret auth_mode field so API-key logins use the OpenAI API
 * endpoint instead of the ChatGPT subscription endpoint.
 */
export async function resolveCodexAuthMode(
  requested: string | boolean | undefined,
  codexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex")
): Promise<CodexAuthMode> {
  if (typeof requested === "string") {
    if (requested === "chatgpt" || requested === "api") return requested;
    throw new Error("--auth must be chatgpt or api.");
  }

  try {
    const auth = JSON.parse(await readFile(join(codexHome, "auth.json"), "utf8")) as {
      auth_mode?: unknown;
    };
    return auth.auth_mode === "apikey" ? "api" : "chatgpt";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "chatgpt";
    if (error instanceof SyntaxError) return "chatgpt";
    throw error;
  }
}
