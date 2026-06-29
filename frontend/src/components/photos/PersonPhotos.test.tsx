import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/apiClient";

vi.mock("@/lib/photos", () => ({
  listPhotos: vi.fn(),
  uploadPhoto: vi.fn(),
  setPrimaryPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  photoUrl: (treeId: string, personId: string, photoId: string) =>
    `/api/v1/persons/${personId}/photos/${photoId}?treeId=${treeId}`,
}));

import {
  deletePhoto,
  listPhotos,
  setPrimaryPhoto,
  uploadPhoto,
  type Photo,
} from "@/lib/photos";
import { PersonPhotos } from "./PersonPhotos";

const photo = (over: Partial<Photo> = {}): Photo => ({
  id: "p1",
  personId: "person1",
  contentType: "image/jpeg",
  byteSize: 1000,
  width: 100,
  height: 100,
  primary: false,
  ...over,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PersonPhotos", () => {
  it("lists photos and marks the primary", async () => {
    vi.mocked(listPhotos).mockResolvedValue([
      photo({ id: "a", primary: true }),
      photo({ id: "b" }),
    ]);

    render(<PersonPhotos treeId="t1" personId="person1" />);

    await waitFor(() => expect(screen.getAllByTestId("photo-item")).toHaveLength(2));
    expect(screen.getByTestId("primary-badge")).toBeInTheDocument();
  });

  it("read-only viewer sees no upload or edit controls", async () => {
    vi.mocked(listPhotos).mockResolvedValue([photo({ id: "a", primary: true })]);

    render(<PersonPhotos treeId="t1" personId="person1" canEdit={false} />);

    await waitFor(() => expect(screen.getByTestId("photo-item")).toBeInTheDocument());
    expect(screen.queryByLabelText(/Tải ảnh lên/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xóa" })).not.toBeInTheDocument();
  });

  it("uploads a chosen file and refreshes", async () => {
    vi.mocked(listPhotos)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([photo({ id: "new" })]);
    vi.mocked(uploadPhoto).mockResolvedValue(photo({ id: "new" }));

    render(<PersonPhotos treeId="t1" personId="person1" canEdit />);
    await screen.findByText("Chưa có ảnh nào.");

    const file = new File(["bytes"], "face.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/Tải ảnh lên/), file);

    const year = new Date(file.lastModified).getFullYear();
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận tải lên" }));

    expect(uploadPhoto).toHaveBeenCalledWith("t1", "person1", file, year, undefined);
    await waitFor(() => expect(screen.getByTestId("photo-item")).toBeInTheDocument());
  });

  it("sets a non-primary photo as primary", async () => {
    vi.mocked(listPhotos)
      .mockResolvedValueOnce([photo({ id: "a", primary: true }), photo({ id: "b" })])
      .mockResolvedValueOnce([photo({ id: "a" }), photo({ id: "b", primary: true })]);
    vi.mocked(setPrimaryPhoto).mockResolvedValue(photo({ id: "b", primary: true }));

    render(<PersonPhotos treeId="t1" personId="person1" canEdit />);
    await waitFor(() => expect(screen.getAllByTestId("photo-item")).toHaveLength(2));

    await userEvent.click(
      screen.getByRole("button", { name: "Đặt làm ảnh đại diện" }),
    );

    expect(setPrimaryPhoto).toHaveBeenCalledWith("t1", "person1", "b");
  });

  it("deletes a photo", async () => {
    vi.mocked(listPhotos)
      .mockResolvedValueOnce([photo({ id: "a", primary: true })])
      .mockResolvedValueOnce([]);
    vi.mocked(deletePhoto).mockResolvedValue(undefined);

    render(<PersonPhotos treeId="t1" personId="person1" canEdit />);
    await waitFor(() => expect(screen.getByTestId("photo-item")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Xóa" }));

    expect(deletePhoto).toHaveBeenCalledWith("t1", "person1", "a");
  });

  it("surfaces an upload error from the envelope", async () => {
    vi.mocked(listPhotos).mockResolvedValue([]);
    vi.mocked(uploadPhoto).mockRejectedValue(
      new ApiError(400, {
        code: "VALIDATION_ERROR",
        field: "file",
        message: "Unsupported image type; only JPEG and PNG are accepted.",
      }),
    );

    render(<PersonPhotos treeId="t1" personId="person1" canEdit />);
    await screen.findByText("Chưa có ảnh nào.");

    const file = new File(["x"], "bad.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText(/Tải ảnh lên/), file);

    await userEvent.click(screen.getByRole("button", { name: "Xác nhận tải lên" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unsupported image type; only JPEG and PNG are accepted.",
    );
  });
});
