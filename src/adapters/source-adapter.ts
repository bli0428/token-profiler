export type AdapterCapability =
  | "live-capture"
  | "log-import"
  | "telemetry-import"
  | "config-helper"
  | "fixture";

export type AdapterCaptureMethod = "live" | "import" | "telemetry" | "fixture";

export type AdapterLimitationSeverity = "info" | "partial" | "unavailable";

export type AdapterLimitation = {
  code: string;
  message: string;
  severity: AdapterLimitationSeverity;
  appliesTo: "session" | "request" | "artifact" | "usage" | "tool";
};

export type AdapterDescriptor = {
  id: string;
  displayName: string;
  capabilities: AdapterCapability[];
  limitations?: AdapterLimitation[];
};

export type AdapterRecordMetadata = {
  source_id: string;
  capture_method: AdapterCaptureMethod;
  adapter_version?: string;
};
