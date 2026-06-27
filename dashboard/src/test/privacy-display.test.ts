import { describe, expect, it } from "vitest";
import type { PrivacyState } from "../api/types";
import { getPrivacyDisplay } from "../policy/privacy-display";

describe("privacy display policy", () => {
  it.each(["hidden", "unavailable", "preview"] satisfies PrivacyState[])(
    "does not allow raw content for %s",
    (state) => {
      expect(getPrivacyDisplay(state).canShowRawContent).toBe(false);
    }
  );

  it("allows raw content only for raw_available", () => {
    expect(getPrivacyDisplay("raw_available").canShowRawContent).toBe(true);
  });
});
