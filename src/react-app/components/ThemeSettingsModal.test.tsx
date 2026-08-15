import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ThemeSettingsModal from "./ThemeSettingsModal";

afterEach(() => {
  cleanup();
});

describe("ThemeSettingsModal", () => {
  it("shows the available themes and notifies when one is selected", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();

    render(
      <ThemeSettingsModal
        theme="default"
        onThemeChange={onThemeChange}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "テーマ設定" });
    expect(dialog).toHaveClass("animate-[modal-in_0.2s_ease-out]");
    expect(screen.getByRole("radio", { name: "標準" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "海" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "森" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "夕焼け" })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "ラベンダー" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "モノトーン" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "海" }));

    expect(onThemeChange).toHaveBeenCalledWith("ocean");

    await user.click(screen.getByRole("radio", { name: "モノトーン" }));

    expect(onThemeChange).toHaveBeenCalledWith("monochrome");
  });

  it("closes through the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <ThemeSettingsModal
        theme="default"
        onThemeChange={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
