import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TagResponse, TodoResponse } from "../../shared/types";
import TodoListPage from "./TodoListPage";
import TodoFilterBar from "./TodoFilterBar";
import type { SortBy, TodoFilters } from "../hooks/useTodos";
import { renderWithQueryClient, jsonResponse } from "../test-utils";

function makeTag(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: 1,
    name: "仕事",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

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

const emptyFilters: TodoFilters = {
  status: null,
  priority: null,
  tagId: null,
  due: null,
};

function FilterHarness({
  initialFilters = emptyFilters,
}: {
  initialFilters?: TodoFilters;
}) {
  const [state, setState] = useState<{
    search: string;
    filters: TodoFilters;
    sortBy: SortBy;
    sortOrder: "asc" | "desc";
  }>({
    search: "",
    filters: initialFilters,
    sortBy: "manual",
    sortOrder: "asc",
  });

  return (
    <TodoFilterBar
      search={state.search}
      onSearchChange={(search) =>
        setState((current) => ({ ...current, search }))
      }
      filters={state.filters}
      onFiltersChange={(filters) =>
        setState((current) => ({ ...current, filters }))
      }
      sortBy={state.sortBy}
      sortOrder={state.sortOrder}
      onSortChange={(sortBy, sortOrder) =>
        setState((current) => ({ ...current, sortBy, sortOrder }))
      }
      tags={[makeTag()]}
    />
  );
}

function todoRequestUrls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith("/api/todos"));
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

