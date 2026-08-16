import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchTodos, useCreateTodo } from "./useTodos";

let fetchMock: ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("fetchTodos", () => {
  it("serializes all filters and sort parameters", async () => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTodos({
      search: "cloud task",
      filters: {
        status: "IN_PROGRESS",
        priority: "HIGH",
        tagId: 3,
        due: "OVERDUE",
      },
      sortBy: "priority",
      sortOrder: "desc",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/todos?status=IN_PROGRESS&priority=HIGH&tagId=3&due=OVERDUE&q=cloud+task&sortBy=priority&sortOrder=desc",
    );
  });

  it("converts a JSON error response into ApiError", async () => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Validation failed" }), {
        status: 400,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTodos()).rejects.toEqual(
      new ApiError(400, "Validation failed"),
    );
  });

  it("falls back to the HTTP status for a non-JSON error response", async () => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("upstream failure", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTodos()).rejects.toEqual(new ApiError(502, "HTTP 502"));
  });
});

describe("useCreateTodo", () => {
  it("invalidates the todo list after a successful mutation", async () => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, title: "作成済み" }), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useCreateTodo(), { wrapper });

    await result.current.mutateAsync({ title: "作成する" });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["todos"] });
  });
});
