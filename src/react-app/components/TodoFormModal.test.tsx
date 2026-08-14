import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TodoFormModal from "./TodoFormModal";
import { jsonResponse, renderWithQueryClient } from "../test-utils";
import type { TodoResponse } from "../../shared/types";

function makeTodo(overrides: Partial<TodoResponse> = {}): TodoResponse {
  return {
    id: 42,
    title: "既存タイトル",
    description: "既存の説明",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: "2026-09-01",
    sortOrder: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TodoFormModal", () => {
  // [代表値] タイトル入力＋送信 → 作成 mutation が呼ばれる
  it("calls the create mutation when title is filled and submitted", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(makeTodo({ title: "新規タスク" }), 201),
    );

    renderWithQueryClient(
      <TodoFormModal
        isEdit={false}
        todo={null}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("タイトル"), "新規タスク");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/todos",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "新規タスク",
            description: null,
            priority: null,
            dueDate: null,
          }),
        }),
      );
    });
  });

  // [境界値] タイトル空文字で送信 → クライアント側バリデーションでエラー表示、mutation は呼ばれない
  it("shows a validation error and does not call the mutation when title is empty", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <TodoFormModal
        isEdit={false}
        todo={null}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("タイトルは1〜200文字で入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // [代表値] 編集モードでの送信は update mutation を呼ぶ（AC-5）
  it("calls the update mutation when submitted in edit mode", async () => {
    const user = userEvent.setup();
    const todo = makeTodo();
    fetchMock.mockResolvedValue(jsonResponse(todo, 200));

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/todos/42",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  // [代表値] 編集モードでもタイトルを空にすると更新できない（AC-8）
  it("shows a validation error and does not call the update mutation when title is cleared in edit mode", async () => {
    const user = userEvent.setup();
    const todo = makeTodo();

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText("タイトル"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("タイトルは1〜200文字で入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // [代表値] 更新対象が既に存在しない場合は onNotFound を呼びモーダルを閉じる（AC-9）
  it("calls onNotFound and closes when the update target no longer exists (404)", async () => {
    const user = userEvent.setup();
    const todo = makeTodo();
    fetchMock.mockResolvedValue(jsonResponse({ error: "Todo not found" }, 404));
    const onClose = vi.fn();
    const onNotFound = vi.fn();

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={onClose}
        onNotFound={onNotFound}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onNotFound).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
  });

  // [代表値] 編集モードで開くと既存値がフォームに初期表示される
  it("pre-fills the form with the existing todo values in edit mode", () => {
    const todo = makeTodo();

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("タイトル")).toHaveValue(todo.title);
    expect(screen.getByLabelText("説明")).toHaveValue(todo.description);
    expect(screen.getByLabelText("優先度")).toHaveValue(todo.priority);
    expect(screen.getByLabelText("期限")).toHaveValue(todo.dueDate);
    expect(screen.getByLabelText("ステータス")).toHaveValue(todo.status);
  });
});
