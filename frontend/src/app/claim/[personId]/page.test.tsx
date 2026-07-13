import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  session: { user: null as null | { identifier: string }, loading: false },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/app/providers", () => ({ useSession: () => mocks.session }));
vi.mock("@/components/claim/ClaimFlow", () => ({
  ClaimFlow: ({ onClaimed }: { onClaimed: (result: { treeId: string }) => void }) => (
    <button onClick={() => onClaimed({ treeId: "t1" })}>Mock claim</button>
  ),
}));

import ClaimPage from "./page";

describe("ClaimPage", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.session = { user: null, loading: false };
  });

  it("requires sign-in and preserves the claim return path", async () => {
    render(<ClaimPage params={{ personId: "p1" }} />);

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/signin?redirect=%2Fclaim%2Fp1&reason=claim",
      ),
    );
  });

  it("opens the correct tree after successful verification", () => {
    mocks.session = { user: { identifier: "user@example.test" }, loading: false };
    render(<ClaimPage params={{ personId: "p1" }} />);

    expect(screen.getByRole("heading", { name: "Xác nhận đây là tôi" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mock claim" }));
    expect(mocks.push).toHaveBeenCalledWith("/tree/t1");
  });
});
