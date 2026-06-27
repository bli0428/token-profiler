import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd(), "..");

describe("root package boundary", () => {
  it("root tsconfig does not include dashboard/src", () => {
    const tsconfig = readFileSync(join(repoRoot, "tsconfig.json"), "utf8");
    expect(tsconfig).not.toContain("dashboard/src");
  });

  it("root src does not import dashboard source", () => {
    const offenders: string[] = [];
    for (const file of listFiles(join(repoRoot, "src"))) {
      const text = readFileSync(file, "utf8");
      if (text.includes("dashboard/src")) offenders.push(relative(repoRoot, file));
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
