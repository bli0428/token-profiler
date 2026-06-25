import { get_encoding } from "tiktoken";

const encoding = get_encoding("o200k_base");

export function countTokens(content) {
  const text = String(content ?? "");
  return text.length === 0 ? 0 : encoding.encode(text, [], []).length;
}

// Kept as a compatibility alias for existing library consumers.
export const estimateTokens = countTokens;
