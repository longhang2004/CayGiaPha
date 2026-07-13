import { describe, expect, it, vi } from "vitest";
import { handleApiRoute } from "./routeHelper";

describe("handleApiRoute", () => {
  it("never exposes an unexpected server error message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await handleApiRoute(async () => {
      throw new Error("database password and private details");
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
      },
    });
  });
});
