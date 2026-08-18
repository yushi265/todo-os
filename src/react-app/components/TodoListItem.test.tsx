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
    subtasks: [],
    ...overrides,
  };
}

describe("TodoListItem", () => {
  // [代表値] sortBy=manual 相当の dragEnabled=true ではカード本体がドラッグ可能
  it("renders a draggable card without a six-dot handle when drag is enabled", () => {
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

    const card = screen.getByTestId("todo-item-42");
    expect(card).toHaveAttribute("draggable", "true");
    expect(
      screen.queryByRole("button", { name: "ドラッグして並び替え" }),
    ).not.toBeInTheDocument();
  });

  // [代表値] カード本体のタッチイベントが各コールバックへ伝播する
  it("wires touch handlers to the card", () => {
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

    const card = screen.getByTestId("todo-item-44");
    fireEvent.touchStart(card, {
      touches: [{ clientX: 0, clientY: 0 }],
    });
    fireEvent.touchMove(card, {
      touches: [{ clientX: 1, clientY: 1 }],
    });
    fireEvent.touchEnd(card);
    fireEvent.touchCancel(card);

    expect(onTouchStart).toHaveBeenCalledOnce();
    expect(onTouchMove).toHaveBeenCalledOnce();
    expect(onTouchEnd).toHaveBeenCalledOnce();
    expect(onTouchCancel).toHaveBeenCalledOnce();
  });

  // [代表値] dragEnabled=false ではカードもドラッグ不可で、ハンドルを表示しない
  it("renders a non-draggable card without a six-dot handle when dragging is disabled", () => {
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

    const card = screen.getByTestId("todo-item-43");
    expect(card).toHaveAttribute("draggable", "false");
    expect(
      screen.queryByRole("button", { name: "ドラッグして並び替え" }),
    ).not.toBeInTheDocument();
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
    await user.click(screen.getByTestId("todo-item-42"));

    expect(onClick).toHaveBeenCalledWith(todo);
  });

  // [代表値] タイトル専用ボタンを持たず、カード全体がタップ領域になる
  it("uses the card as the tap target without a fixed title height", async () => {
    const todo = makeTodo({ title: "タップ領域確認" });
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

    const title = screen.getByText("タップ領域確認");
    expect(title.closest("button")).toBeNull();
    expect(screen.getByText("タップ領域確認")).toHaveClass("text-sm");
    await user.click(screen.getByTestId("todo-item-1"));
    expect(onClick).toHaveBeenCalledWith(todo);
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
    const deleteButton = screen.getByLabelText(`「${todo.title}」を削除`);
    expect(deleteButton).not.toHaveTextContent("削除");
    expect(deleteButton.querySelector("svg")).toBeInTheDocument();

    await user.click(deleteButton);

    expect(onDeleteClick).toHaveBeenCalledWith(todo);
    expect(onClick).not.toHaveBeenCalled();
  });

  // [代表値] ステータス・優先度はアイコン、期限は文字で表示される
  it("displays status and priority icons with the due date label", () => {
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

    expect(screen.getByTestId("status-icon-IN_PROGRESS")).toBeInTheDocument();
    expect(screen.queryByText("進行中")).not.toBeInTheDocument();
    expect(screen.getByTestId("priority-icon-HIGH")).toHaveTextContent("▲");
    expect(screen.getByTestId("priority-icon-HIGH")).toHaveAttribute(
      "aria-label",
      "優先度: 高",
    );
    expect(screen.queryByText("優先度: 高")).not.toBeInTheDocument();
    expect(screen.getByText("2026-08-20")).toBeInTheDocument();
  });

  it("shows an accessible description icon when a todo has a description", () => {
    render(
      <ul>
        <TodoListItem
          todo={makeTodo({ description: "補足説明" })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />
      </ul>,
    );

    const icon = screen.getByTestId("description-icon");
    expect(icon).toHaveAttribute("role", "img");
    expect(icon).toHaveAttribute("aria-label", "説明あり");
    expect(icon).toHaveAttribute("title", "説明あり");
    expect(icon.querySelector("svg")).toBeInTheDocument();
  });

  it("linkifies URLs in the title and description without opening the card", async () => {
    const todo = makeTodo({
      title: "資料 https://example.com/docs",
      description: "補足 https://example.com/help",
    });
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

    const titleLink = screen.getByRole("link", {
      name: "https://example.com/docs",
    });
    const descriptionLink = screen.getByRole("link", {
      name: "https://example.com/help",
    });
    expect(titleLink).toHaveAttribute("href", "https://example.com/docs");
    expect(descriptionLink).toHaveAttribute("href", "https://example.com/help");

    await user.click(titleLink);
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([null, "", "   "])(
    "does not show a description icon when the description is empty (%j)",
    (description) => {
      render(
        <ul>
          <TodoListItem
            todo={makeTodo({ description })}
            onClick={vi.fn()}
            onDeleteClick={vi.fn()}
            onAdvanceStatus={vi.fn()}
          />
        </ul>,
      );

      expect(screen.queryByTestId("description-icon")).not.toBeInTheDocument();
    },
  );

  // [代表値] 未完了ステータスも完了・中止と同じく、左側のアイコンで識別できる
  it.each([
    ["TODO", "○", "text-status-todo-fg", "進行中"],
    ["IN_PROGRESS", "→", "text-status-inprogress-fg", "完了"],
  ] as const)(
    "renders a leading status icon for %s",
    (status, icon, className, nextLabel) => {
      render(
        <ul>
          <TodoListItem
            todo={makeTodo({ status })}
            onClick={vi.fn()}
            onDeleteClick={vi.fn()}
            onAdvanceStatus={vi.fn()}
          />
        </ul>,
      );

      const statusIcon = screen.getByTestId(`status-icon-${status}`);
      expect(statusIcon).toHaveTextContent(icon);
      expect(statusIcon).toHaveClass(className, "!rounded-full");
      expect(statusIcon).toHaveAttribute(
        "aria-label",
        `「サンプル」を「${nextLabel}」に変更`,
      );
      expect(statusIcon.parentElement).toBe(screen.getByTestId("todo-item-1"));
    },
  );

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

  // [境界値] 優先度・期限日が未設定ならプレースホルダーを表示しない
  it("hides unset priority and due date instead of displaying dashes", () => {
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

    expect(screen.queryByText("-")).not.toBeInTheDocument();
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

  // [代表値] タグは優先度・期限と同じメタ情報行に表示される
  it("keeps assigned tags on the priority metadata row", () => {
    const todo = makeTodo({
      priority: "HIGH",
      dueDate: "2026-08-20",
      tags: [makeTag({ id: 1, name: "仕事" })],
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

    const priorityIcon = screen.getByTestId("priority-icon-HIGH");
    const tagGroup = screen.getByTestId("todo-tags-1");

    expect(tagGroup.parentElement).toBe(priorityIcon.parentElement);
    expect(priorityIcon.parentElement).toHaveClass("flex-nowrap");
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

  // [代表値] ステータスアイコンをクリックすると onAdvanceStatus(todo) が呼ばれる（AC-2）
  it("calls onAdvanceStatus with the todo when the status icon is clicked", async () => {
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
    await user.click(screen.getByTestId("status-icon-TODO"));

    expect(onAdvanceStatus).toHaveBeenCalledWith(todo);
  });

  // [代表値] ステータスアイコンのクリックは onClick（行クリック）を発火させない（イベント伝播制御）
  it("does not trigger onClick when the status icon is clicked", async () => {
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
    await user.click(screen.getByTestId("status-icon-TODO"));

    expect(onClick).not.toHaveBeenCalled();
  });

  // [代表値] ステータスアイコンはカード左端に配置され、文字ステータスは2段目に表示しない
  it("places the status icon at the leading edge without a text status", () => {
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

    const row = screen.getByTestId("todo-item-1");
    const statusIcon = screen.getByTestId("status-icon-IN_PROGRESS");
    const priorityIcon = screen.getByTestId("priority-icon-HIGH");

    expect(statusIcon.parentElement).toBe(row);
    expect(screen.queryByText("進行中")).not.toBeInTheDocument();
    expect(priorityIcon.parentElement).not.toBe(row);
  });

  // [代表値] タイトルボタンは優先度メタ情報と同じ左端から始まる
  it("aligns the title button with the priority metadata", () => {
    const todo = makeTodo({
      title: "左端揃え確認",
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

    const title = screen.getByText("左端揃え確認");
    const priorityIcon = screen.getByTestId("priority-icon-HIGH");

    expect(title.parentElement).toHaveClass("px-3", "sm:px-2.5");
    expect(priorityIcon.parentElement).toHaveClass("w-full");
  });

  // [代表値] ステータスアイコンは44pxのタッチターゲットを維持する
  it("keeps the status icon keyboard and touch accessible", () => {
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

    const statusIcon = screen.getByTestId("status-icon-TODO");
    expect(statusIcon).toHaveClass("min-h-11", "min-w-11");
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
    const metadata = screen.getByTestId("priority-icon-HIGH").parentElement;

    expect(row).toHaveClass("gap-2", "sm:gap-1.5");
    expect(metadata).toHaveClass("gap-x-2", "sm:gap-x-1.5");
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
    expect(screen.getByTestId("status-icon-TODO")).toHaveClass(
      "transition-transform",
      "active:scale-[0.98]",
    );
  });

  // [デシジョンテーブル] ステータスアイコンの aria-label は現在のステータスに応じた次ステータス名を示す
  it.each([
    { status: "TODO", nextLabel: "進行中" },
    { status: "IN_PROGRESS", nextLabel: "完了" },
  ] as const)(
    "labels the status icon with the next status for $status",
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

      expect(screen.getByTestId(`status-icon-${status}`)).toBeInTheDocument();
      expect(screen.getByTestId(`status-icon-${status}`)).toHaveAttribute(
        "aria-label",
        `「対象」を「${nextLabel}」に変更`,
      );
    },
  );
});
