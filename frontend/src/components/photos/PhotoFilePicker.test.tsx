import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoFilePicker } from "./PhotoFilePicker";

const jpeg = () => new File(["jpeg-bytes"], "chan-dung.jpg", { type: "image/jpeg" });
const png = () => new File(["png-bytes"], "chan-dung.png", { type: "image/png" });

function Picker({
  value = null,
  onChange = vi.fn(),
  disabled = false,
}: {
  value?: File | null;
  onChange?: (file: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <PhotoFilePicker
      id="portrait"
      value={value}
      onChange={onChange}
      label="Ảnh đại diện (tùy chọn)"
      hint="JPEG hoặc PNG, tối đa 5 MiB."
      disabled={disabled}
    />
  );
}

describe("PhotoFilePicker", () => {
  const createObjectURL = vi.fn(() => "blob:portrait");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps an accessible native input and accepts JPEG or PNG from the file chooser", async () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);

    const input = screen.getByLabelText("Ảnh đại diện (tùy chọn)");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png");

    await userEvent.tab();
    expect(input).toHaveFocus();

    const file = jpeg();
    await userEvent.upload(input, file);
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("accepts a PNG dropped on the picker", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);

    const file = png();
    fireEvent.drop(screen.getByTestId("photo-file-dropzone"), {
      dataTransfer: { files: [file] },
    });

    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("rejects unsupported files without passing them to the form", async () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);

    const file = new File(["gif"], "anh-dong.gif", { type: "image/gif" });
    await userEvent.upload(screen.getByLabelText("Ảnh đại diện (tùy chọn)"), file, {
      applyAccept: false,
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Chỉ nhận ảnh JPEG hoặc PNG.");
  });

  it("rejects files larger than 5 MiB", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);

    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "qua-lon.png", {
      type: "image/png",
    });
    fireEvent.drop(screen.getByTestId("photo-file-dropzone"), {
      dataTransfer: { files: [file] },
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Ảnh không được lớn hơn 5 MiB.");
  });

  it("previews the selected file and supports replacing or removing it", async () => {
    const file = png();
    const onChange = vi.fn();
    render(<Picker value={file} onChange={onChange} />);

    expect(screen.getByRole("img", { name: "Xem trước chan-dung.png" })).toHaveAttribute(
      "src",
      "blob:portrait",
    );
    expect(screen.getByText("chan-dung.png")).toBeInTheDocument();
    expect(screen.getByText("Đổi ảnh")).toHaveAttribute("for", "portrait");

    await userEvent.click(screen.getByRole("button", { name: "Bỏ ảnh" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("revokes previews when the file changes and when the picker unmounts", () => {
    const first = jpeg();
    const second = png();
    const { rerender, unmount } = render(<Picker value={first} />);

    rerender(<Picker value={second} />);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:portrait");

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("does not accept clicks or drops while disabled", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} disabled />);

    const input = screen.getByLabelText("Ảnh đại diện (tùy chọn)");
    expect(input).toBeDisabled();
    fireEvent.drop(screen.getByTestId("photo-file-dropzone"), {
      dataTransfer: { files: [png()] },
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
