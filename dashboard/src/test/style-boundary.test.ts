import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

describe("style boundary", () => {
  it("does not import root styles", () => {
    const offenders: string[] = [];
    for (const file of listFiles(join(process.cwd(), "src")).filter((path) => !path.includes("/src/test/"))) {
      if (!/\.(ts|tsx|css)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes("../src/surfaces") || text.includes("/src/surfaces")) {
        offenders.push(relative(process.cwd(), file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps app.css as a stylesheet entrypoint", () => {
    const appCss = readFileSync(join(process.cwd(), "src/styles/app.css"), "utf8");
    expect(appCss.split("\n").length).toBeLessThan(80);
    expect(appCss.match(/@import/g)?.length).toBeGreaterThanOrEqual(7);
  });
});

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}
