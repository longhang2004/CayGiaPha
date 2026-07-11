import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreeEntryModal, type TreeEntryResult } from "./TreeEntryModal";

const readyResult: TreeEntryResult = { kind: "ready", treeId: "tree-ready" };

function renderModal(overrides: Partial<React.ComponentProps<typeof TreeEntryModal>> = {}) {
  const props: React.ComponentProps<typeof TreeEntryModal> = {
    isOpen: true,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(readyResult),
    onJoin: vi.fn().mockResolvedValue(readyResult),
    onTreeReady: vi.fn(),
    ...overrides,
  };
  return { ...render(<TreeEntryModal {...props} />), props };
}

describe("TreeEntryModal", () => {
  it("starts with two clear choices and only reveals the selected form", async () => {
    renderModal();
    expect(screen.getByRole("heading", { name: "Thêm cây gia phả" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tạo cây mới/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tham gia bằng mã mời/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tên cây gia phả")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Tạo cây mới/ }));
    expect(screen.getByLabelText("Tên cây gia phả")).toHaveFocus();
    expect(screen.queryByLabelText("Mã mời 6 ký tự")).not.toBeInTheDocument();
  });

  it("resets transient state before a new modal visit", async () => {
    const props: React.ComponentProps<typeof TreeEntryModal> = {
      isOpen: true,
      onClose: vi.fn(),
      onCreate: vi.fn().mockResolvedValue(readyResult),
      onJoin: vi.fn().mockResolvedValue({ kind: "pending" }),
      onTreeReady: vi.fn(),
    };
    const { rerender } = render(<TreeEntryModal {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /Tham gia bằng mã mời/ }));
    await userEvent.type(screen.getByLabelText("Mã mời 6 ký tự"), "ABC123");
    await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu tham gia" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Đã gửi yêu cầu tham gia");

    rerender(<TreeEntryModal {...props} isOpen={false} />);
    rerender(<TreeEntryModal {...props} isOpen />);
    expect(await screen.findByRole("button", { name: /Tạo cây mới/ })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("returns to the chooser without submitting", async () => {
    const { props } = renderModal();
    await userEvent.click(screen.getByRole("button", { name: /Tham gia bằng mã mời/ }));
    await userEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByRole("button", { name: /Tạo cây mới/ })).toBeInTheDocument();
    expect(props.onJoin).not.toHaveBeenCalled();
  });

  it("trims a six-character invite code and shows pending without opening a tree", async () => {
    const onJoin = vi.fn().mockResolvedValue({ kind: "pending" } satisfies TreeEntryResult);
    const { props } = renderModal({ onJoin });
    await userEvent.click(screen.getByRole("button", { name: /Tham gia bằng mã mời/ }));
    const submit = screen.getByRole("button", { name: "Gửi yêu cầu tham gia" });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Mã mời 6 ký tự"), " Ab12c3 ");
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await waitFor(() => expect(onJoin).toHaveBeenCalledWith("Ab12c3"));
    expect(await screen.findByRole("status")).toHaveTextContent("Đã gửi yêu cầu tham gia");
    expect(props.onTreeReady).not.toHaveBeenCalled();
  });

  it("accepts only six alphanumeric invite-code characters", async () => {
    renderModal({ initialMode: "join" });
    const input = screen.getByLabelText("Mã mời 6 ký tự");
    await userEvent.type(input, "AB-123");
    expect(screen.getByRole("button", { name: "Gửi yêu cầu tham gia" })).toBeDisabled();
  });

  it("opens a tree only when the normalized result is ready", async () => {
    const { props } = renderModal({ initialMode: "join" });
    await userEvent.type(screen.getByLabelText("Mã mời 6 ký tự"), "ABC123");
    await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu tham gia" }));
    await waitFor(() => expect(props.onTreeReady).toHaveBeenCalledWith("tree-ready"));
  });

  it("keeps the join form open and associates API errors with the code field", async () => {
    const onJoin = vi.fn().mockRejectedValue(new Error("Mã mời đã hết hạn sử dụng."));
    renderModal({ onJoin, initialMode: "join" });
    const input = screen.getByLabelText("Mã mời 6 ký tự");
    await userEvent.type(input, "ABC123");
    await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu tham gia" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Mã mời đã hết hạn sử dụng.");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });

  it("prevents duplicate submissions while creating", async () => {
    let resolveCreate: (value: TreeEntryResult) => void = () => {};
    const onCreate = vi.fn(() => new Promise<TreeEntryResult>((resolve) => { resolveCreate = resolve; }));
    const { props } = renderModal({ onCreate, initialMode: "create" });
    await userEvent.type(screen.getByLabelText("Tên cây gia phả"), "Gia phả họ Nguyễn");
    const submit = screen.getByRole("button", { name: "Tạo cây gia phả" });
    await userEvent.click(submit);
    expect(screen.getByRole("button", { name: "Đang tạo…" })).toBeDisabled();
    expect(onCreate).toHaveBeenCalledTimes(1);
    resolveCreate(readyResult);
    await waitFor(() => expect(props.onTreeReady).toHaveBeenCalledWith("tree-ready"));
  });

  it("closes on Escape", () => {
    const { props } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
