import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TagMultiSelect from "./TagMultiSelect";
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

describe("TagMultiSelect", () => {
  it("shows a loading indicator while tags are being fetched", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // 未解決のまま

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText("タグを読み込み中...")).toBeInTheDocument();
  });

  it("shows an empty state message when there are no tags", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[]} onChange={vi.fn()} />,
    );

    expect(await screen.findByText("タグはまだありません")).toBeInTheDocument();
  });

  it("shows an error message and a retry button when the fetch fails", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Internal server error" }, 500),
    );

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[]} onChange={vi.fn()} />,
    );

    expect(
      await screen.findByText("タグの取得に失敗しました"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });

  // [代表値] 既存タグバッジをクリックで選択状態がトグルする（未選択→選択）
  it("selects an unselected tag when its badge is clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse([makeTag({ id: 1, name: "仕事" })]),
    );
    const onChange = vi.fn();

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[]} onChange={onChange} />,
    );

    const badge = await screen.findByRole("button", { name: "#仕事" });
    expect(badge).toHaveAttribute("aria-pressed", "false");

    await user.click(badge);

    expect(onChange).toHaveBeenCalledWith([1]);
  });

  // [代表値] 既存タグバッジをクリックで選択状態がトグルする（選択→未選択）
  it("deselects a selected tag when its badge is clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse([makeTag({ id: 1, name: "仕事" })]),
    );
    const onChange = vi.fn();

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[1]} onChange={onChange} />,
    );

    const badge = await screen.findByRole("button", { name: "#仕事" });
    expect(badge).toHaveAttribute("aria-pressed", "true");
    expect(badge).toHaveClass("bg-primary");

    await user.click(badge);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  // [代表値] 新規タグ名を入力して追加ボタン → タグが作成され選択状態に加わる
  it("creates a tag and adds it to the selection when submitted", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(makeTag({ id: 9, name: "急ぎ" }), 201),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
    const onChange = vi.fn();

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[]} onChange={onChange} />,
    );

    await user.type(await screen.findByLabelText("新規タグ名"), "急ぎ");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tags",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "急ぎ" }),
        }),
      );
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([9]);
    });
  });

  // [境界値] 新規タグ名が空文字 → バリデーションエラー表示、mutation は呼ばれない
  it("shows a validation error and does not call the mutation when the new tag name is empty", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse([]));

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[]} onChange={vi.fn()} />,
    );
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

  // [代表値] 新規タグ名が既存タグと重複（409）→ エラーメッセージ表示、選択状態は変わらない
  it("shows a duplicate-name error when the new tag name already exists (409)", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ error: "Tag name already exists" }, 409),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
    const onChange = vi.fn();

    renderWithQueryClient(
      <TagMultiSelect selectedTagIds={[]} onChange={onChange} />,
    );

    await user.type(await screen.findByLabelText("新規タグ名"), "仕事");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText("同じ名前のタグが既に存在します"),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
