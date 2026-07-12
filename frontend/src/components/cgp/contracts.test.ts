import { describe, expect, it } from "vitest";
import {
  CGP_COMPONENT_CONTRACT_VERSION,
  CGP_OVERLAY_ROOT_ID,
  CGP_TOAST_KERNEL_STATUS,
} from "./contracts";

describe("CGP component-system contracts", () => {
  it("exposes a versioned ownership boundary and one application overlay root", () => {
    expect(CGP_COMPONENT_CONTRACT_VERSION).toBe("phase-0-v1");
    expect(CGP_OVERLAY_ROOT_ID).toBe("cgp-overlay-root");
  });

  it("records that the installed React Aria toast API is not a stable kernel contract", () => {
    expect(CGP_TOAST_KERNEL_STATUS).toBe("cgp-owned-until-rac-stable");
  });
});
