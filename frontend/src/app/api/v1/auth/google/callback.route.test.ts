import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as callback } from "./callback/route";
import { GET as login } from "./login/route";

describe("retired Google authorization-code flow", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it.each([
    ["login", login],
    ["callback", callback],
  ])("redirects the legacy %s route to the supported sign-in UI", async (_name, handler) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await handler();

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/signin");
    expect(location.searchParams.get("error")).toBe(
      "Vui lòng sử dụng nút Đăng nhập với Google trên trang đăng nhập.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
