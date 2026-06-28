/**
 * Codex CLI configuration helpers for enabling and disabling the live proxy.
 *
 * These functions work on config text supplied by the caller. They do not read
 * or write files directly, which keeps filesystem ownership with the command
 * layer that invokes them.
 */
const PROVIDER_ID = "token-profiler";
const MARKER = "# Managed by token-profiler; use 'token-profiler codex disable' to restore.";

type CodexProxyState = {
  managed_line?: string;
  previous_line?: string | null;
  provider_block?: string;
};

/**
 * Adds a managed Token Profiler model provider to a Codex config document.
 *
 * @param config - Existing Codex config file contents.
 * @param proxyUrl - Base URL for the local proxy, written into the provider block.
 * @param now - Clock value used for the returned enable-state timestamp.
 * @returns Updated config text and a state object that can later restore the prior provider setting.
 * @throws When the managed provider block already exists, because overwriting it could lose user edits.
 */
export function enableCodexProxyConfig(config: string, proxyUrl: string, now = new Date()) {
  if (new RegExp(`^\\[model_providers\\.${PROVIDER_ID}\\]\\s*$`, "m").test(config)) {
    throw new Error(`Codex provider ${PROVIDER_ID} already exists; refusing to overwrite it.`);
  }

  const managedLine = `model_provider = ${JSON.stringify(PROVIDER_ID)}`;
  const pattern = /^\s*model_provider\s*=.*$/m;
  const match = config.match(pattern);
  let updated: string;

  if (match) {
    updated = config.replace(pattern, managedLine);
  } else {
    const firstTable = config.search(/^\s*\[/m);
    const insertion = `${MARKER}\n${managedLine}\n\n`;
    updated = firstTable === -1
      ? `${config}${config && !config.endsWith("\n") ? "\n" : ""}${insertion}`
      : `${config.slice(0, firstTable)}${insertion}${config.slice(firstTable)}`;
  }

  const separator = updated.length > 0 && !updated.endsWith("\n") ? "\n" : "";
  const providerBlock = `${separator}\n[model_providers.${PROVIDER_ID}]\nname = "Token Profiler"\nbase_url = ${JSON.stringify(proxyUrl)}\nwire_api = "responses"\nrequires_openai_auth = true\nsupports_websockets = false\n`;

  return {
    config: `${updated}${providerBlock}`,
    state: {
      schema_version: 2,
      managed_line: managedLine,
      previous_line: match?.[0] ?? null,
      provider_block: providerBlock,
      enabled_at: now.toISOString()
    }
  };
}

/**
 * Removes the managed Token Profiler provider from a Codex config document.
 *
 * @param config - Current Codex config file contents.
 * @param state - State returned by `enableCodexProxyConfig` when the proxy was enabled.
 * @returns Config text with the previous model provider restored, or with the inserted provider line removed.
 * @throws When the managed provider line or provider block no longer matches the saved state.
 */
export function disableCodexProxyConfig(config: string, state: CodexProxyState): string {
  if (!state?.managed_line || !config.includes(state.managed_line)) {
    throw new Error("Codex proxy setting changed after enable; refusing to overwrite it.");
  }
  if (!state.provider_block || !config.endsWith(state.provider_block)) {
    throw new Error("Codex profiler provider changed after enable; refusing to overwrite it.");
  }

  const restored = config.slice(0, -state.provider_block.length);
  if (state.previous_line) {
    return restored.replace(state.managed_line, state.previous_line);
  }

  return restored
    .replace(`${MARKER}\n`, "")
    .replace(`${state.managed_line}\n\n`, "");
}
