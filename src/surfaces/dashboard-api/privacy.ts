import type { AnalysisCaveat, PreviewState } from "../../analysis/types.ts";
import type { DashboardViewPrivacyState } from "./view-model-types.ts";

const SENSITIVE_PATTERNS = [
  /raw/i,
  /content/i,
  /prompt/i,
  /message/i,
  /output/i,
  /patch/i,
  /file_content/i
];

export function dashboardPrivacyState({
  storageMode,
  previewState,
  hiddenFields = [],
  unavailableFields = [],
  caveats = [],
  rawRevealed = false
}: {
  storageMode?: string;
  previewState?: PreviewState;
  hiddenFields?: string[];
  unavailableFields?: string[];
  caveats?: AnalysisCaveat[];
  rawRevealed?: boolean;
}): DashboardViewPrivacyState {
  const normalizedMode = storageMode || "metadata";
  const hidden = unique([
    ...hiddenFields,
    ...(normalizedMode === "metadata" ? ["raw_content"] : [])
  ]);
  return {
    storage_mode: normalizedMode,
    raw_content_available: previewState === "raw_available",
    raw_content_revealed: rawRevealed,
    preview_fields: previewState === "preview" ? ["preview"] : [],
    hidden_fields: hidden,
    unavailable_fields: unique(unavailableFields),
    caveats
  };
}

export function safeDisplayText(value: unknown, privacy: DashboardViewPrivacyState, field = "value"): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (privacy.hidden_fields.includes(field) || shouldHideField(field, privacy)) return undefined;
  const text = String(value);
  return text.length > 0 ? text : undefined;
}

export function safeSearchText(values: Array<unknown>, privacy: DashboardViewPrivacyState): string {
  if (privacy.storage_mode === "metadata") {
    return values
      .filter((value): value is string => typeof value === "string")
      .filter((value) => !looksLikeHiddenContent(value))
      .join(" ")
      .toLowerCase();
  }

  return values
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .filter((value) => !looksLikeHiddenContent(value))
    .join(" ")
    .toLowerCase();
}

export function metadataRow(
  label: string,
  value: unknown,
  privacy: DashboardViewPrivacyState,
  field = label.toLowerCase().replace(/\s+/g, "_")
) {
  if (privacy.hidden_fields.includes(field) || shouldHideField(field, privacy)) {
    return { label, value: "Hidden by privacy mode", visibility: "hidden" as const };
  }

  const text = safeDisplayText(value, privacy, field);
  if (text === undefined) return { label, value: "Unavailable", visibility: "unavailable" as const };
  return { label, value: text, visibility: "visible" as const };
}

function shouldHideField(field: string, privacy: DashboardViewPrivacyState): boolean {
  if (privacy.storage_mode !== "metadata") return false;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(field));
}

function looksLikeHiddenContent(value: string): boolean {
  return value.includes("\n") && value.length > 160;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}
