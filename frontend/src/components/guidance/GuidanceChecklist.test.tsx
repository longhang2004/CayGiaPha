import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { GuidanceChecklist } from "./GuidanceChecklist";
import { GUIDANCE_STORAGE_KEY } from "@/lib/guidance/storage";
const base = { treeOpened: true, personCount: 2, primitiveCount: 0, addressInspected: false, viewpointChanged: false };
describe("GuidanceChecklist", () => {
  beforeEach(() => localStorage.clear());
  it("hides editor-only actions from readers", async () => { render(<GuidanceChecklist role="reader" productState={base} />); expect(await screen.findByText("Bắt đầu từng bước")).toBeInTheDocument(); expect(screen.queryByText("Nối một quan hệ gần")).not.toBeInTheDocument(); });
  it("keeps dismiss and completion separate", async () => { render(<GuidanceChecklist role="owner" productState={base} />); fireEvent.click(await screen.findByRole("button", { name: "Để sau" })); expect(screen.getByText(/Bước tiếp theo/)).toBeInTheDocument(); const stored = localStorage.getItem(GUIDANCE_STORAGE_KEY) ?? ""; expect(stored).toContain('"skipped":true'); expect(stored).not.toContain('"core-inspect-address"'); });
  it("derives completion from confirmed product state", async () => { render(<GuidanceChecklist role="owner" productState={{ ...base, primitiveCount: 1, addressInspected: true }} />); await waitFor(() => expect(localStorage.getItem(GUIDANCE_STORAGE_KEY)).toContain("core-inspect-address")); });
});
