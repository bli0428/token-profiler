import { afterEach, describe, expect, it, vi } from "vitest";
import { createDashboardApiClient } from "../api/client";
import { DashboardClientError } from "../api/errors";
import { apiRealFixtures } from "../../test/helpers/contract-fixtures";

describe("dashboard API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and version-checks successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(apiRealFixtures.status)));
    await expect(createDashboardApiClient("http://api.test").getStatus()).resolves.toEqual(apiRealFixtures.status);
    expect(fetch).toHaveBeenCalledWith("http://api.test/api/status", { headers: { accept: "application/json" } });
  });

  it("uses same-origin API paths by default", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(apiRealFixtures.status)));
    await expect(createDashboardApiClient().getStatus()).resolves.toEqual(apiRealFixtures.status);
    expect(fetch).toHaveBeenCalledWith("/api/status", { headers: { accept: "application/json" } });
  });

  it("normalizes structured API errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "not_found", message: "Missing" }, { status: 404 })));
    await expect(createDashboardApiClient("http://api.test").getRun("missing")).rejects.toMatchObject({
      kind: "not-found",
      code: "not_found",
      status: 404
    });
  });

  it("normalizes offline failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("failed"))));
    await expect(createDashboardApiClient("http://api.test").getStatus()).rejects.toBeInstanceOf(DashboardClientError);
    await expect(createDashboardApiClient("http://api.test").getStatus()).rejects.toMatchObject({ kind: "offline" });
  });

  it("rejects unsupported schema versions", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ schema_version: 2, generated_at: "now", data: {}, caveats: [] })));
    await expect(createDashboardApiClient("http://api.test").getStatus()).rejects.toMatchObject({ kind: "version-mismatch" });
  });
});
