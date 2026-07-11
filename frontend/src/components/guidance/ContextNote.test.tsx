import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ContextNote } from "./ContextNote";
describe("ContextNote", () => {
  beforeEach(() => localStorage.clear());
  it("uses canonical content and can be dismissed without completing work", async () => { render(<ContextNote topicId="dieu-huong-so-do" role="reader" />); expect(await screen.findByText("Di chuyển và tìm người trên sơ đồ")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Đã hiểu" })); expect(screen.queryByText("Di chuyển và tìm người trên sơ đồ")).not.toBeInTheDocument(); });
  it("does not reveal an owner-only topic to readers", () => { render(<ContextNote topicId="chon-vung-mien" role="reader" />); expect(screen.queryByRole("complementary")).not.toBeInTheDocument(); });
});
