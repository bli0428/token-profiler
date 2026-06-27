import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type Args = {
  api: string;
  run?: string;
  artifact?: string;
};

const args = parseArgs(process.argv.slice(2));
const outDir = join(process.cwd(), "test", "fixtures", "api-real");

await mkdir(outDir, { recursive: true });
await capture("/api/status", "status.json");
await capture("/api/sessions?limit=20", "sessions.json");

if (args.run) {
  await capture(`/api/runs/${encodeURIComponent(args.run)}`, "run.json");
}
if (args.run && args.artifact) {
  await capture(`/api/runs/${encodeURIComponent(args.run)}/artifacts/${encodeURIComponent(args.artifact)}`, "artifact-detail.json");
}

async function capture(path: string, fileName: string) {
  const url = `${args.api.replace(/\/+$/, "")}${path}`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to capture ${url}: ${response.status} ${response.statusText}`);
  }
  const target = join(outDir, fileName);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(await response.json(), null, 2)}\n`);
}

function parseArgs(values: string[]): Args {
  const parsed: Args = { api: "http://127.0.0.1:8788" };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--api") parsed.api = values[index + 1] ?? parsed.api;
    if (value === "--run") parsed.run = values[index + 1];
    if (value === "--artifact") parsed.artifact = values[index + 1];
  }
  return parsed;
}
