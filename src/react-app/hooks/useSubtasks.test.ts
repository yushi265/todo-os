import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeleteSubtask } from "./useSubtasks";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useDeleteSubtask", () => {
  it("invalidates the subtask and todo queries after deletion", async () => {
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
    const { result } = renderHook(() => useDeleteSubtask(), { wrapper });

    await result.current.mutateAsync({ todoId: 3, subtaskId: 8 });

    expect(fetchMock).toHaveBeenCalledWith("/api/todos/3/subtasks/8", {
      method: "DELETE",
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ["subtasks", 3],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ["todos"],
    });
  });
});
