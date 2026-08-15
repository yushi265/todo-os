import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import TodoList from "./TodoList";
import type { TodoResponse } from "../../shared/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function makeTodo(overrides: Partial<TodoResponse>): TodoResponse {
  return {
    id: 1,
    title: "サンプル",
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

function mockElementFromPoint(element: Element | null) {
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    writable: true,
    value: () => null,
  });
  return vi.spyOn(document, "elementFromPoint").mockReturnValue(element);
}

describe("TodoList", () => {
  // [代表値] TODO一覧の行間はsm以上でコンパクトになる
  it("applies a compact responsive gap to the list", () => {
    render(
      <TodoList
        todos={[makeTodo({ id: 1, title: "一覧間隔確認" })]}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(screen.getByRole("list")).toHaveClass("gap-3", "sm:gap-2");
  });

  // [代表値] 終了済みトグル OFF で DONE/CANCELED の TODO が一覧に表示されない
  it("hides DONE/CANCELED todos when showCompleted is false", () => {
    const todos = [
      makeTodo({ id: 1, title: "未完了タスク", status: "TODO" }),
      makeTodo({ id: 2, title: "完了タスク", status: "DONE" }),
      makeTodo({ id: 3, title: "中止タスク", status: "CANCELED" }),
    ];

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.queryByText("完了タスク")).not.toBeInTheDocument();
    expect(screen.queryByText("中止タスク")).not.toBeInTheDocument();
  });

  // [代表値] 終了済みトグル ON で全ステータスの TODO が表示される
  it("shows all statuses when showCompleted is true", () => {
    const todos = [
      makeTodo({ id: 1, title: "未完了タスク", status: "TODO" }),
      makeTodo({ id: 2, title: "完了タスク", status: "DONE" }),
      makeTodo({ id: 3, title: "中止タスク", status: "CANCELED" }),
    ];

    render(
      <TodoList
        todos={todos}
        showCompleted={true}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
    expect(screen.getByText("中止タスク")).toBeInTheDocument();
  });

  // [代表値] DONE/CANCELEDは一覧の末尾に固定し、並び替え対象から除外する
  it("keeps completed cards at the bottom and excludes them from reordering", () => {
    const todos = [
      makeTodo({ id: 1, title: "未完了", status: "TODO" }),
      makeTodo({ id: 2, title: "完了", status: "DONE" }),
      makeTodo({ id: 3, title: "中止", status: "CANCELED" }),
      makeTodo({ id: 4, title: "進行中", status: "IN_PROGRESS" }),
    ];
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={todos}
        showCompleted
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled
        onReorder={onReorder}
      />,
    );

    expect(
      screen
        .getAllByTestId(/^todo-item-/)
        .map((item) => item.getAttribute("data-testid")),
    ).toEqual(["todo-item-1", "todo-item-4", "todo-item-2", "todo-item-3"]);

    const openCard = screen.getByTestId("todo-item-1");
    const completedCard = screen.getByTestId("todo-item-2");
    const canceledCard = screen.getByTestId("todo-item-3");
    expect(openCard).toHaveAttribute("draggable", "true");
    expect(completedCard).toHaveAttribute("draggable", "false");
    expect(canceledCard).toHaveAttribute("draggable", "false");
    fireEvent.dragStart(completedCard);
    fireEvent.dragOver(openCard);
    fireEvent.drop(openCard);

    expect(onReorder).not.toHaveBeenCalled();
  });

  // [代表値] カード本体からドラッグを開始できる
  it("starts a drag from the card itself", () => {
    const todos = [
      makeTodo({ id: 1, title: "カード全体" }),
      makeTodo({ id: 2, title: "移動先" }),
    ];
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled
        onReorder={onReorder}
      />,
    );

    const sourceCard = screen.getByTestId("todo-item-1");
    const targetCard = screen.getByTestId("todo-item-2");
    expect(sourceCard).toHaveAttribute("draggable", "true");
    fireEvent.dragStart(sourceCard);
    expect(sourceCard).toHaveClass(
      "-translate-y-1",
      "scale-[1.02]",
      "shadow-[0_12px_24px_rgba(0,0,0,0.16)]",
    );
    fireEvent.dragOver(targetCard);
    fireEvent.drop(targetCard);

    expect(onReorder).toHaveBeenCalledWith([2, 1]);
    expect(sourceCard).not.toHaveClass(
      "-translate-y-1",
      "scale-[1.02]",
      "shadow-[0_12px_24px_rgba(0,0,0,0.16)]",
    );
  });

  // [状態遷移] キーボードでもカードを選択・移動・確定できる
  it("supports keyboard reordering with Space and arrow keys", async () => {
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled
        onReorder={onReorder}
      />,
    );

    const sourceCard = screen.getByTestId("todo-item-1");
    fireEvent.keyDown(sourceCard, { key: " " });
    await waitFor(() => {
      expect(sourceCard).toHaveAttribute("aria-grabbed", "true");
    });
    expect(sourceCard).toHaveClass(
      "-translate-y-1",
      "scale-[1.02]",
      "shadow-[0_12px_24px_rgba(0,0,0,0.16)]",
    );
    fireEvent.keyDown(sourceCard, { key: "ArrowDown" });
    fireEvent.keyDown(sourceCard, { key: " " });

    expect(onReorder).toHaveBeenCalledWith([2, 1]);
    expect(sourceCard).toHaveAttribute("aria-grabbed", "false");
    expect(sourceCard).not.toHaveClass(
      "-translate-y-1",
      "scale-[1.02]",
      "shadow-[0_12px_24px_rgba(0,0,0,0.16)]",
    );
  });

  // [代表値] 期限切れの TODO は絵文字マーカーで視覚的に判別できる（AC-4）
  it("marks an overdue todo visually", () => {
    const overdueTodo = makeTodo({
      id: 1,
      title: "対象タスク",
      status: "TODO",
      dueDate: "2000-01-01",
    });

    render(
      <TodoList
        todos={[overdueTodo]}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "期限切れ" })).toBeInTheDocument();
  });

  // [デシジョンテーブル] 未完了（TODO/IN_PROGRESS）は TodoListItem（ステータス進行 UI あり）で描画される
  it("renders open todos with a status-advance affordance and no strikethrough", () => {
    const todos = [makeTodo({ id: 1, title: "未完了タスク", status: "TODO" })];

    render(
      <TodoList
        todos={todos}
        showCompleted={true}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "「未完了タスク」を「進行中」に変更",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("未完了タスク")).not.toHaveClass("line-through");
  });

  // [デシジョンテーブル] 完了・キャンセル済み（DONE/CANCELED）は CompletedTodoListItem
  // （取り消し線・ステータス進行 UI なし）で描画される
  it.each([{ status: "DONE" }, { status: "CANCELED" }] as const)(
    "renders $status todos with a strikethrough title and no status-advance affordance",
    ({ status }) => {
      const todos = [makeTodo({ id: 2, title: "完了系タスク", status })];

      render(
        <TodoList
          todos={todos}
          showCompleted={true}
          onItemClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />,
      );

      expect(screen.getByText("完了系タスク")).toHaveClass("line-through");
      expect(
        screen.queryByRole("button", { name: /に変更/ }),
      ).not.toBeInTheDocument();
    },
  );

  // [代表値] 未完了 TODO のステータスアイコンをクリックすると onAdvanceStatus(todo) が呼ばれる
  it("wires onAdvanceStatus into the open todo item", async () => {
    const todo = makeTodo({ id: 4, title: "対象", status: "TODO" });
    const onAdvanceStatus = vi.fn();
    const user = userEvent.setup();

    render(
      <TodoList
        todos={[todo]}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={onAdvanceStatus}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "「対象」を「進行中」に変更" }),
    );

    expect(onAdvanceStatus).toHaveBeenCalledWith(todo);
  });

  // [境界値] ドラッグが無効な場合はドラッグシーケンスを発火しても並び替えない
  it("does not reorder when dragging is disabled", () => {
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={false}
        onReorder={onReorder}
      />,
    );

    const sourceItem = screen.getByTestId("todo-item-1");
    const targetItem = screen.getByTestId("todo-item-2");
    fireEvent.dragStart(sourceItem);
    fireEvent.dragOver(targetItem);
    fireEvent.drop(targetItem);

    expect(onReorder).not.toHaveBeenCalled();
  });

  // [境界値] ドラッグ元とドロップ先が同じ TODO の場合は並び替えない
  it("does not reorder when dropping a todo onto itself", () => {
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
        onReorder={onReorder}
      />,
    );

    const sourceItem = screen.getByTestId("todo-item-1");
    fireEvent.dragStart(sourceItem);
    fireEvent.dragOver(sourceItem);
    fireEvent.drop(sourceItem);

    expect(onReorder).not.toHaveBeenCalled();
  });

  // [状態遷移] ドロップせずにドラッグを終了した後も、次のドラッグは正常に開始できる
  it("resets drag state when a drag ends without a drop", () => {
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
        onReorder={onReorder}
      />,
    );

    const sourceItem = screen.getByTestId("todo-item-1");
    const targetItem = screen.getByTestId("todo-item-2");
    const sourceHandle = sourceItem;

    fireEvent.dragStart(sourceHandle);
    fireEvent.dragOver(targetItem);
    fireEvent.dragEnd(sourceHandle);
    fireEvent.drop(targetItem);
    expect(onReorder).not.toHaveBeenCalled();

    fireEvent.dragStart(sourceHandle);
    fireEvent.dragOver(targetItem);
    fireEvent.drop(targetItem);

    expect(onReorder).toHaveBeenCalledWith([2, 1]);
  });

  // [代表値] 500ms長押し後のtouchmoveで対象行がハイライトされ、touchendで並び替える
  it("reorders todos after a long press and touch drag", () => {
    vi.useFakeTimers();
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    const onReorder = vi.fn();
    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
        onReorder={onReorder}
      />,
    );
    const targetRow = screen.getByTestId("todo-item-2");
    const sourceHandle = screen.getByText("先頭");
    mockElementFromPoint(targetRow);

    fireEvent.touchStart(sourceHandle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 20, clientY: 20 }],
    });

    expect(targetRow).toHaveClass("border-chip-border", "bg-chip-bg");

    fireEvent.touchEnd(sourceHandle);

    expect(onReorder).toHaveBeenCalledWith([2, 1]);
  });

  // [異常系] 長押し後に指を離しただけでは、タップによる編集を発火しない
  it("does not open a card after a long press without a drop", () => {
    vi.useFakeTimers();
    const onItemClick = vi.fn();
    render(
      <TodoList
        todos={[makeTodo({ id: 1, title: "長押し対象" })]}
        showCompleted={false}
        onItemClick={onItemClick}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
      />,
    );

    const title = screen.getByText("長押し対象");
    const card = screen.getByTestId("todo-item-1");
    fireEvent.touchStart(title, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.touchEnd(title);
    fireEvent.click(card);

    expect(onItemClick).not.toHaveBeenCalled();
  });

  // [異常系] 長押しドラッグ中に一覧外へ移動して指を離しても、直前の行で確定しない
  it("does not reorder when the finger leaves the todo rows", () => {
    vi.useFakeTimers();
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    const onReorder = vi.fn();
    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
        onReorder={onReorder}
      />,
    );
    const sourceHandle = screen.getByTestId("todo-item-1");
    const targetRow = screen.getByTestId("todo-item-2");
    const elementFromPoint = mockElementFromPoint(targetRow);

    fireEvent.touchStart(sourceHandle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 20, clientY: 20 }],
    });
    elementFromPoint.mockReturnValueOnce(null);
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 40, clientY: 40 }],
    });
    fireEvent.touchEnd(sourceHandle);

    expect(targetRow).not.toHaveClass("border-chip-border", "bg-chip-bg");
    expect(onReorder).not.toHaveBeenCalled();
  });

  // [異常系] touchcancel では長押しタイマーとドラッグ状態を破棄する
  it("resets touch drag state when the touch is cancelled", () => {
    vi.useFakeTimers();
    const todo = makeTodo({ id: 1, title: "対象" });
    const onReorder = vi.fn();
    render(
      <TodoList
        todos={[todo]}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
        onReorder={onReorder}
      />,
    );
    const handle = screen.getByTestId("todo-item-1");
    const elementFromPoint = mockElementFromPoint(null);

    fireEvent.touchStart(handle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchCancel(handle);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.touchMove(handle, {
      touches: [{ clientX: 20, clientY: 20 }],
    });

    expect(elementFromPoint).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
  });

  // [境界値] 長押し成立前に10pxを超えて移動するとタイマーがキャンセルされる
  it("cancels a long press when the finger moves more than 10px", () => {
    vi.useFakeTimers();
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
        onReorder={onReorder}
      />,
    );
    const sourceRow = screen.getByTestId("todo-item-1");
    const sourceHandle = sourceRow;
    const elementFromPoint = mockElementFromPoint(
      screen.getByTestId("todo-item-2"),
    );

    fireEvent.touchStart(sourceHandle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 11, clientY: 0 }],
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.touchEnd(sourceHandle);

    expect(elementFromPoint).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
  });

  // [境界値] 10px未満の移動では長押しタイマーが継続する
  it("keeps the long press timer for movement under 10px", () => {
    vi.useFakeTimers();
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
      />,
    );
    const sourceRow = screen.getByTestId("todo-item-1");
    const targetRow = screen.getByTestId("todo-item-2");
    const sourceHandle = sourceRow;
    const elementFromPoint = mockElementFromPoint(targetRow);

    fireEvent.touchStart(sourceHandle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 9, clientY: 0 }],
    });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(elementFromPoint).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 20, clientY: 20 }],
    });

    expect(elementFromPoint).toHaveBeenCalledWith(20, 20);
    expect(targetRow).toHaveClass("border-chip-border", "bg-chip-bg");
    fireEvent.touchEnd(sourceHandle);
  });

  // [境界値] 10pxちょうどの移動では長押しタイマーが継続する
  it("keeps the long press timer for movement of exactly 10px", () => {
    vi.useFakeTimers();
    const todos = [
      makeTodo({ id: 1, title: "先頭" }),
      makeTodo({ id: 2, title: "後続" }),
    ];

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={true}
      />,
    );
    const sourceRow = screen.getByTestId("todo-item-1");
    const targetRow = screen.getByTestId("todo-item-2");
    const sourceHandle = sourceRow;
    const elementFromPoint = mockElementFromPoint(targetRow);

    fireEvent.touchStart(sourceHandle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 10, clientY: 0 }],
    });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(elementFromPoint).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    fireEvent.touchMove(sourceHandle, {
      touches: [{ clientX: 20, clientY: 20 }],
    });

    expect(elementFromPoint).toHaveBeenCalledWith(20, 20);
    expect(targetRow).toHaveClass("border-chip-border", "bg-chip-bg");
    fireEvent.touchEnd(sourceHandle);
  });

  // [デシジョンテーブル] dragEnabled=falseではタッチ長押しも開始しない
  it("does not start touch dragging when dragging is disabled", () => {
    vi.useFakeTimers();
    const todo = makeTodo({ id: 1, title: "対象" });
    const onReorder = vi.fn();

    render(
      <TodoList
        todos={[todo]}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
        dragEnabled={false}
        onReorder={onReorder}
      />,
    );
    const handle = screen.getByTestId("todo-item-1");
    const elementFromPoint = mockElementFromPoint(null);

    fireEvent.touchStart(handle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.touchMove(handle, {
      touches: [{ clientX: 20, clientY: 20 }],
    });
    fireEvent.touchEnd(handle);

    expect(elementFromPoint).not.toHaveBeenCalled();
    expect(onReorder).not.toHaveBeenCalled();
  });
});
