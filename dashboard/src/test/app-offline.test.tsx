import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "../shell/DashboardShell";
import { emptySessionsFixture, versionMismatchFixture } from "../../test/fixtures/edge-fixtures";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("app readiness states", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("shows an offline retry state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    render(<DashboardShell />);
    expect(await screen.findByText("Dashboard API offline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows unsupported schema-version state before rendering sessions", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(versionMismatchFixture)));
    render(<DashboardShell />);
    expect(await screen.findByText("Dashboard API version mismatch")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard API fixture run")).not.toBeInTheDocument();
  });

  it("shows empty session state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.includes("/api/status") ? Response.json(apiRealFixtures.status) : Response.json(emptySessionsFixture)))
    );
    render(<DashboardShell />);
    expect(await screen.findByText("No sessions")).toBeInTheDocument();
  });

  it("selects session and loads run by run_id", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/status")) return Response.json(apiRealFixtures.status);
      if (url.includes("/api/sessions")) return Response.json(apiRealFixtures.sessions);
      if (url.includes("/api/runs/")) return Response.json(apiRealFixtures.run);
      return Response.json(apiRealFixtures.artifactDetail);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<DashboardShell />);
    const session = apiRealFixtures.sessions.data.sessions[0]!;
    await userEvent.click(await screen.findByText(session.label ?? session.run_id));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/runs/${session.run_id}`))).toBe(true);
    if (session.canonical_run_id) {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes(session.canonical_run_id!))).toBe(false);
    }
  });
});
