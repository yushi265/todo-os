import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import TodoListPage from "./TodoListPage";
import { jsonResponse, renderWithQueryClient } from "../test-utils";
import type { TodoResponse } from "../../shared/types";

function makeTodo(overrides: Partial<TodoResponse> = {}): TodoResponse {
  return {
    id: 1,
    title: "サンプルタスク",
    description: null,
    status: "TODO",
    priority: null,
    dueDate: null,
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

describe("TodoListPage", () => {
  it("shows a loading indicator while the initial fetch is in flight", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // 未解決のまま

    renderWithQueryClient(<TodoListPage />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  // [代表値] 一覧が空配列 → 空状態メッセージを表示
  it("shows an empty state message when the list is empty", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(<TodoListPage />);

    expect(
      await screen.findByText("TODO はまだありません"),
    ).toBeInTheDocument();
  });

  // [代表値] 取得エラー → エラーメッセージ + 再試行ボタンを表示
  it("shows an error message and a retry button when the fetch fails", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Internal server error" }, 500),
    );

    renderWithQueryClient(<TodoListPage />);

    expect(
      await screen.findByText("TODO の取得に失敗しました"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });

  // [代表値] 取得成功時に一覧が表示される（正常系の配線確認）
  it("renders the fetched todos on success", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([makeTodo({ title: "配線確認タスク" })]),
    );

    renderWithQueryClient(<TodoListPage />);

    expect(await screen.findByText("配線確認タスク")).toBeInTheDocument();
  });

  // [代表値] 一覧の行をクリックすると、その TODO の値で編集モーダルが開く
  it("opens the edit modal with the clicked todo's values", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([makeTodo({ title: "編集対象タスク" })]),
    );
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(await screen.findByText("編集対象タスク"));

    expect(
      screen.getByRole("dialog", { name: "TODOを編集" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("編集対象タスク")).toBeInTheDocument();
  });

  // [代表値] 削除ボタンをクリックすると、その TODO の確認ダイアログが開く
  it("opens the delete confirm dialog for the clicked todo", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([makeTodo({ title: "削除対象タスク" })]),
    );
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(await screen.findByLabelText("「削除対象タスク」を削除"));

    expect(
      screen.getByRole("dialog", { name: "TODOを削除" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "「削除対象タスク」を削除しますか？この操作は取り消せません。",
      ),
    ).toBeInTheDocument();
  });
});
