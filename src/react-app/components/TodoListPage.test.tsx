import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
    tags: [],
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
  // [代表値] AC-3: モバイル用 FAB と sm 以上用ヘッダーボタンをレスポンシブクラスで排他表示する
  it("uses a mobile FAB and keeps the header add button for sm and wider", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(<TodoListPage />);

    const fab = await screen.findByRole("button", { name: "TODOを追加" });
    const headerButton = screen.getByRole("button", { name: "+ 追加" });

    expect(fab).toHaveClass(
      "fixed",
      "bottom-6",
      "right-6",
      "rounded-full",
      "font-bold",
      "sm:hidden",
    );
    expect(headerButton).toHaveClass("hidden", "sm:inline-block", "font-bold");
  });

  // [代表値] AC-1: ヘッダーに色付きロゴアイコンを表示する
  it("renders the colored logo icon in the header", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(<TodoListPage />);

    const logo = (screen.getByRole("banner") as HTMLElement).querySelector(
      'span[aria-hidden="true"].bg-primary',
    );

    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass(
      "inline-block",
      "h-3",
      "w-3",
      "shrink-0",
      "rounded",
      "bg-primary",
    );
  });

  // [代表値] AC-1: 表示中の TODO/IN_PROGRESS の件数をヘッダーに表示する
  it("shows the remaining count for displayed active todos", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        makeTodo({ id: 1, status: "TODO" }),
        makeTodo({ id: 2, status: "IN_PROGRESS" }),
        makeTodo({ id: 3, status: "DONE" }),
        makeTodo({ id: 4, status: "CANCELED" }),
      ]),
    );

    renderWithQueryClient(<TodoListPage />);

    expect(await screen.findByText("残り2件")).toBeInTheDocument();
  });

  // [境界値] AC-1: 表示中にアクティブ TODO がない場合は0件と表示する
  it("shows zero remaining todos when displayed todos are all inactive", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        makeTodo({ id: 1, status: "DONE" }),
        makeTodo({ id: 2, status: "CANCELED" }),
      ]),
    );

    renderWithQueryClient(<TodoListPage />);

    expect(await screen.findByText("残り0件")).toBeInTheDocument();
  });

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

  // [代表値] AC-8/AC-9: 空状態の作成ボタンをPC向けに限定し、太字にする
  it("shows the empty-state add button only from sm and makes it bold", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(<TodoListPage />);

    const emptyStateButton = await screen.findByRole("button", {
      name: "+ 最初の TODO を追加",
    });

    expect(emptyStateButton).toHaveClass(
      "hidden",
      "sm:inline-block",
      "font-bold",
    );
    expect(emptyStateButton.parentElement).toHaveClass("px-5");
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

  // [代表値] 確認ボタン押下で delete mutation が呼ばれ、ダイアログが閉じる
  it("deletes the todo and closes the dialog when the confirm button is clicked", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse(undefined, 204));
      }
      return Promise.resolve(
        jsonResponse([makeTodo({ id: 9, title: "削除対象タスク" })]),
      );
    });
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(await screen.findByLabelText("「削除対象タスク」を削除"));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/todos/9", {
        method: "DELETE",
      });
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "TODOを削除" }),
      ).not.toBeInTheDocument();
    });
  });

  // [代表値] 削除対象が既に存在しない場合はトースト表示＋一覧再取得（AC-9と同型の異常系）
  it("shows a toast and refetches when the delete target no longer exists (404)", async () => {
    let todosFetchCount = 0;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse({ error: "Todo not found" }, 404));
      }
      todosFetchCount += 1;
      return Promise.resolve(
        jsonResponse([makeTodo({ id: 9, title: "削除対象タスク" })]),
      );
    });
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(await screen.findByLabelText("「削除対象タスク」を削除"));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(
      await screen.findByText("対象の TODO が見つかりませんでした"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "TODOを削除" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(todosFetchCount).toBeGreaterThanOrEqual(2);
    });
  });

  // [代表値] 「タグ管理」ボタンをクリックするとタグ管理モーダルが開く（AC-8への導線）
  it("opens the tag management modal when the tag management button is clicked", async () => {
    // TodoListPage 自身の一覧取得（/api/todos）と、開いた TagManagementModal 内の
    // タグ取得（/api/tags）の両方がこのモックにヒットするが、どちらも空配列で問題ない。
    fetchMock.mockResolvedValue(jsonResponse([]));
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    const tagManagementButton = await screen.findByRole("button", {
      name: "タグ管理",
    });
    expect(tagManagementButton).toHaveClass("text-sm");

    await user.click(tagManagementButton);

    expect(
      screen.getByRole("dialog", { name: "タグ管理" }),
    ).toBeInTheDocument();
  });

  // [代表値] TODO のステータスバッジをクリックすると PATCH が次のステータスで呼ばれる（AC-2）
  it("calls PATCH with the next status when the status badge on a TODO item is clicked", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(
          jsonResponse(
            makeTodo({ id: 9, title: "進行対象", status: "IN_PROGRESS" }),
            200,
          ),
        );
      }
      return Promise.resolve(
        jsonResponse([makeTodo({ id: 9, title: "進行対象", status: "TODO" })]),
      );
    });
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(
      await screen.findByRole("button", {
        name: "「進行対象」を「進行中」に変更",
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/todos/9",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        }),
      );
    });
  });

  // [代表値] IN_PROGRESS → DONE の進行では成功後に完了トーストが表示される（AC-3）
  it("shows a completion toast after advancing an IN_PROGRESS todo to DONE", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(
          jsonResponse(
            makeTodo({ id: 9, title: "完了対象", status: "DONE" }),
            200,
          ),
        );
      }
      return Promise.resolve(
        jsonResponse([
          makeTodo({ id: 9, title: "完了対象", status: "IN_PROGRESS" }),
        ]),
      );
    });
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(
      await screen.findByRole("button", {
        name: "「完了対象」を「完了」に変更",
      }),
    );

    expect(
      await screen.findByText("「完了対象」を完了にしました"),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass(
      "bottom-24",
      "sm:bottom-4",
      "animate-[toast-in_0.18s_ease-out]",
      "shadow-[0_12px_36px_rgba(0,0,0,0.32)]",
    );
  });

  // [代表値] TODO → IN_PROGRESS の進行ではトーストが表示されない（AC-3）
  it("does not show a toast when advancing a TODO item to IN_PROGRESS", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(
          jsonResponse(
            makeTodo({ id: 9, title: "進行対象2", status: "IN_PROGRESS" }),
            200,
          ),
        );
      }
      return Promise.resolve(
        jsonResponse([makeTodo({ id: 9, title: "進行対象2", status: "TODO" })]),
      );
    });
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(
      await screen.findByRole("button", {
        name: "「進行対象2」を「進行中」に変更",
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/todos/9",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    expect(screen.queryByText(/を完了にしました/)).not.toBeInTheDocument();
  });

  // [代表値] ステータス進行 PATCH が 404 → トースト表示＋一覧再取得（既存の 404 分岐パターンに準拠）
  it("shows a toast and refetches when the status-advance target no longer exists (404)", async () => {
    let todosFetchCount = 0;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ error: "Todo not found" }, 404));
      }
      todosFetchCount += 1;
      return Promise.resolve(
        jsonResponse([makeTodo({ id: 9, title: "消滅対象", status: "TODO" })]),
      );
    });
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(
      await screen.findByRole("button", {
        name: "「消滅対象」を「進行中」に変更",
      }),
    );

    expect(
      await screen.findByText("対象の TODO が見つかりませんでした"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(todosFetchCount).toBeGreaterThanOrEqual(2);
    });
  });

  // [代表値] ステータス進行 PATCH がその他エラー（5xx）→ 汎用エラートースト表示、
  // ステータス表示は変更前のまま（ui.md 異常系挙動表・楽観的更新をしていないため自然にロールバック）
  it("shows a generic error toast when the status-advance PATCH fails with a server error", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(
          jsonResponse({ error: "Internal server error" }, 500),
        );
      }
      return Promise.resolve(
        jsonResponse([
          makeTodo({ id: 9, title: "対象タスク", status: "TODO" }),
        ]),
      );
    });
    const user = userEvent.setup();

    renderWithQueryClient(<TodoListPage />);
    await user.click(
      await screen.findByRole("button", {
        name: "「対象タスク」を「進行中」に変更",
      }),
    );

    expect(
      await screen.findByText("時間をおいて再度お試しください"),
    ).toBeInTheDocument();
    // 楽観的更新をしていないため、失敗後もステータスバッジは変更前（TODO→進行中への変更ラベル）のまま
    expect(
      screen.getByRole("button", { name: "「対象タスク」を「進行中」に変更" }),
    ).toBeInTheDocument();
  });

  // [代表値] sortBy=manual のドラッグ&ドロップで、フィルター対象外の位置を維持した
  // 全件 ID 配列を PATCH へ送信する（AC-4, AC-6）
  it("reorders visible todos and sends the merged full ID order", async () => {
    const allTodos = [
      makeTodo({ id: 1, title: "A" }),
      makeTodo({ id: 2, title: "B" }),
      makeTodo({ id: 3, title: "C" }),
      makeTodo({ id: 4, title: "D" }),
    ];
    const visibleTodos = [allTodos[0], allTodos[2]];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(jsonResponse(undefined, 204));
      }
      if (url === "/api/tags") return Promise.resolve(jsonResponse([]));
      if (url === "/api/todos") return Promise.resolve(jsonResponse(allTodos));
      return Promise.resolve(jsonResponse(visibleTodos));
    });

    renderWithQueryClient(<TodoListPage />);

    const sourceItem = await screen.findByTestId("todo-item-1");
    const targetItem = screen.getByTestId("todo-item-3");
    const sourceHandle = within(sourceItem).getByRole("button", {
      name: "ドラッグして並び替え",
    });
    expect(sourceHandle).toHaveAttribute("draggable", "true");

    fireEvent.dragStart(sourceHandle);
    fireEvent.dragOver(targetItem);
    fireEvent.drop(targetItem);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/todos/reorder",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ todoIds: [3, 2, 1, 4] }),
        }),
      );
    });

    expect(
      screen
        .getAllByTestId(/^todo-item-/)
        .map((item) => item.getAttribute("data-testid")),
    ).toEqual(["todo-item-3", "todo-item-1"]);
  });

  // [デシジョンテーブル] manual 以外の各ソートではハンドルを非活性にする（AC-5）
  it.each(["dueDate", "priority", "createdAt", "updatedAt"] as const)(
    "disables drag handles when sortBy=%s",
    async (sortBy) => {
      fetchMock.mockImplementation((url: string) =>
        Promise.resolve(
          url === "/api/tags"
            ? jsonResponse([])
            : jsonResponse([makeTodo({ title: "対象タスク" })]),
        ),
      );
      const user = userEvent.setup();

      renderWithQueryClient(<TodoListPage />);
      await user.selectOptions(await screen.findByLabelText("並び順"), sortBy);

      await waitFor(() => {
        expect(
          within(screen.getByTestId("todo-item-1")).getByRole("button", {
            name: "ドラッグして並び替え",
          }),
        ).toHaveAttribute("draggable", "false");
      });
    },
  );

  // [代表値] 並び替え API が失敗した場合は楽観的な順序を元に戻し、エラー通知を表示する（AC-7）
  it("rolls back the optimistic order and shows a toast when reorder fails", async () => {
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(
          jsonResponse({ error: "Internal server error" }, 500),
        );
      }
      if (url === "/api/tags") return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse(todos));
    });

    renderWithQueryClient(<TodoListPage />);

    const sourceItem = await screen.findByTestId("todo-item-1");
    const targetItem = screen.getByTestId("todo-item-2");
    fireEvent.dragStart(
      within(sourceItem).getByRole("button", {
        name: "ドラッグして並び替え",
      }),
    );
    fireEvent.dragOver(targetItem);
    fireEvent.drop(targetItem);

    expect(
      await screen.findByText("時間をおいて再度お試しください"),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId(/^todo-item-/)
        .map((item) => item.getAttribute("data-testid")),
    ).toEqual(["todo-item-1", "todo-item-2"]);
  });
});
