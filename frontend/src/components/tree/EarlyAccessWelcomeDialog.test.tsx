import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cookies from "@/lib/cookies";
import {
  EARLY_ACCESS_WELCOME_COOKIE,
  EARLY_ACCESS_WELCOME_COOKIE_VALUE,
  EarlyAccessWelcomeDialog,
} from "./EarlyAccessWelcomeDialog";

const TITLE =
  "Chào mừng bạn đến với phiên bản truy cập sớm của Cây Gia Phả!";

function expireAcknowledgementCookie() {
  document.cookie = `${EARLY_ACCESS_WELCOME_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe("EarlyAccessWelcomeDialog", () => {
  beforeEach(() => {
    expireAcknowledgementCookie();
    vi.restoreAllMocks();
  });

  it("opens after hydration when the acknowledgement cookie is absent", async () => {
    render(<EarlyAccessWelcomeDialog />);

    const dialog = await screen.findByRole("dialog", { name: TITLE });
    expect(dialog).toHaveTextContent(
      "Trong giai đoạn truy cập sớm, toàn bộ tính năng hiện có được mở miễn phí",
    );
    expect(screen.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/feedback",
    );
    expect(
      screen.getByRole("link", { name: "một vài ly cà phê" }),
    ).toHaveAttribute("href", "/support");
    expect(
      screen.getByRole("button", { name: "Tôi đã hiểu" }),
    ).toBeInTheDocument();
  });

  it("stays hidden when the acknowledgement cookie has the expected value", async () => {
    cookies.setCookie(
      EARLY_ACCESS_WELCOME_COOKIE,
      EARLY_ACCESS_WELCOME_COOKIE_VALUE,
    );

    render(<EarlyAccessWelcomeDialog />);

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument(),
    );
  });

  it("acknowledges and closes from the footer button", async () => {
    render(<EarlyAccessWelcomeDialog />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Tôi đã hiểu" }),
    );

    expect(cookies.getCookie(EARLY_ACCESS_WELCOME_COOKIE)).toBe(
      EARLY_ACCESS_WELCOME_COOKIE_VALUE,
    );
    expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument();
  });

  it("acknowledges and closes from the visible close control", async () => {
    render(<EarlyAccessWelcomeDialog />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Đóng cửa sổ" }),
    );

    expect(cookies.getCookie(EARLY_ACCESS_WELCOME_COOKIE)).toBe(
      EARLY_ACCESS_WELCOME_COOKIE_VALUE,
    );
    expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument();
  });

  it("acknowledges and closes with Escape", async () => {
    render(<EarlyAccessWelcomeDialog />);
    await screen.findByRole("dialog", { name: TITLE });

    await userEvent.keyboard("{Escape}");

    expect(cookies.getCookie(EARLY_ACCESS_WELCOME_COOKIE)).toBe(
      EARLY_ACCESS_WELCOME_COOKIE_VALUE,
    );
    expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument();
  });

  it("acknowledges and closes from an outside press", async () => {
    render(<EarlyAccessWelcomeDialog />);
    await screen.findByRole("dialog", { name: TITLE });

    await userEvent.click(document.body);

    expect(cookies.getCookie(EARLY_ACCESS_WELCOME_COOKIE)).toBe(
      EARLY_ACCESS_WELCOME_COOKIE_VALUE,
    );
    expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument();
  });

  it.each([
    ["Feedback", "/feedback"],
    ["một vài ly cà phê", "/support"],
  ])("acknowledges before following the %s link", async (name, href) => {
    render(<EarlyAccessWelcomeDialog />);

    const link = await screen.findByRole("link", { name });
    expect(link).toHaveAttribute("href", href);
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);

    expect(cookies.getCookie(EARLY_ACCESS_WELCOME_COOKIE)).toBe(
      EARLY_ACCESS_WELCOME_COOKIE_VALUE,
    );
    expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument();
  });

  it("still closes for the current session when browser cookies are blocked", async () => {
    vi.spyOn(cookies, "setCookie").mockImplementation(() => {
      throw new Error("cookies blocked");
    });
    render(<EarlyAccessWelcomeDialog />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Tôi đã hiểu" }),
    );

    expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument();
  });

  it("supports a non-persistent forced-open state for prototypes", async () => {
    cookies.setCookie(
      EARLY_ACCESS_WELCOME_COOKIE,
      EARLY_ACCESS_WELCOME_COOKIE_VALUE,
    );
    const setCookie = vi.spyOn(cookies, "setCookie");

    render(
      <EarlyAccessWelcomeDialog
        forceOpen
        persistAcknowledgement={false}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Tôi đã hiểu" }),
    );
    expect(setCookie).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: TITLE })).not.toBeInTheDocument();
  });
});
