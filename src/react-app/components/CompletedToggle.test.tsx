import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompletedToggle from "./CompletedToggle";

afterEach(() => {
  cleanup();
});

describe("CompletedToggle", () => {
  // [代表値] チェックボックス操作で onChange に反転した値が渡る（AC-7）
  it("calls onChange with the new checked value when toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<CompletedToggle checked={false} onChange={onChange} />);

    await user.click(screen.getByLabelText("完了・キャンセル済みを表示"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("reflects the checked prop", () => {
    render(<CompletedToggle checked={true} onChange={vi.fn()} />);

    expect(screen.getByLabelText("完了・キャンセル済みを表示")).toBeChecked();
  });

  it("renders the switch before the label text", () => {
    render(<CompletedToggle checked={false} onChange={vi.fn()} />);

    const checkbox = screen.getByRole("checkbox");
    const label = checkbox.closest("label");

    expect(label).not.toBeNull();
    expect(label?.firstElementChild).toContainElement(checkbox);
    expect(label?.lastChild?.textContent?.trim()).toBe(
      "完了・キャンセル済みを表示",
    );
  });

  it("uses compact label text at sm and preserves the switch dimensions", () => {
    render(<CompletedToggle checked={false} onChange={vi.fn()} />);

    const label = screen.getByRole("checkbox").closest("label");
    expect(label).not.toBeNull();
    if (!label) return;

    expect(label).toHaveClass("text-sm", "sm:text-xs");

    const tapTarget = label.firstElementChild;
    expect(tapTarget).not.toBeNull();
    if (!tapTarget) return;

    const track = tapTarget.firstElementChild;
    expect(track).toHaveClass("h-[22px]", "w-[38px]");
    if (!track) return;

    const knob = track.lastElementChild;
    expect(knob).not.toBeNull();
    if (!knob) return;

    expect(knob).toHaveClass("h-[18px]", "w-[18px]");
  });
});
