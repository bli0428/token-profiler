import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DashboardSession } from "../api/types";
import { SessionList } from "../sessions/SessionList";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("session list", () => {
  it("renders token totals and mapping limitations", () => {
    const session = apiRealFixtures.sessions.data.sessions[0]!;
    render(<SessionList sessions={[session]} selectedRunId={session.run_id} onSelect={() => undefined} />);

    expect(screen.getByText(session.label ?? session.run_id)).toBeInTheDocument();
    expect(screen.getByText("Cache-key fallback")).toBeInTheDocument();
    expect(screen.queryByText(`Codex: ${session.identity.codex_label}`)).not.toBeInTheDocument();
    expect(screen.queryByText("probable")).not.toBeInTheDocument();
    expect(screen.getByText("563,810")).toBeInTheDocument();
    expect(screen.getByText("424,832")).toBeInTheDocument();
    expect(screen.getByText("138,978")).toBeInTheDocument();
    expect(screen.queryByText(session.availability.status)).not.toBeInTheDocument();
    expect(screen.getByText(/Cache-key routes identify a stable local session/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /codex-cache-da1ec74b3a82b48a/ })).toHaveAttribute("aria-current", "true");
  });

  it("uses unavailable labels instead of zero for missing totals", () => {
    const session = {
      ...apiRealFixtures.sessions.data.sessions[0]!,
      input_tokens: undefined,
      cached_input_tokens: undefined,
      uncached_input_tokens: undefined,
      output_tokens: undefined
    };
    render(<SessionList sessions={[session]} onSelect={() => undefined} />);

    expect(screen.getAllByText("Unavailable").length).toBeGreaterThanOrEqual(4);
  });

  it("selects sessions by route run id", async () => {
    const session = apiRealFixtures.sessions.data.sessions[0]!;
    const onSelect = vi.fn();
    render(<SessionList sessions={[session]} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: new RegExp(session.run_id) }));
    expect(onSelect).toHaveBeenCalledWith(session.run_id);
  });

  it("labels direct Codex sessions without showing fallback limitations", () => {
    const session = directCodexSession("codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd2341", "Track prompt exposure");

    render(<SessionList sessions={[session]} selectedRunId={session.run_id} onSelect={() => undefined} />);

    expect(screen.getByText("Track prompt exposure")).toBeInTheDocument();
    expect(screen.getByText("Codex session")).toBeInTheDocument();
    expect(screen.queryByText(/Cache-key routes identify a stable local session/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Track prompt exposure/ })).toHaveAttribute("aria-current", "true");
  });

  it("keeps separate direct Codex rows selectable even when labels overlap", async () => {
    const first = directCodexSession("codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd2341", "Shared title");
    const second = directCodexSession("codex-019ef64d-7666-7ba3-a9d6-ac0fe4cd9999", "Shared title");
    const onSelect = vi.fn();

    render(<SessionList sessions={[first, second]} onSelect={onSelect} />);

    expect(screen.getAllByText("Codex session")).toHaveLength(2);
    const rows = screen.getAllByRole("button", { name: /Shared title/ });
    expect(rows).toHaveLength(2);

    await userEvent.click(rows[0]!);
    await userEvent.click(rows[1]!);

    expect(onSelect).toHaveBeenNthCalledWith(1, first.run_id);
    expect(onSelect).toHaveBeenNthCalledWith(2, second.run_id);
  });
});

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
