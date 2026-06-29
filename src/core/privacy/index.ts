export const STORAGE_MODES = Object.freeze(["metadata", "preview", "raw"]);

const DEFAULT_PREVIEW_CHARS = 800;
const DEFAULT_STORAGE_MODE: StorageMode = "preview";

export type StorageMode = typeof STORAGE_MODES[number];

export function normalizeStorageMode({
  storageMode
}: { storageMode?: StorageMode } = {}): StorageMode {
  if (storageMode !== undefined) {
    if (!STORAGE_MODES.includes(storageMode)) {
      throw new Error(`Unsupported storage mode "${storageMode}".`);
    }
    return storageMode;
  }

  return DEFAULT_STORAGE_MODE;
}

export function applyStorageMode(event: Record<string, any>, content: unknown, storageMode: StorageMode) {
  const normalizedContent = String(content ?? "");
  const mode = normalizeStorageMode({ storageMode });
  const stored: Record<string, any> = {
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

export function createContentPreview(content: unknown, { maxChars = DEFAULT_PREVIEW_CHARS } = {}) {
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
