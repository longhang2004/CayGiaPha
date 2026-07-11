import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuidanceChecklist, resetDeferredGuidanceForVisit } from "./GuidanceChecklist";
import { GUIDANCE_REOPEN_EVENT, GUIDANCE_STORAGE_KEY } from "@/lib/guidance/storage";

const base = { treeOpened: true, personCount: 2, primitiveCount: 0, addressInspected: false, viewpointChanged: false };

describe("GuidanceChecklist", () => {
  beforeEach(() => { localStorage.clear(); resetDeferredGuidanceForVisit(); });

  it("hides editor-only actions from readers", async () => {
    render(<GuidanceChecklist role="reader" productState={base} />);
    expect(await screen.findByText("Bắt đầu từng bước")).toBeInTheDocument();
    expect(screen.queryByText("Nối một quan hệ gần")).not.toBeInTheDocument();
  });

  it("collapses without deferring", async () => {
    render(<GuidanceChecklist role="owner" productState={base} />);
    fireEvent.click(await screen.findByRole("button", { name: "Thu gọn hướng dẫn" }));
    expect(screen.getByText(/Bước tiếp theo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mở hướng dẫn" }));
    expect(screen.getByText("Bắt đầu từng bước")).toBeInTheDocument();
  });

  it("defers only in session memory and manual reopen restores it", async () => {
    render(<GuidanceChecklist role="owner" productState={base} />);
    fireEvent.click(await screen.findByRole("button", { name: "Để sau" }));
    expect(screen.queryByText("Bắt đầu từng bước")).not.toBeInTheDocument();
    expect(localStorage.getItem(GUIDANCE_STORAGE_KEY) ?? "").not.toContain("deferred");
    act(() => window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT)));
    expect(await screen.findByText("Bắt đầu từng bước")).toBeInTheDocument();
  });

  it("derives completion from confirmed product state", async () => {
    render(<GuidanceChecklist role="owner" productState={{ ...base, primitiveCount: 1, addressInspected: true }} />);
    await waitFor(() => expect(localStorage.getItem(GUIDANCE_STORAGE_KEY)).toContain("core-inspect-address"));
  });

  it("announces a newly completed checklist then retires", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<GuidanceChecklist role="reader" productState={base} />);
    rerender(<GuidanceChecklist role="reader" productState={{ ...base, addressInspected: true, viewpointChanged: true }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Bạn đã hoàn thành các bước bắt đầu.");
    act(() => vi.advanceTimersByTime(1900));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("offers a manual tour without completing the item", async () => {
    const onShowTour = vi.fn();
    render(<GuidanceChecklist role="owner" productState={base} onShowTour={onShowTour} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Chỉ tôi" }))[0]);
    expect(onShowTour).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(GUIDANCE_STORAGE_KEY) ?? "").not.toContain("core-inspect-address");
  });
});
