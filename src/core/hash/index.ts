import { createHash } from "node:crypto";

export function sha256(content: unknown): string {
  return createHash("sha256").update(String(content), "utf8").digest("hex");
}
