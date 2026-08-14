import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { jsonResponse, renderWithQueryClient } from "../test-utils";
import type { TodoResponse } from "../../shared/types";

const todo: TodoResponse = {
  id: 7,
  title: "削除対象タスク",
  description: null,
  status: "TODO",
  priority: null,
  dueDate: null,
  sortOrder: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeleteConfirmDialog", () => {
  // [代表値] 確認ボタン押下 → delete mutation が呼ばれる
  it("calls the delete mutation when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(undefined, 204));
    const onClose = vi.fn();

    renderWithQueryClient(
      <DeleteConfirmDialog
        todo={todo}
        onClose={onClose}
        onNotFound={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/todos/7", {
        method: "DELETE",
      });
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  // [代表値] 削除対象が既に存在しない場合は onNotFound を呼びダイアログを閉じる（AC-9）
  it("calls onNotFound and closes when the delete target no longer exists (404)", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: "Todo not found" }, 404));
    const onClose = vi.fn();
    const onNotFound = vi.fn();

    renderWithQueryClient(
      <DeleteConfirmDialog
        todo={todo}
        onClose={onClose}
        onNotFound={onNotFound}
      />,
    );

    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(onNotFound).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
  });

  // [代表値] キャンセル押下 → mutation は呼ばれずダイアログが閉じる
  it("does not call the mutation and closes when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithQueryClient(
      <DeleteConfirmDialog
        todo={todo}
        onClose={onClose}
        onNotFound={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
