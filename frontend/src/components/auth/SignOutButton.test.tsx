import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const logout = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/providers", () => ({
  useSession: () => ({ logout }),
}));

import { SignOutButton } from "./SignOutButton";

afterEach(() => {
  vi.clearAllMocks();
});

describe("SignOutButton", () => {
  it("terminates the session and routes to the sign-in page", async () => {
    render(<SignOutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/signin");
  });
});
