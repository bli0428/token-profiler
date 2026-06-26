import type { AdapterDescriptor } from "../source-adapter.ts";

export const codexAdapter: AdapterDescriptor = {
  id: "codex",
  displayName: "Codex",
  capabilities: ["live-capture", "log-import", "config-helper"]
};

export * from "./live-proxy/index.ts";
export * from "./log-import/index.ts";
