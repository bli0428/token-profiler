import type { PrivacyState } from "../api/types";

export type PrivacyDisplay = {
  label: string;
  description: string;
  tone: "neutral" | "info" | "warning" | "danger";
  canShowRawContent: boolean;
};

const privacyDisplays: Record<PrivacyState, PrivacyDisplay> = {
  hidden: {
    label: "Hidden",
    description: "Raw content is hidden by the active privacy policy.",
    tone: "warning",
    canShowRawContent: false
  },
  unavailable: {
    label: "Unavailable",
    description: "Content is unavailable from the local dashboard API.",
    tone: "danger",
    canShowRawContent: false
  },
  preview: {
    label: "Preview",
    description: "A privacy-safe preview is available.",
    tone: "info",
    canShowRawContent: false
  },
  raw_available: {
    label: "Raw available",
    description: "Raw content is available because capture policy allowed it.",
    tone: "neutral",
    canShowRawContent: true
  }
};

export function getPrivacyDisplay(state: PrivacyState): PrivacyDisplay {
  return privacyDisplays[state];
}
