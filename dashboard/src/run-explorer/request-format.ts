import type { AvailabilityState, DashboardPrivacyState, ProviderRequestUsage, RequestUsageAvailability } from "../api/types";

export function formatTokens(value: number | undefined): string {
  if (value === undefined) return "Unavailable";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatEstimatedTokens(value: number | undefined): string {
  if (value === undefined) return "Estimate unavailable";
  return formatTokens(value);
}

export function formatPercent(value: number | "partial" | "unavailable" | undefined): string {
  if (value === undefined || value === "unavailable") return "Unavailable";
  if (value === "partial") return "Partial";
  return `${Math.round(value * 100)}%`;
}

export function formatTimestamp(value: string | undefined, chronologyIndex: number): string {
  if (!value) return `Request ${chronologyIndex + 1}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function requestAvailabilityLabel(availability: RequestUsageAvailability): string {
  if (availability.reason) return availability.reason;
  if (availability.status === "complete") return "Complete usage";
  if (availability.usage_status === "missing") return "Usage unavailable";
  if (availability.usage_status === "incomplete") return "Partial usage";
  return availability.status;
}

export function collectionAvailabilityLabel(availability: AvailabilityState): string {
  if (availability.reason) return availability.reason;
  if (availability.status === "complete") return "Request accounting complete";
  if (availability.status === "partial") return "Request accounting partial";
  if (availability.status === "unavailable") return "Request accounting unavailable";
  return "Request accounting not applicable";
}

export function requestMetricEntries(usage: ProviderRequestUsage | undefined, artifactCount: number): Array<{ label: string; value: string }> {
  return [
    { label: "Input", value: formatTokens(usage?.uncached_input_tokens) },
    { label: "Output", value: formatTokens(usage?.output_tokens) },
    { label: "Cached Read", value: formatTokens(usage?.cached_input_tokens) },
    { label: "Total Tokens", value: formatTokens(usage?.total_tokens) },
    { label: "Artifacts", value: formatTokens(artifactCount) }
  ];
}

export function privacyDisplayState(privacy: DashboardPrivacyState): "hidden" | "unavailable" | "preview" | "raw_available" {
  if (privacy.raw_content_available && privacy.raw_content_revealed) return "raw_available";
  if (privacy.preview_fields.length > 0) return "preview";
  if (privacy.unavailable_fields.length > 0) return "unavailable";
  return "hidden";
}
