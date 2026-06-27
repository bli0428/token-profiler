import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type Args = {
  api: string;
  runId?: string;
  artifactId?: string;
  output?: string;
};

type ApiEnvelope<T> = {
  schema_version?: unknown;
  generated_at?: unknown;
  data?: T;
  caveats?: unknown;
};

type StatusData = {
  ready?: unknown;
  read_only?: unknown;
  local_only?: unknown;
  schema_version?: unknown;
};

type SessionsData = {
  sessions?: Array<{ run_id?: unknown }>;
};

type RunData = {
  run_id?: unknown;
  artifacts?: Array<{ artifact_id?: unknown; detail_available?: unknown }>;
};

type ArtifactDetailData = {
  artifact_id?: unknown;
  privacy?: { raw_content_available?: unknown };
  content?: { raw?: unknown };
};

const args = parseArgs(process.argv.slice(2));
const outDir = join(process.cwd(), args.output ?? join("test", "fixtures", "api-real"));
const capturedAt = new Date().toISOString();

await mkdir(outDir, { recursive: true });

const status = await capture<StatusData>("/api/status", "status.json");
assertReadyStatus(status);

const sessions = await capture<SessionsData>("/api/sessions?limit=20", "sessions.json");
const runSelection = args.runId ? "explicit" : "first-session";
const runId = args.runId ?? firstRunId(sessions);
const runPath = `/api/runs/${encodeURIComponent(runId)}`;
const run = await capture<RunData>(runPath, "run.json");
assertRunMatches(run, runId);

const artifactSelection = args.artifactId ? "explicit" : "first-detail-available-artifact";
const artifactId = args.artifactId ?? firstArtifactId(run);
const artifactDetailPath = `${runPath}/artifacts/${encodeURIComponent(artifactId)}`;
const artifactDetail = await capture<ArtifactDetailData>(
  artifactDetailPath,
  "artifact-detail.json"
);
assertArtifactMatches(artifactDetail, artifactId);
assertArtifactBelongsToRun(run, artifactId);

await writeJson("source.json", {
  api_origin: args.api.replace(/\/+$/, ""),
  captured_at: capturedAt,
  capture_tool: "dashboard/scripts/capture-api-fixtures.ts",
  endpoints: {
    status: { method: "GET", path: "/api/status", file: "status.json" },
    sessions: { method: "GET", path: "/api/sessions?limit=20", file: "sessions.json" },
    run: { method: "GET", path: runPath, file: "run.json" },
    artifact_detail: {
      method: "GET",
      path: artifactDetailPath,
      file: "artifact-detail.json"
    }
  },
  normalization: {
    json: "Objects are written with stable sorted keys and two-space indentation.",
    volatile_fields: ["generated_at is preserved in API payloads", "captured_at is recorded in this source metadata file"]
  },
  requested: {
    sessions_limit: 20,
    run_id: args.runId ?? null,
    artifact_id: args.artifactId ?? null
  },
  selected: {
    run_id: runId,
    run_selection: runSelection,
    artifact_id: artifactId,
    artifact_selection: artifactSelection
  },
  validation: {
    api_ready: true,
    local_only: true,
    read_only: true,
    supported_schema_version: 1,
    hidden_raw_content_scan: "No generated baseline fixture contains a string content.raw value."
  }
});

async function capture<T>(path: string, fileName: string): Promise<ApiEnvelope<T>> {
  const url = `${args.api.replace(/\/+$/, "")}${path}`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Failed to capture ${url}: ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  assertEnvelope(body, url);
  assertNoRawContentString(body, fileName);
  await writeJson(fileName, body);
  return body;
}

