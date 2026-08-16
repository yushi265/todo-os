import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagApiError, tagMutationErrorMessage, useDeleteTag } from "./useTags";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tagMutationErrorMessage", () => {
  it.each([
    [409, "同じ名前のタグが既に存在します"],
    [400, "タグ名は1〜50文字で入力してください"],
    [500, "時間をおいて再度お試しください"],
  ] as const)("maps HTTP %s to a user-facing message", (status, message) => {
    expect(tagMutationErrorMessage(new TagApiError(status, "error"))).toBe(
      message,
    );
  });

  it("uses the generic message for unknown errors", () => {
    expect(tagMutationErrorMessage(new Error("network"))).toBe(
      "時間をおいて再度お試しください",
    );
  });
});

describe("useDeleteTag", () => {
  it("invalidates tag and todo lists after a successful deletion", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useDeleteTag(), { wrapper });

    await result.current.mutateAsync(3);

    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["tags"],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ["todos"],
    });
  });
});
