const PROVIDER_ID = "token-profiler";
const MARKER = "# Managed by token-profiler; use 'token-profiler codex disable' to restore.";

export function enableCodexProxyConfig(config, proxyUrl, now = new Date()) {
  if (new RegExp(`^\\[model_providers\\.${PROVIDER_ID}\\]\\s*$`, "m").test(config)) {
    throw new Error(`Codex provider ${PROVIDER_ID} already exists; refusing to overwrite it.`);
  }

  const managedLine = `model_provider = ${JSON.stringify(PROVIDER_ID)}`;
  const pattern = /^\s*model_provider\s*=.*$/m;
  const match = config.match(pattern);
  let updated;

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

export function disableCodexProxyConfig(config, state) {
  if (!state?.managed_line || !config.includes(state.managed_line)) {
    throw new Error("Codex proxy setting changed after enable; refusing to overwrite it.");
  }
  if (!state.provider_block || !config.endsWith(state.provider_block)) {
    throw new Error("Codex profiler provider changed after enable; refusing to overwrite it.");
  }

  let restored = config.slice(0, -state.provider_block.length);
  if (state.previous_line) {
    return restored.replace(state.managed_line, state.previous_line);
  }

  return restored
    .replace(`${MARKER}\n`, "")
    .replace(`${state.managed_line}\n\n`, "");
}
