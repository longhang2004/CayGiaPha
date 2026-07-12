import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  Text,
} from "react-aria-components";
import { describe, expect, it, vi } from "vitest";

describe("React Aria interaction kernel compatibility", () => {
  it("documents that the raw button filters aria-busy so the CGP wrapper must restore it", () => {
    render(<Button aria-busy="true">Lưu</Button>);
    expect(screen.getByRole("button", { name: "Lưu" })).not.toHaveAttribute(
      "aria-busy",
    );
  });

  it("server-renders and hydrates a React Aria control without recoverable errors", async () => {
    const onPress = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const markup = renderToString(<Button aria-label="Mở menu">Menu</Button>);
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    const recoverableErrors: unknown[] = [];

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(
        container,
        <Button aria-label="Mở menu" onPress={onPress}>
          Menu
        </Button>,
        { onRecoverableError: (error) => recoverableErrors.push(error) },
      );
    });

    fireEvent.click(container.querySelector("button")!);
    expect(recoverableErrors).toEqual([]);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(
      consoleError.mock.calls.some(([message]) =>
        /hydration|did not match|server html/i.test(String(message)),
      ),
    ).toBe(false);

    await act(async () => root?.unmount());
    container.remove();
    consoleError.mockRestore();
  });

  it("associates a Vietnamese label, description, and validation error with its input", async () => {
    const { container } = render(
      <TextField isInvalid>
        <Label>Số điện thoại</Label>
        <Input />
        <Text slot="description">Dùng số điện thoại Việt Nam.</Text>
        <FieldError>Số điện thoại không hợp lệ.</FieldError>
      </TextField>,
    );

    const input = screen.getByRole("textbox", { name: "Số điện thoại" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Dùng số điện thoại Việt Nam. Số điện thoại không hợp lệ.",
    );
    const results = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag412"] },
      elementRef: false,
    });
    expect(results.violations).toEqual([]);
  });
});
