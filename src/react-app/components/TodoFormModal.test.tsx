import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TodoFormModal from "./TodoFormModal";
import { jsonResponse, renderWithQueryClient } from "../test-utils";
import type { TagResponse, TodoResponse } from "../../shared/types";

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
    tags: [],
    ...overrides,
  };
}

function makeTag(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: 1,
    name: "タグ1",
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

/**
 * TodoFormModal は TagMultiSelect を内包し、レンダリング時に必ず GET /api/tags も呼ぶ。
 * URL で振り分け、/api/tags は指定の tags を、それ以外（/api/todos 系）は指定のレスポンスを返す。
 */
function mockFetch(makeTodoResponse: () => Response, tags: TagResponse[] = []) {
  fetchMock.mockImplementation((url: string) => {
    if (url === "/api/tags") {
      return Promise.resolve(jsonResponse(tags));
    }
    return Promise.resolve(makeTodoResponse());
  });
}

describe("TodoFormModal", () => {
  // [代表値] タイトル入力＋送信 → 作成 mutation が呼ばれる
  it("calls the create mutation when title is filled and submitted", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(makeTodo({ title: "新規タスク" }), 201));

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
            tagIds: [],
          }),
        }),
      );
    });
  });

  // [境界値] タイトル空文字で送信 → クライアント側バリデーションでエラー表示、mutation は呼ばれない
  it("shows a validation error and does not call the mutation when title is empty", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(null, 200));

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
    expect(fetchMock).not.toHaveBeenCalledWith("/api/todos", expect.anything());
  });

  // [代表値] 編集モードでの送信は update mutation を呼ぶ（AC-5）
  it("calls the update mutation when submitted in edit mode", async () => {
    const user = userEvent.setup();
    const todo = makeTodo();
    mockFetch(() => jsonResponse(todo, 200));

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
    mockFetch(() => jsonResponse(null, 200));

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
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/todos/42",
      expect.anything(),
    );
  });

  // [代表値] 更新対象が既に存在しない場合は onNotFound を呼びモーダルを閉じる（AC-9）
  it("calls onNotFound and closes when the update target no longer exists (404)", async () => {
    const user = userEvent.setup();
    const todo = makeTodo();
    mockFetch(() => jsonResponse({ error: "Todo not found" }, 404));
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
    mockFetch(() => jsonResponse(todo, 200));

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

  // [代表値] TagMultiSelect で選択したタグが送信時に tagIds として渡る
  it("includes the selected tag ids as tagIds when submitted", async () => {
    const user = userEvent.setup();
    const tag = makeTag({ id: 5, name: "仕事" });
    mockFetch(
      () => jsonResponse(makeTodo({ title: "新規タスク" }), 201),
      [tag],
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
    await user.click(await screen.findByRole("button", { name: "仕事" }));
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
            tagIds: [5],
          }),
        }),
      );
    });
  });

  // [代表値] 編集モードで開くと、TODO に既に付与されているタグが選択済み状態で初期表示される
  it("pre-selects the todo's existing tags when opened in edit mode", async () => {
    const tag = makeTag({ id: 5, name: "仕事" });
    const todo = makeTodo({ tags: [tag] });
    mockFetch(() => jsonResponse(todo, 200), [tag]);

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: "仕事" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  // [デシジョンテーブル] 編集モードで status !== "DONE" の間は「✓ 完了にする」ボタンが表示される（AC-4）
  it.each([
    { status: "TODO" },
    { status: "IN_PROGRESS" },
    { status: "CANCELED" },
  ] as const)(
    "shows the complete-now button in edit mode when status is $status",
    ({ status }) => {
      const todo = makeTodo({ status });
      mockFetch(() => jsonResponse(todo, 200));

      renderWithQueryClient(
        <TodoFormModal
          isEdit={true}
          todo={todo}
          onClose={vi.fn()}
          onNotFound={vi.fn()}
        />,
      );

      expect(
        screen.getByRole("button", { name: "✓ 完了にする" }),
      ).toBeInTheDocument();
    },
  );

  // [デシジョンテーブル] 編集モードで status === "DONE" の時は「✓ 完了にする」ボタンが表示されない（AC-4）
  it("does not show the complete-now button in edit mode when status is DONE", () => {
    const todo = makeTodo({ status: "DONE" });
    mockFetch(() => jsonResponse(todo, 200));

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "✓ 完了にする" }),
    ).not.toBeInTheDocument();
  });

  // [代表値] 「✓ 完了にする」ボタンをクリックするとステータスセレクトが DONE になり、
  // 送信 mutation（PATCH）はまだ呼ばれない（AC-4）
  it("sets the status select to DONE without submitting when the complete-now button is clicked", async () => {
    const user = userEvent.setup();
    const todo = makeTodo({ status: "TODO" });
    mockFetch(() => jsonResponse(todo, 200));

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "✓ 完了にする" }));

    expect(screen.getByLabelText("ステータス")).toHaveValue("DONE");
    expect(
      screen.queryByRole("button", { name: "✓ 完了にする" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/todos/42",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  // [代表値] 「✓ 完了にする」ボタン押下後にフォームを送信すると、PATCH body に
  // status: "DONE" が含まれる（AC-4 のレイヤー内結合。index.md テスト戦略表の担保対象）
  it("submits the PATCH with status DONE after clicking the complete-now button then saving", async () => {
    const user = userEvent.setup();
    const todo = makeTodo({ status: "TODO" });
    mockFetch(() => jsonResponse({ ...todo, status: "DONE" }, 200));

    renderWithQueryClient(
      <TodoFormModal
        isEdit={true}
        todo={todo}
        onClose={vi.fn()}
        onNotFound={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "✓ 完了にする" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/todos/42",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/todos/42" &&
        (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    const body = JSON.parse((patchCall?.[1] as RequestInit).body as string);
    expect(body.status).toBe("DONE");
  });
});
