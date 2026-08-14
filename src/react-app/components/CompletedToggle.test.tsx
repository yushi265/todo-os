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

    await user.click(screen.getByLabelText("終了済みを表示"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("reflects the checked prop", () => {
    render(<CompletedToggle checked={true} onChange={vi.fn()} />);

    expect(screen.getByLabelText("終了済みを表示")).toBeChecked();
  });
});
