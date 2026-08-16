import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, renderWithQueryClient } from "../test-utils";
import QuickTodoInput from "./QuickTodoInput";
import type { TagResponse } from "../../shared/types";

let fetchMock: ReturnType<typeof vi.fn>;

function makeTag(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: 1,
    name: "仕事",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("QuickTodoInput", () => {
  it("renders an accessible title input and add button", () => {
    renderWithQueryClient(<QuickTodoInput />);

    const form = screen.getByRole("form", {
      name: "TODOのクイック追加フォーム",
    });
    expect(screen.getByLabelText("クイック追加")).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "追加" })).toHaveClass(
      "min-h-11",
    );
    expect(screen.queryByLabelText("追加時のタグ")).not.toBeInTheDocument();
    expect(form).toBeInTheDocument();
  });

  it.each(["button", "enter"] as const)(
    "creates a title-only todo with trimmed input via %s",
    async (submitMethod) => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));
      renderWithQueryClient(<QuickTodoInput />);

      const input = screen.getByLabelText("クイック追加");
      await user.type(input, "  クイックタスク  ");
      if (submitMethod === "button") {
        await user.click(screen.getByRole("button", { name: "追加" }));
      } else {
        await user.keyboard("{Enter}");
      }

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/todos",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ title: "クイックタスク" }),
          }),
        );
      });
      await waitFor(() => expect(input).toHaveValue(""));
    },
  );

  it("adds the selected existing tag and keeps it selected after success", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));
    renderWithQueryClient(
      <QuickTodoInput tags={[makeTag(), makeTag({ id: 2, name: "急ぎ" })]} />,
    );

    const tagSelect = screen.getByLabelText("追加時のタグ");
    const addButton = screen.getByRole("button", { name: "追加" });
    expect(
      screen.getByLabelText("クイック追加").compareDocumentPosition(tagSelect) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      tagSelect.compareDocumentPosition(addButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(tagSelect).toHaveValue("");
    await user.selectOptions(tagSelect, "1");
    expect(tagSelect).toHaveValue("1");

    await user.type(screen.getByLabelText("クイック追加"), "タグ付きTODO");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/todos",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "タグ付きTODO", tagIds: [1] }),
        }),
      );
    });
    await waitFor(() => expect(tagSelect).toHaveValue("1"));
    expect(screen.getByLabelText("クイック追加")).toHaveValue("");
  });

  it.each([
    ["", "タイトルは1〜200文字で入力してください"],
    ["   ", "タイトルは1〜200文字で入力してください"],
    ["a".repeat(201), "タイトルは1〜200文字で入力してください"],
  ])(
    "rejects invalid title %j without an API request",
    async (title, message) => {
      const user = userEvent.setup();
      renderWithQueryClient(<QuickTodoInput />);

      const input = screen.getByLabelText("クイック追加");
      fireEvent.change(input, { target: { value: title } });
      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("keeps the title and shows an error when the API fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Internal server error" }, 500),
    );
    renderWithQueryClient(<QuickTodoInput />);

    const input = screen.getByLabelText("クイック追加");
    await user.type(input, "失敗するタスク");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "時間をおいて再度お試しください",
      );
    });
    expect(input).toHaveValue("失敗するタスク");
  });

  it("prevents duplicate submissions while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    fetchMock.mockReturnValue(pending);
    renderWithQueryClient(<QuickTodoInput />);

    const input = screen.getByLabelText("クイック追加");
    await user.type(input, "二重送信しない");
    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByRole("button", { name: "追加中…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "追加中…" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest(jsonResponse({ id: 2 }, 201));
    await waitFor(() => expect(input).toHaveValue(""));
  });
});
