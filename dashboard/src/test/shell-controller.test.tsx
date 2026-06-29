import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardSession } from "../api/types";
import { DashboardShell } from "../shell/DashboardShell";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("dashboard shell/controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("renders sessions after status readiness", async () => {
    mockApi();
    render(<DashboardShell />);
    expect(await screen.findByText(apiRealFixtures.sessions.data.sessions[0]!.label ?? apiRealFixtures.sessions.data.sessions[0]!.run_id)).toBeInTheDocument();
    expect(screen.getByText("API ready")).toBeInTheDocument();
  });

  it("selects a session using run_id instead of canonical_run_id", async () => {
    const getRun = vi.fn(async (_url: string) => Response.json(apiRealFixtures.run));
    mockApi({ getRun });
    render(<DashboardShell />);
    const session = apiRealFixtures.sessions.data.sessions[0]!;
    await userEvent.click(await screen.findByText(session.label ?? session.run_id));
    await waitFor(() => expect(getRun.mock.calls[0]?.[0]).toContain(`/api/runs/${session.run_id}`));
    if (session.canonical_run_id) expect(getRun.mock.calls[0]?.[0]).not.toContain(session.canonical_run_id);
  });

  it("requests separate run details for distinct direct Codex sessions with overlapping labels", async () => {
    const first = directCodexSession("codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd2341", "Shared title");
    const second = directCodexSession("codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd9999", "Shared title");
    const getRun = vi.fn(async (_url: string) => Response.json(apiRealFixtures.run));

    mockApi({ getRun, sessions: [first, second] });
    render(<DashboardShell />);

    const rows = await screen.findAllByRole("button", { name: /Shared title/ });
    await userEvent.click(rows[0]!);
    await waitFor(() => expect(getRun.mock.calls.at(-1)?.[0]).toContain(`/api/runs/${first.run_id}`));

    await userEvent.click(rows[1]!);
    await waitFor(() => expect(getRun.mock.calls.at(-1)?.[0]).toContain(`/api/runs/${second.run_id}`));
  });
});

function mockApi(overrides: { getRun?: (url: string) => Promise<Response>; sessions?: DashboardSession[] } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/api/status")) return Response.json(apiRealFixtures.status);
      if (url.includes("/api/sessions")) {
        return Response.json(overrides.sessions ? { ...apiRealFixtures.sessions, data: { sessions: overrides.sessions } } : apiRealFixtures.sessions);
      }
      if (url.includes("/artifacts/")) return Response.json(apiRealFixtures.artifactDetail);
      if (url.includes("/api/runs/")) return overrides.getRun ? overrides.getRun(url) : Response.json(apiRealFixtures.run);
      return Response.json({ error: { code: "not_found", message: "Missing" } }, { status: 404 });
    })
  );
}

function directCodexSession(runId: string, label: string): DashboardSession {
  const codexSessionId = runId.replace(/^codex-/, "");
  return {
    ...apiRealFixtures.sessions.data.sessions[0]!,
    run_id: runId,
    canonical_run_id: undefined,
    label,
    identity: {
      route_run_id: runId,
      codex_session_id: codexSessionId,
      codex_label: label,
      mapping_confidence: "one_to_one",
      mapping_source: "direct_session_id",
      limitations: []
    },
    caveats: []
  };
}
