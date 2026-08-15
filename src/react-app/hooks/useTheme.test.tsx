import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTheme } from "./useTheme";

function ThemeHarness() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <output>{theme}</output>
      <button type="button" onClick={() => setTheme("ocean")}>
        海テーマ
      </button>
      <button type="button" onClick={() => setTheme("monochrome")}>
        モノトーンテーマ
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("useTheme", () => {
  it("applies the default theme and persists a newly selected theme", async () => {
    const user = userEvent.setup();
    render(<ThemeHarness />);

    expect(await screen.findByText("default")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "default");

    await user.click(screen.getByRole("button", { name: "海テーマ" }));

    expect(screen.getByText("ocean")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "ocean");
    expect(localStorage.getItem("todo-os-theme")).toBe("ocean");
  });

  it("restores a valid stored theme", async () => {
    localStorage.setItem("todo-os-theme", "forest");

    render(<ThemeHarness />);

    expect(await screen.findByText("forest")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "forest");
  });

  it("supports the monochrome theme", async () => {
    const user = userEvent.setup();
    render(<ThemeHarness />);

    await user.click(screen.getByRole("button", { name: "モノトーンテーマ" }));

    expect(screen.getByText("monochrome")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "monochrome",
    );
    expect(localStorage.getItem("todo-os-theme")).toBe("monochrome");
  });

  it("falls back to the default theme for an unknown stored value", async () => {
    localStorage.setItem("todo-os-theme", "unknown");

    render(<ThemeHarness />);

    expect(await screen.findByText("default")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "default");
  });
});
