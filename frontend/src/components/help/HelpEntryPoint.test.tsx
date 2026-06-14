import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelpEntryPoint } from "./HelpEntryPoint";

/**
 * Help_System entry-point tests (Requirement 17.1).
 *
 * The entry point must provide access to the Help_System from the main
 * interface. We assert it renders a link to the `/help` route.
 */
describe("HelpEntryPoint", () => {
  it("renders an accessible link to the help route (17.1)", () => {
    render(<HelpEntryPoint />);
    const link = screen.getByRole("link", { name: "Trợ giúp" });
    expect(link).toHaveAttribute("href", "/help");
  });

  it("supports a custom label", () => {
    render(<HelpEntryPoint label="Help" />);
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute(
      "href",
      "/help",
    );
  });
});
