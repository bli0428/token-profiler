import { writeFile } from "node:fs/promises";
import type { RunAnalysisSummary } from "../analysis/types.ts";
import { createDashboardViewModel } from "./dashboard/model.ts";
import { renderDashboardHtml } from "./dashboard/render.ts";

/**
 * Writes a static local dashboard from precomputed analyzer results.
 *
 * Like the CLI renderer, this surface only formats metrics that analyzers have
 * already derived. It intentionally does not inspect canonical events directly.
 */
export async function createHtmlReport(summary: RunAnalysisSummary, outPath: string): Promise<void> {
  await writeFile(outPath, renderDashboardHtml(createDashboardViewModel(summary)), "utf8");
}
