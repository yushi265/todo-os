import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

afterEach(() => {
  cleanup();
});

describe("DeleteConfirmDialog", () => {
  // [代表値] AC-5: 削除確認ダイアログは画面幅に関係なく常に中央表示
  it("keeps the dialog centered at all viewport widths", () => {
    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "TODOを削除" });
    const overlay = dialog.parentElement;

    expect(overlay).toHaveAttribute(
      "class",
      "fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm",
    );
    expect(overlay).not.toHaveClass("items-end", "sm:items-center");
    expect(dialog).toHaveAttribute(
      "class",
      "w-full max-w-md animate-[modal-in_0.2s_ease-out] rounded-[22px] bg-card p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]",
    );
  });

  // [代表値] AC-5: 常時センタリングのためボトムシート用ドラッグハンドルは表示しない
  it("does not render a bottom-sheet drag handle", () => {
    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "TODOを削除" });

    expect(dialog.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  // [代表値] AC-9: 削除するボタンは太字
  it("renders the delete button with bold text", () => {
    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "削除する" })).toHaveClass(
      "font-bold",
    );
  });

  // [代表値] 本文メッセージはsm以上でコンパクトなフォントサイズになる
  it("uses a compact font size for the message at sm and wider", () => {
    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("削除しますか？")).toHaveClass(
      "text-sm",
      "sm:text-xs",
    );
  });

  // [代表値] title/message props がそのまま表示される（TODO削除・タグ削除どちらの呼び出しでも同じコンポーネントで正しく表示される）
  it.each([
    {
      caseName: "TODO削除からの呼び出し",
      title: "TODOを削除",
      message: "「買い物」を削除しますか？この操作は取り消せません。",
    },
    {
      caseName: "タグ削除からの呼び出し",
      title: "タグを削除",
      message:
        "「仕事」を削除しますか？このタグは全ての TODO から解除されます。",
    },
  ])(
    "renders the given title and message ($caseName)",
    ({ title, message }) => {
      render(
        <DeleteConfirmDialog
          title={title}
          message={message}
          onConfirm={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();
    },
  );

  // [代表値] 確認ボタン押下 → onConfirm が呼ばれる（閉じるかどうかは呼び出し側が決めるため onClose は呼ばれない）
  it("calls onConfirm without calling onClose when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // [代表値] キャンセル押下 → onClose が呼ばれ、onConfirm は呼ばれない
  it("calls onClose without calling onConfirm when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // [代表値] isPending 中は確認ボタンが無効化され、連打による多重送信を防ぐ
  it("disables the confirm button while isPending is true", () => {
    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        isPending={true}
      />,
    );

    expect(screen.getByRole("button", { name: "削除する" })).toBeDisabled();
  });

  // [境界値] isPending 省略時（デフォルト false）は確認ボタンが有効
  it("keeps the confirm button enabled when isPending is omitted", () => {
    render(
      <DeleteConfirmDialog
        title="TODOを削除"
        message="削除しますか？"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "削除する" })).toBeEnabled();
  });
});
