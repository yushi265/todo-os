import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Button from "./button";

afterEach(() => {
  cleanup();
});

describe("Button", () => {
  it.each([
    ["default", "bg-primary"],
    ["outline", "border-border"],
    ["ghost", "hover:bg-surface"],
    ["destructive", "bg-danger"],
  ] as const)("maps the %s variant to the project style", (variant, style) => {
    render(<Button variant={variant}>操作</Button>);

    expect(screen.getByRole("button", { name: "操作" })).toHaveClass(style);
  });

  it("keeps native button props and the minimum touch target", () => {
    render(
      <Button size="icon" disabled aria-label="設定">
        ⚙
      </Button>,
    );

    const button = screen.getByRole("button", { name: "設定" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveClass("min-h-11", "min-w-11");
  });

  it.each([
    [
      "default",
      ["px-4", "py-2", "text-sm", "sm:px-3", "sm:py-1.5", "sm:text-xs"],
    ],
    ["sm", ["px-3", "py-1", "text-sm", "sm:px-2.5", "sm:text-xs"]],
    ["lg", ["px-6", "py-3", "text-sm", "sm:px-4", "sm:py-2", "sm:text-xs"]],
  ] as const)(
    "adds compact classes for the %s size at sm and above",
    (size, classes) => {
      render(<Button size={size}>操作</Button>);

      expect(screen.getByRole("button", { name: "操作" })).toHaveClass(
        ...classes,
      );
    },
  );

  it("keeps icon size padding unchanged without sm padding classes", () => {
    render(
      <Button size="icon" aria-label="設定">
        ⚙
      </Button>,
    );

    const button = screen.getByRole("button", { name: "設定" });
    expect(button).toHaveClass("min-h-11", "min-w-11", "rounded-xl", "p-2");
    expect(button.className).not.toMatch(/\bsm:(?:p|px|py)-/);
  });
});
