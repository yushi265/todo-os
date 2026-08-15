import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import TodoListItem from "./TodoListItem";
import type { TagResponse, TodoResponse } from "../../shared/types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function makeTag(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: 1,
    name: "タグ1",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

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

describe("TodoListItem", () => {
  // [代表値] sortBy=manual 相当の dragEnabled=true ではドラッグハンドルが活性
  it("renders an active draggable handle when drag is enabled", () => {
    const todo = makeTodo({ id: 42, title: "並び替え対象" });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
          dragEnabled={true}
          onDragStart={vi.fn()}
          onDragOver={vi.fn()}
          onDrop={vi.fn()}
          onDragEnd={vi.fn()}
        />
      </ul>,
    );

    const handle = screen.getByRole("button", {
      name: "ドラッグして並び替え",
    });
    expect(handle).toHaveAttribute("draggable", "true");
    expect(handle).not.toHaveClass("opacity-30");
    expect(handle).toHaveClass("touch-pan-y");
    expect(handle).not.toHaveClass("touch-none");
  });

  // [代表値] ドラッグハンドルのタッチイベントが各コールバックへ伝播する
  it("wires touch handlers to the drag handle", () => {
    const onTouchStart = vi.fn();
    const onTouchMove = vi.fn();
    const onTouchEnd = vi.fn();
    const onTouchCancel = vi.fn();

    render(
      <ul>
        <TodoListItem
          todo={makeTodo({ id: 44, title: "タッチ対象" })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
          dragEnabled={true}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        />
      </ul>,
    );

    const handle = screen.getByRole("button", {
      name: "ドラッグして並び替え",
    });
    fireEvent.touchStart(handle, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchMove(handle, {
      touches: [{ clientX: 1, clientY: 1 }],
    });
    fireEvent.touchEnd(handle);
    fireEvent.touchCancel(handle);

    expect(onTouchStart).toHaveBeenCalledOnce();
    expect(onTouchMove).toHaveBeenCalledOnce();
    expect(onTouchEnd).toHaveBeenCalledOnce();
    expect(onTouchCancel).toHaveBeenCalledOnce();
  });

  // [代表値] dragEnabled=false ではドラッグハンドルが非活性
  it("renders a non-draggable handle when dragging is disabled", () => {
    const todo = makeTodo({ id: 43, title: "非活性対象" });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
          dragEnabled={false}
          onDragStart={vi.fn()}
          onDragOver={vi.fn()}
          onDrop={vi.fn()}
          onDragEnd={vi.fn()}
        />
      </ul>,
    );

    const handle = screen.getByRole("button", {
      name: "ドラッグして並び替え",
    });
    expect(handle).toHaveAttribute("draggable", "false");
    expect(handle).toHaveClass("opacity-30", "cursor-default");
  });

  // [代表値] 行クリックで onClick(todo) が正しい todo で呼ばれる
  it("calls onClick with the todo when the row is clicked", async () => {
    const todo = makeTodo({ id: 42, title: "編集対象" });
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={onClick}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );
    await user.click(screen.getByText("編集対象"));

    expect(onClick).toHaveBeenCalledWith(todo);
  });

  // [代表値] タイトルボタンはタッチターゲット最小44pxを維持する
  it("keeps a 44px minimum touch target on the title button", () => {
    const todo = makeTodo({ title: "タップ領域確認" });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    const titleButton = screen.getByText("タップ領域確認").closest("button");
    expect(titleButton).toHaveClass("min-h-11");
  });

  // [代表値] 削除ボタンクリックで onDeleteClick(todo) が呼ばれ、onClick は呼ばれない
  it("calls onDeleteClick without triggering onClick when the delete button is clicked", async () => {
    const todo = makeTodo({ id: 7, title: "削除対象" });
    const onClick = vi.fn();
    const onDeleteClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={onClick}
          onDeleteClick={onDeleteClick}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );
    await user.click(screen.getByLabelText(`「${todo.title}」を削除`));

    expect(onDeleteClick).toHaveBeenCalledWith(todo);
    expect(onClick).not.toHaveBeenCalled();
  });

  // [代表値] ステータス・優先度・期限が表示される（優先度ラベルは lib/statusStyles の
  // PRIORITY_LABEL_CLASSES 定義に従い「優先度: 高」形式になる）
  it("displays status, priority and due date labels", () => {
    const todo = makeTodo({
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: "2026-08-20",
    });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText("優先度: 高")).toBeInTheDocument();
    expect(screen.getByText("2026-08-20")).toBeInTheDocument();
  });

  // [代表値] 本日期限は絵文字マーカーで表示される
  it("displays a today due-date indicator", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T03:00:00.000Z"));

    render(
      <ul>
        <TodoListItem
          todo={makeTodo({ dueDate: "2026-08-15" })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId("due-status-today")).toHaveTextContent(
      "📅2026-08-15",
    );
    expect(screen.getByRole("img", { name: "本日期限" })).toHaveTextContent(
      "📅",
    );
  });

  // [代表値] 近日期限は本日を除く3日以内のTODOに絵文字で表示される
  it("displays a soon due-date indicator", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T03:00:00.000Z"));

    render(
      <ul>
        <TodoListItem
          todo={makeTodo({ dueDate: "2026-08-18" })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId("due-status-soon")).toHaveTextContent(
      "⏰2026-08-18",
    );
  });

  // [デシジョンテーブル] 完了済みTODOは期限日が過去でも緊急度マーカーを表示しない
  it.each(["DONE", "CANCELED"] as const)(
    "does not display an urgency indicator for %s todos",
    (status) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-15T03:00:00.000Z"));

      render(
        <ul>
          <TodoListItem
            todo={makeTodo({ dueDate: "2026-08-14", status })}
            onClick={vi.fn()}
            onDeleteClick={vi.fn()}
            onAdvanceStatus={vi.fn()}
          />
        </ul>,
      );

      expect(screen.getByText("2026-08-14")).toBeInTheDocument();
      expect(
        screen.queryByTestId("due-status-overdue"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("期限切れ")).not.toBeInTheDocument();
    },
  );

  // [境界値] 優先度未設定は "-" 表示
  it("displays a dash when priority is not set", () => {
    const todo = makeTodo({ priority: null });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getAllByText("-")).toHaveLength(2); // priority と dueDate の両方が未設定
  });

  // [代表値] 付与されたタグがバッジで表示される（複数タグでも全件表示・AC-6）
  it("displays all assigned tags as badges", () => {
    const todo = makeTodo({
      tags: [
        makeTag({ id: 1, name: "仕事" }),
        makeTag({ id: 2, name: "プライベート" }),
        makeTag({ id: 3, name: "緊急" }),
      ],
    });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByText("#仕事")).toBeInTheDocument();
    expect(screen.getByText("#プライベート")).toBeInTheDocument();
    expect(screen.getByText("#緊急")).toBeInTheDocument();
  });

  // [境界値] タグが1件も無い TODO はタグバッジ領域が表示されない
  it("does not render a tag badge area when there are no tags", () => {
    const todo = makeTodo({ id: 3, tags: [] });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    expect(screen.queryByTestId("todo-tags-3")).not.toBeInTheDocument();
  });

  // [代表値] ステータスバッジをクリックすると onAdvanceStatus(todo) が呼ばれる（AC-2）
  it("calls onAdvanceStatus with the todo when the status badge is clicked", async () => {
    const todo = makeTodo({ id: 5, title: "進行対象", status: "TODO" });
    const onAdvanceStatus = vi.fn();
    const user = userEvent.setup();

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={onAdvanceStatus}
        />
      </ul>,
    );
    await user.click(
      screen.getByRole("button", { name: "「進行対象」を「進行中」に変更" }),
    );

    expect(onAdvanceStatus).toHaveBeenCalledWith(todo);
  });

  // [代表値] ステータスバッジのクリックは onClick（行クリック）を発火させない（イベント伝播制御）
  it("does not trigger onClick when the status badge is clicked", async () => {
    const todo = makeTodo({ id: 6, title: "進行対象2", status: "TODO" });
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={onClick}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );
    await user.click(
      screen.getByRole("button", { name: "「進行対象2」を「進行中」に変更" }),
    );

    expect(onClick).not.toHaveBeenCalled();
  });

  // [代表値] ステータスバッジはタイトル直下の2段目に配置され、優先度・期限と同じ行に並ぶ（Claude Designのカード構造準拠）
  it("places the status badge in the second row alongside priority and due date", () => {
    const todo = makeTodo({
      title: "配置確認",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: "2026-08-20",
    });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    const statusBadge = screen.getByRole("button", {
      name: "「配置確認」を「完了」に変更",
    });
    const priorityText = screen.getByText("優先度: 高");

    expect(statusBadge.parentElement).toBe(priorityText.parentElement);
  });

  // [代表値] ステータスバッジは44pxのタッチターゲットを維持する
  it("keeps the status badge keyboard and touch accessible", () => {
    const todo = makeTodo({ title: "サイズ確認", status: "TODO" });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    const statusBadge = screen.getByRole("button", {
      name: "「サイズ確認」を「進行中」に変更",
    });
    expect(statusBadge).toHaveClass("min-h-11");
    expect(statusBadge).toHaveClass("py-1");
  });

  // [代表値] TODO行はモバイル幅でも縦積みにならず、常に横並びレイアウトを維持する（レイアウト崩れ防止）
  it("keeps the row laid out horizontally instead of stacking vertically", () => {
    const todo = makeTodo({ id: 8, title: "レイアウト確認" });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    const row = screen.getByTestId("todo-item-8");
    expect(row).not.toHaveClass("flex-col");
    expect(row).toHaveClass("items-center");
  });

  // [代表値] TODO行と2段目メタ情報はsm以上でコンパクトになる
  it("applies compact responsive classes to the row and metadata", () => {
    const todo = makeTodo({
      id: 10,
      title: "密度調整確認",
      priority: "HIGH",
    });

    render(
      <ul>
        <TodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    const row = screen.getByTestId("todo-item-10");
    const metadata = screen.getByText("優先度: 高").parentElement;

    expect(row).toHaveClass("gap-2", "sm:gap-1.5");
    expect(row).not.toHaveClass("sm:gap-4");
    expect(row).toHaveClass("p-4", "sm:p-3");
    expect(metadata).toHaveClass("text-sm", "sm:text-xs");
  });

  it("applies subtle row and status transition classes", () => {
    render(
      <ul>
        <TodoListItem
          todo={makeTodo({ id: 11 })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId("todo-item-11")).toHaveClass(
      "animate-[todo-item-in_0.24s_ease-out]",
    );
    expect(
      screen.getByRole("button", {
        name: "「サンプル」を「進行中」に変更",
      }),
    ).toHaveClass("transition-transform", "active:scale-[0.98]");
  });

  // [デシジョンテーブル] ステータスバッジの aria-label は現在のステータスに応じた次ステータス名を示す
  it.each([
    { status: "TODO", nextLabel: "進行中" },
    { status: "IN_PROGRESS", nextLabel: "完了" },
  ] as const)(
    "labels the status badge with the next status for $status",
    ({ status, nextLabel }) => {
      const todo = makeTodo({ title: "対象", status });

      render(
        <ul>
          <TodoListItem
            todo={todo}
            onClick={vi.fn()}
            onDeleteClick={vi.fn()}
            onAdvanceStatus={vi.fn()}
          />
        </ul>,
      );

      expect(
        screen.getByRole("button", {
          name: `「対象」を「${nextLabel}」に変更`,
        }),
      ).toBeInTheDocument();
    },
  );
});
