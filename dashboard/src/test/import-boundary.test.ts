import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");

describe("dashboard import boundary", () => {
  it("does not import root src or dashboard test helpers from production source", () => {
    const offenders: string[] = [];
    for (const file of listFiles(sourceRoot).filter((path) => !path.includes("/src/test/"))) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      const imports = [...text.matchAll(/from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g)].map((match) => match[1] ?? match[2]);
      for (const specifier of imports) {
        if (specifier.includes("/TokenEfficiencyTracker/src") || specifier === "src" || specifier.startsWith("src/")) {
          offenders.push(`${relative(process.cwd(), file)} -> ${specifier}`);
        }
        if (specifier.includes("../../test") || specifier.includes("../test") || specifier.includes("/dashboard/test")) {
          offenders.push(`${relative(process.cwd(), file)} -> ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}