describe("TodoFilterBar", () => {
  it("検索・フィルター・ソートバーの装飾がデザイン仕様に適合する", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<FilterHarness />);

    const filterBar = screen.getByRole("region", {
      name: "TODOの検索・フィルター・ソート",
    });
    expect(filterBar).not.toHaveClass("bg-card");
    expect(
      filterBar.className
        .split(/\s+/)
        .some((className) => className.startsWith("shadow-")),
    ).toBe(false);

    const searchInput = screen.getByRole("searchbox", { name: "TODOを検索" });
    expect(searchInput.parentElement?.querySelector("svg")).toBeInTheDocument();
    expect(searchInput).toHaveClass(
      "w-full",
      "pl-9",
      "text-sm",
      "sm:text-xs",
      "sm:py-1.5",
    );
    expect(filterBar).toHaveClass("gap-2", "sm:gap-1.5");

    const addFilterButton = screen.getByRole("button", {
      name: "フィルターを追加",
    });
    expect(addFilterButton).toHaveClass(
      "rounded-full",
      "border-dashed",
      "sm:px-2.5",
      "sm:py-1.5",
      "sm:text-xs",
    );

    expect(screen.getByLabelText("並び順")).toHaveClass("rounded-full");
    expect(screen.getByLabelText("並び順")).toHaveClass(
      "px-3",
      "py-2",
      "text-sm",
      "sm:px-2.5",
      "sm:py-1.5",
      "sm:text-xs",
    );
    expect(screen.getByText("並び順")).toHaveClass(
      "text-text-quaternary",
      "sm:text-xs",
    );

    await user.selectOptions(screen.getByLabelText("並び順"), "dueDate");
    expect(screen.getByRole("button", { name: "降順に切り替え" })).toHaveClass(
      "rounded-full",
      "sm:px-2.5",
      "sm:py-1.5",
      "sm:text-base",
    );

    await user.click(addFilterButton);
    expect(screen.getByRole("menuitem", { name: "ステータス" })).toHaveClass(
      "text-sm",
      "sm:text-xs",
    );
  });

  it("タグフィルターのチップ値に # を付けて表示する", () => {
    renderWithQueryClient(
      <FilterHarness initialFilters={{ ...emptyFilters, tagId: 1 }} />,
    );

    const chipValue = screen.getByText("タグ: #仕事");
    expect(chipValue).toBeInTheDocument();
    expect(chipValue).toHaveClass("sm:px-2.5");
    expect(
      screen.getByRole("button", { name: "フィルターを削除" }),
    ).toHaveClass("min-w-11");
    expect(chipValue.parentElement).toHaveClass("text-sm", "sm:text-xs");
  });

  it("入力した検索語を q クエリとして送信し、一覧を再取得する", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/tags" ? jsonResponse([]) : jsonResponse([makeTodo()]),
      ),
    );

    renderWithQueryClient(<TodoListPage />);

    await user.type(
      await screen.findByRole("searchbox", { name: "TODOを検索" }),
      "alpha",
    );

    await waitFor(() => {
      expect(todoRequestUrls(fetchMock)).toContain(
        "/api/todos?q=alpha&sortBy=manual&sortOrder=asc",
      );
    });
  });

  it("ステータスフィルターを選択するとチップが表示され、APIで一覧が絞り込まれる", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/tags" ? jsonResponse([]) : jsonResponse([makeTodo()]),
      ),
    );

    renderWithQueryClient(<TodoListPage />);

    await user.click(
      await screen.findByRole("button", { name: "フィルターを追加" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "ステータス" }));
    await user.click(screen.getByRole("menuitem", { name: "未着手" }));

    expect(screen.getByText("ステータス: 未着手")).toBeInTheDocument();
    await waitFor(() => {
      expect(todoRequestUrls(fetchMock)).toContain(
        "/api/todos?status=TODO&sortBy=manual&sortOrder=asc",
      );
    });
  });

  it("フィルターチップの削除で条件を解除し、一覧を再取得する", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/tags" ? jsonResponse([]) : jsonResponse([makeTodo()]),
      ),
    );

    renderWithQueryClient(<TodoListPage />);

    await user.click(
      await screen.findByRole("button", { name: "フィルターを追加" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "ステータス" }));
    await user.click(screen.getByRole("menuitem", { name: "未着手" }));
    await user.click(screen.getByRole("button", { name: "フィルターを削除" }));

    expect(screen.queryByText("ステータス: 未着手")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(todoRequestUrls(fetchMock)).toContain(
        "/api/todos?sortBy=manual&sortOrder=asc",
      );
    });
  });

  const filterAttributes = ["status", "priority", "tagId", "due"] as const;
  const attributeLabels = {
    status: "ステータス",
    priority: "優先度",
    tagId: "タグ",
    due: "期限",
  } as const;
  const decisionCases = Array.from({ length: 16 }, (_, mask) =>
    filterAttributes.filter((_, index) => (mask & (1 << index)) !== 0),
  ).filter((selected) => selected.length <= 3);

  it.each(decisionCases.map((selected) => [selected]))(
    "選択済み属性 %j をフィルターメニューから除外する",
    async (selectedAttributes) => {
      const user = userEvent.setup();
      const filters: TodoFilters = {
        status: selectedAttributes.includes("status") ? "TODO" : null,
        priority: selectedAttributes.includes("priority") ? "HIGH" : null,
        tagId: selectedAttributes.includes("tagId") ? 1 : null,
        due: selectedAttributes.includes("due") ? "TODAY" : null,
      };

      renderWithQueryClient(<FilterHarness initialFilters={filters} />);

      await user.click(
        screen.getByRole("button", { name: "フィルターを追加" }),
      );

      for (const attribute of filterAttributes) {
        const option = screen.queryByRole("menuitem", {
          name: attributeLabels[attribute],
        });
        if (selectedAttributes.includes(attribute)) {
          expect(option).not.toBeInTheDocument();
        } else {
          expect(option).toBeInTheDocument();
        }
      }
      cleanup();
    },
  );

  it("ソートで期限を選ぶと方向トグルが表示される", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<FilterHarness />);

    await user.selectOptions(screen.getByLabelText("並び順"), "dueDate");

    expect(
      screen.getByRole("button", { name: "降順に切り替え" }),
    ).toBeInTheDocument();
  });

  it("ソートで手動を選ぶと方向トグルが非表示になる", () => {
    renderWithQueryClient(<FilterHarness />);

    expect(
      screen.queryByRole("button", { name: "降順に切り替え" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "昇順に切り替え" }),
    ).not.toBeInTheDocument();
  });

  it("方向トグルで asc/desc が切り替わり、APIの sortOrder も変わる", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/tags" ? jsonResponse([]) : jsonResponse([makeTodo()]),
      ),
    );

    renderWithQueryClient(<TodoListPage />);

    await user.selectOptions(await screen.findByLabelText("並び順"), "dueDate");
    await user.click(screen.getByRole("button", { name: "降順に切り替え" }));

    await waitFor(() => {
      expect(todoRequestUrls(fetchMock)).toContain(
        "/api/todos?sortBy=dueDate&sortOrder=desc",
      );
    });
  });

  it("フィルターで0件になった場合は専用の空状態を表示する", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/tags" ? jsonResponse([]) : jsonResponse([]),
      ),
    );

    renderWithQueryClient(<TodoListPage />);
    expect(
      await screen.findByText("TODO はまだありません"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "フィルターを追加" }));
    await user.click(screen.getByRole("menuitem", { name: "ステータス" }));
    await user.click(screen.getByRole("menuitem", { name: "完了" }));

    expect(
      await screen.findByText("条件に一致する TODO がありません"),
    ).toBeInTheDocument();
    expect(screen.queryByText("TODO はまだありません")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(todoRequestUrls(fetchMock)).toContain(
        "/api/todos?status=DONE&sortBy=manual&sortOrder=asc",
      );
    });
  });

  it("ステータスと期限を同時に選ぶと両方のクエリパラメータを送信する", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/tags" ? jsonResponse([]) : jsonResponse([makeTodo()]),
      ),
    );

    renderWithQueryClient(<TodoListPage />);

    await user.click(
      await screen.findByRole("button", { name: "フィルターを追加" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "ステータス" }));
    await user.click(screen.getByRole("menuitem", { name: "未着手" }));
    await user.click(screen.getByRole("button", { name: "フィルターを追加" }));
    await user.click(screen.getByRole("menuitem", { name: "期限" }));
    await user.click(screen.getByRole("menuitem", { name: "今日" }));

    expect(screen.getByText("ステータス: 未着手")).toBeInTheDocument();
    expect(screen.getByText("期限: 今日")).toBeInTheDocument();
    await waitFor(() => {
      expect(todoRequestUrls(fetchMock)).toContain(
        "/api/todos?status=TODO&due=TODAY&sortBy=manual&sortOrder=asc",
      );
    });
  });

  it("フィルターメニューは Escape で閉じる", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<FilterHarness />);

    await user.click(screen.getByRole("button", { name: "フィルターを追加" }));
    expect(
      screen.getByRole("menuitem", { name: "ステータス" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("menuitem", { name: "ステータス" }),
    ).not.toBeInTheDocument();
  });
});