async function writeJson(fileName: string, value: unknown) {
  const target = join(outDir, fileName);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${stableStringify(value)}\n`);
  console.log(`wrote ${target}`);
}

function assertEnvelope<T>(body: ApiEnvelope<T>, url: string): asserts body is ApiEnvelope<T> & {
  schema_version: 1;
  generated_at: string;
  data: T;
  caveats: unknown[];
} {
  if (body.schema_version !== 1) {
    throw new Error(`Unsupported or missing schema_version from ${url}: ${String(body.schema_version ?? "missing")}`);
  }
  if (typeof body.generated_at !== "string" || !body.data || !Array.isArray(body.caveats)) {
    throw new Error(`Invalid dashboard API envelope from ${url}`);
  }
}

function assertReadyStatus(status: ApiEnvelope<StatusData>) {
  const data = status.data;
  if (!data || data.ready !== true || data.local_only !== true || data.read_only !== true || data.schema_version !== 1) {
    throw new Error("Dashboard API must be ready, local-only, read-only, and schema_version 1 before capturing fixtures.");
  }
}

function firstRunId(sessions: ApiEnvelope<SessionsData>): string {
  const runId = sessions.data?.sessions?.find((session): session is { run_id: string } => typeof session.run_id === "string")?.run_id;
  if (!runId) {
    throw new Error("No session run_id was available. Pass --run-id <safe-routable-run-id>.");
  }
  return runId;
}

function assertRunMatches(run: ApiEnvelope<RunData>, runId: string) {
  if (run.data?.run_id !== runId) {
    throw new Error(`Run fixture mismatch: expected ${runId}, received ${String(run.data?.run_id ?? "missing")}.`);
  }
}

function firstArtifactId(run: ApiEnvelope<RunData>): string {
  const artifactId = run.data?.artifacts?.find(
    (artifact): artifact is { artifact_id: string; detail_available?: unknown } =>
      artifact.detail_available !== false && typeof artifact.artifact_id === "string"
  )?.artifact_id;
  if (!artifactId) {
    throw new Error("No detail-available artifact_id was available. Pass --artifact-id <safe-artifact-id>.");
  }
  return artifactId;
}

function assertArtifactMatches(detail: ApiEnvelope<ArtifactDetailData>, artifactId: string) {
  if (detail.data?.artifact_id !== artifactId) {
    throw new Error(`Artifact fixture mismatch: expected ${artifactId}, received ${String(detail.data?.artifact_id ?? "missing")}.`);
  }
  if (detail.data.privacy?.raw_content_available !== true && typeof detail.data.content?.raw === "string") {
    throw new Error("Artifact detail includes raw content while privacy marks raw content unavailable.");
  }
}

function assertArtifactBelongsToRun(run: ApiEnvelope<RunData>, artifactId: string) {
  const belongs = run.data?.artifacts?.some((artifact) => artifact.artifact_id === artifactId);
  if (!belongs) {
    throw new Error(`Artifact ${artifactId} is not present in the generated run fixture.`);
  }
}

function assertNoRawContentString(value: unknown, fileName: string) {
  const rawPaths: string[] = [];
  collectRawContentStrings(value, fileName, rawPaths);
  if (rawPaths.length > 0) {
    throw new Error(`Generated fixture contains raw content strings: ${rawPaths.join(", ")}`);
  }
}

function collectRawContentStrings(value: unknown, path: string, rawPaths: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectRawContentStrings(item, `${path}[${index}]`, rawPaths));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (key === "raw" && typeof nested === "string" && nested.length > 0) rawPaths.push(nestedPath);
    collectRawContentStrings(nested, nestedPath, rawPaths);
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, sortJson(nested)]));
}

function parseArgs(values: string[]): Args {
  const parsed: Args = { api: "http://127.0.0.1:8788" };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--api") parsed.api = values[index + 1] ?? parsed.api;
    if (value === "--run" || value === "--run-id") parsed.runId = values[index + 1];
    if (value === "--artifact" || value === "--artifact-id") parsed.artifactId = values[index + 1];
    if (value === "--output") parsed.output = values[index + 1];
  }
  return parsed;
}
