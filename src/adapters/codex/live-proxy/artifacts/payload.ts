import type { CodexProviderItem } from "./types.ts";

export function artifactContent(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

export function asProviderItem(value: unknown): CodexProviderItem {
  return isProviderItem(value) ? value : {};
}

export function isProviderItem(value: unknown): value is CodexProviderItem {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function normalizeToolOutput(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    return output.map((part) => {
      const item = asProviderItem(part);
      return stringValue(item.text) ?? JSON.stringify(part);
    }).join("");
  }
  return JSON.stringify(output ?? "");
}

export function firstContentLine(text: string): string | undefined {
  const lines = String(text).split("\n").map((line) => line.trim()).filter(Boolean);
  const outputIndex = lines.findIndex((line) => line === "Output:");
  const candidate = outputIndex >= 0 ? lines.slice(outputIndex + 1).find(Boolean) : lines.at(-1);
  return candidate ? truncateMiddle(candidate, 120) : undefined;
}

export function parseJsonValue(value: unknown): any {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function truncateMiddle(value: unknown, width: number): string {
  const text = String(value);
  if (text.length <= width) return text;
  const head = Math.max(1, Math.floor((width - 3) * 0.65));
  const tail = Math.max(1, width - 3 - head);
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

export function truncatePath(value: unknown, width: number): string {
  const text = String(value);
  if (text.length <= width) return text;
  const parts = text.split(/[\\/]/);
  if (parts.length <= 1) return truncateMiddle(text, width);
  const basename = parts.at(-1) ?? "";
  const dirname = parts.slice(0, -1).join("/");
  const remaining = width - basename.length - 4;
  return remaining > 4
    ? `${truncateMiddle(dirname, remaining)}/.../${basename}`
    : truncateMiddle(text, width);
}
