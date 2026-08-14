import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TagManagementModal from "./TagManagementModal";
import { jsonResponse, renderWithQueryClient } from "../test-utils";
import type { TagResponse } from "../../shared/types";

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

describe("TagManagementModal", () => {
  it("shows a loading indicator while tags are being fetched", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // 未解決のまま

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("shows an empty state message when there are no tags", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    expect(await screen.findByText("タグはまだありません")).toBeInTheDocument();
  });

  it("shows an error message and a retry button when the fetch fails", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Internal server error" }, 500),
    );

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    expect(
      await screen.findByText("タグの取得に失敗しました"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });

  // [代表値] TagManagementModal: タグ一覧が表示される
  it("shows the list of tags", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        makeTag({ id: 1, name: "仕事" }),
        makeTag({ id: 2, name: "プライベート" }),
      ]),
    );

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    expect(await screen.findByText("仕事")).toBeInTheDocument();
    expect(screen.getByText("プライベート")).toBeInTheDocument();
  });

  // [代表値] TagManagementModal: 新規タグ名を入力して追加 → create mutation が呼ばれる
  it("calls the create mutation when a new tag name is submitted", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(makeTag({ id: 3, name: "買い物" }), 201),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    await user.type(await screen.findByLabelText("新規タグ名"), "買い物");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tags",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "買い物" }),
        }),
      );
    });
  });

  // [境界値] TagManagementModal: 新規タグ名が空文字 → バリデーションエラー表示、mutation は呼ばれない
  it("shows a validation error and does not call the mutation when the new tag name is empty", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);
    await screen.findByText("タグはまだありません");

    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText("タグ名は1〜50文字で入力してください"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/tags",
      expect.objectContaining({ method: "POST" }),
    );
  });

  // [代表値] TagManagementModal: インライン編集でタグ名を変更 → update mutation が呼ばれる
  it("calls the update mutation when a tag name is edited inline", async () => {
    const user = userEvent.setup();
    const tag = makeTag({ id: 4, name: "旧名" });
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ ...tag, name: "新名" }, 200));
      }
      return Promise.resolve(jsonResponse([tag]));
    });

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    await user.click(await screen.findByLabelText("「旧名」を編集"));
    const input = screen.getByLabelText("「旧名」の名前を編集");
    await user.clear(input);
    await user.type(input, "新名");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tags/4",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "新名" }),
        }),
      );
    });
  });

  // [代表値] TagManagementModal: 削除ボタン → 確認ダイアログ表示 → 確認で delete mutation が呼ばれる
  it("opens a confirm dialog and calls the delete mutation on confirm", async () => {
    const user = userEvent.setup();
    const tag = makeTag({ id: 5, name: "不要タグ" });
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse(undefined, 204));
      }
      return Promise.resolve(jsonResponse([tag]));
    });

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    await user.click(await screen.findByLabelText("「不要タグ」を削除"));
    expect(
      screen.getByRole("dialog", { name: "タグを削除" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/tags/5", {
        method: "DELETE",
      });
    });
  });

  // [代表値] 新規タグ作成で名前が重複（409）→ 入力欄直下にエラーメッセージ表示
  it("shows a duplicate-name error when creating a tag that already exists (409)", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ error: "Tag name already exists" }, 409),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    await user.type(await screen.findByLabelText("新規タグ名"), "仕事");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText("同じ名前のタグが既に存在します"),
    ).toBeInTheDocument();
  });

  // [代表値] インライン編集で名前が重複（409）→ エラーメッセージ表示、編集モードは維持
  it("shows a duplicate-name error when renaming to a name that already exists (409)", async () => {
    const user = userEvent.setup();
    const tag = makeTag({ id: 6, name: "旧名2" });
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(
          jsonResponse({ error: "Tag name already exists" }, 409),
        );
      }
      return Promise.resolve(jsonResponse([tag]));
    });

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    await user.click(await screen.findByLabelText("「旧名2」を編集"));
    const input = screen.getByLabelText("「旧名2」の名前を編集");
    await user.clear(input);
    await user.type(input, "重複名");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("同じ名前のタグが既に存在します"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("「旧名2」の名前を編集")).toBeInTheDocument();
  });

  // [代表値] インライン編集の対象が既に削除されている（404）→ トースト表示 + 一覧再取得
  it("shows a toast and refetches when the rename target no longer exists (404)", async () => {
    const user = userEvent.setup();
    const tag = makeTag({ id: 7, name: "消滅タグ" });
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ error: "Tag not found" }, 404));
      }
      return Promise.resolve(jsonResponse([tag]));
    });

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    await user.click(await screen.findByLabelText("「消滅タグ」を編集"));
    const input = screen.getByLabelText("「消滅タグ」の名前を編集");
    await user.clear(input);
    await user.type(input, "新名");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("対象のタグが見つかりませんでした"),
    ).toBeInTheDocument();
    // 初回 GET + 失敗した PATCH + 再取得の GET で、GET /api/tags が2回以上呼ばれる
    const getCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/tags",
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(2);
  });

  // [代表値] 削除対象が既に存在しない（404）→ トースト表示 + 一覧再取得
  it("shows a toast and refetches when the delete target no longer exists (404)", async () => {
    const user = userEvent.setup();
    const tag = makeTag({ id: 8, name: "既に無いタグ" });
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return Promise.resolve(jsonResponse({ error: "Tag not found" }, 404));
      }
      return Promise.resolve(jsonResponse([tag]));
    });

    renderWithQueryClient(<TagManagementModal onClose={vi.fn()} />);

    await user.click(await screen.findByLabelText("「既に無いタグ」を削除"));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(
      await screen.findByText("対象のタグが見つかりませんでした"),
    ).toBeInTheDocument();
  });
});
