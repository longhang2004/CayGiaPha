import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuidanceChecklist, resetDeferredGuidanceForVisit } from "./GuidanceChecklist";
import { GUIDANCE_REOPEN_EVENT, GUIDANCE_STORAGE_KEY } from "@/lib/guidance/storage";
import { getHelpExcerpt } from "@/content/help/helpTopics";
import { CORE_CHECKLIST } from "@/lib/guidance/checklist";

const base = { treeOpened: true, personCount: 2, primitiveCount: 0, addressInspected: false, viewpointChanged: false };

describe("GuidanceChecklist", () => {
  beforeEach(() => { localStorage.clear(); resetDeferredGuidanceForVisit(); });

  it("uses the reviewed copy for the five core onboarding steps", () => {
    expect(CORE_CHECKLIST).toHaveLength(5);
    expect(getHelpExcerpt("tao-hoac-mo-cay", "checklist", "owner")).toBe(
      "Chọn + Thêm cây để tạo cây mới, nhập mã mời hoặc mở cây đã có.",
    );
    expect(getHelpExcerpt("them-nguoi-dau-tien", "checklist", "owner")).toBe(
      "Chọn Thêm thành viên và bắt đầu với chính bạn hoặc một người thân.",
    );
    expect(getHelpExcerpt("them-nguoi-moi", "checklist", "owner")).toBe(
      "Chọn Thêm người mới, chọn người làm mốc rồi xác nhận quan hệ.",
    );
    expect(getHelpExcerpt("xem-thong-tin-va-xung-ho", "checklist", "owner")).toBe(
      "Chọn một người trên sơ đồ để mở thông tin và xem cách xưng hô.",
    );
    expect(getHelpExcerpt("doi-diem-nhin", "checklist", "owner")).toBe(
      "Chọn Đổi người xét để tính lại cách xưng hô theo một người khác.",
    );
    expect(CORE_CHECKLIST.find((item) => item.id === "core-viewpoint")?.title).toBe(
      "Thử đổi người xét",
    );
  });

  it("hides editor-only actions from readers", async () => {
    render(<GuidanceChecklist role="reader" productState={base} />);
    expect(await screen.findByText("Bắt đầu từng bước")).toBeInTheDocument();
    expect(screen.queryByText("Nối cha, mẹ, vợ/chồng hoặc con")).not.toBeInTheDocument();
  });

  it("collapses without deferring", async () => {
    render(<GuidanceChecklist role="owner" productState={base} />);
    fireEvent.click(await screen.findByRole("button", { name: "Thu gọn" }));
    expect(screen.getByText(/Bước tiếp theo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mở hướng dẫn" }));
    expect(screen.getByText("Bắt đầu từng bước")).toBeInTheDocument();
  });

  it("persists an explicit skip and manual reopen restores it", async () => {
    localStorage.setItem(
      GUIDANCE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 5,
        completed: [],
        dismissedTopicVersions: {},
        onboardingSkipped: false,
        workspaceCoach: { version: 2, chapters: { graph: "completed" } },
      }),
    );
    render(<GuidanceChecklist role="owner" productState={base} />);
    fireEvent.click(await screen.findByRole("button", { name: "Bỏ qua hướng dẫn" }));
    expect(screen.queryByText("Bắt đầu từng bước")).not.toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(GUIDANCE_STORAGE_KEY) ?? "{}");
    expect(stored.onboardingSkipped).toBe(true);
    expect(stored.workspaceCoach).toEqual({
      version: 2,
      chapters: { graph: "completed", overview: "skipped" },
    });
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
