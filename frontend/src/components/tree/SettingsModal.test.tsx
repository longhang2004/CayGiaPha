import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsModal } from "./SettingsModal";
import { MockSessionProvider } from "@/lib/prototype/mockSession";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { TextSizeProvider } from "@/components/a11y/TextSizeProvider";

vi.mock("@/components/region/RegionSelector", () => ({
  RegionSelector: ({ region, onChange, isPrototype }: any) => (
    <div data-testid="region-selector">
      <span data-testid="region-value">{region}</span>
      <button data-testid="change-region" onClick={() => onChange?.("Nam")}>Change Region</button>
      {isPrototype && <span data-testid="is-prototype">prototype mode</span>}
    </div>
  )
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}));

describe("SettingsModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    treeId: "test-tree",
    isOwner: true,
    treeName: "My Tree",
    region: "Bac" as any,
    livingRedaction: true,
    sharing: "private",
    shareToken: null,
    showBirthYears: false,
    onTreeNameChange: vi.fn(),
    onRegionChange: vi.fn(),
    onLivingRedactionChange: vi.fn(),
    onSharingChange: vi.fn(),
    onShowBirthYearsChange: vi.fn(),
  };

  const renderModal = (props = {}, userOverrides: Record<string, unknown> = {}) => {
    return render(
      <MockSessionProvider
        user={{
          userId: "u1",
          identifier: "test@example.com",
          treeId: "test-tree",
          role: "user",
          verified: true,
          displayName: "Nguyễn Văn A",
          ...userOverrides,
        } as any}
      >
        <ToastProvider>
          <TextSizeProvider>
            <SettingsModal {...defaultProps} {...props} />
          </TextSizeProvider>
        </ToastProvider>
      </MockSessionProvider>
    );
  };

  it("passes isPrototype down to RegionSelector", () => {
    renderModal({ isPrototype: true });
    expect(screen.getByTestId("is-prototype")).toBeInTheDocument();
  });

  it("shows owner-only settings when isOwner is true", () => {
    renderModal({ isOwner: true });
    expect(screen.getByText("Tên cây gia phả")).toBeInTheDocument();
    expect(screen.getByText("Ẩn thông tin người còn sống")).toBeInTheDocument();
    expect(screen.getByText("Chế độ chia sẻ")).toBeInTheDocument();
  });

  it("hides owner-only settings when isOwner is false", () => {
    renderModal({ isOwner: false });
    expect(screen.queryByText("Tên cây gia phả")).not.toBeInTheDocument();
    expect(screen.queryByText("Ẩn thông tin người còn sống")).not.toBeInTheDocument();
    expect(screen.queryByText("Chế độ chia sẻ")).not.toBeInTheDocument();
  });

  it("uses mock signout when in prototype mode", () => {
    renderModal({ isPrototype: true });
    const signoutBtn = screen.getByRole("button", { name: "Đăng xuất" });
    fireEvent.click(signoutBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows displayName as primary and identifier as secondary", () => {
    renderModal({}, { displayName: "Nguyễn Văn A", identifier: "test@example.com" });
    expect(screen.getByText("Nguyễn Văn A")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("falls back to identifier when displayName is null", () => {
    renderModal({}, { displayName: null, identifier: "legacy@example.com" });
    const primary = document.querySelector(".account-identity__primary");
    expect(primary).toHaveTextContent("legacy@example.com");
  });
});
