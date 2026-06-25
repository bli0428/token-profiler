export const STORAGE_MODES = Object.freeze(["metadata", "preview", "raw"]);

const DEFAULT_PREVIEW_CHARS = 800;

export function normalizeStorageMode({ storageMode, storeContent } = {}) {
  if (storageMode !== undefined) {
    if (!STORAGE_MODES.includes(storageMode)) {
      throw new Error(`Unsupported storage mode "${storageMode}".`);
    }
    return storageMode;
  }

  return storeContent ? "raw" : "metadata";
}

export function applyStorageMode(event, content, storageMode) {
  const normalizedContent = String(content ?? "");
  const mode = normalizeStorageMode({ storageMode });
  const stored = {
    ...event,
    storage_mode: mode
  };

  delete stored.content;
  delete stored.preview;

  if (mode === "preview") {
    stored.preview = createContentPreview(normalizedContent);
  }

  if (mode === "raw") {
    stored.content = normalizedContent;
  }

  return stored;
}

export function createContentPreview(content, { maxChars = DEFAULT_PREVIEW_CHARS } = {}) {
  const text = String(content ?? "");
  const charCount = text.length;
  const lineCount = text.length === 0 ? 0 : text.split("\n").length;

  if (charCount <= maxChars) {
    return {
      head: text,
      tail: "",
      char_count: charCount,
      line_count: lineCount,
      truncated: false
    };
  }

  const headChars = Math.ceil(maxChars / 2);
  const tailChars = Math.floor(maxChars / 2);

  return {
    head: text.slice(0, headChars),
    tail: text.slice(-tailChars),
    char_count: charCount,
    line_count: lineCount,
    truncated: true
  };
}
