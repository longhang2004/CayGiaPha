import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GraphLegend } from "./GraphLegend";

describe("GraphLegend", () => {
  it("opens and closes through the CGP popover contract", async () => {
    const user = userEvent.setup();
    render(<GraphLegend />);

    const trigger = screen.getByRole("button", { name: "Hiện chú giải sơ đồ" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Chú giải sơ đồ" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đóng chú giải" }));
    expect(screen.queryByRole("dialog", { name: "Chú giải sơ đồ" })).not.toBeInTheDocument();
  });

  it("keeps the Chú giải label visible at every viewport size", () => {
    render(<GraphLegend />);

    const trigger = screen.getByRole("button", { name: "Hiện chú giải sơ đồ" });
    const label = screen.getByText("Chú giải");
    expect(trigger).toContainElement(label);
    expect(label).not.toHaveClass("hide-on-tablet");
    expect(label).not.toHaveClass("hide-on-mobile");
  });
});
