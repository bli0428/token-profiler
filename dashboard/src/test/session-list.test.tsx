import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionList } from "../sessions/SessionList";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("session list", () => {
  it("renders token totals, Codex identity, and mapping limitations", () => {
    const session = apiRealFixtures.sessions.data.sessions[0]!;
    render(<SessionList sessions={[session]} selectedRunId={session.run_id} onSelect={() => undefined} />);

    expect(screen.getByText(session.label ?? session.run_id)).toBeInTheDocument();
    expect(screen.getByText(`Codex: ${session.identity.codex_label}`)).toBeInTheDocument();
    expect(screen.getByText("probable")).toBeInTheDocument();
    expect(screen.getByText("563,810")).toBeInTheDocument();
    expect(screen.getByText("424,832")).toBeInTheDocument();
    expect(screen.getByText("138,978")).toBeInTheDocument();
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
});
