import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useShowCompleted } from "./useShowCompleted";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useShowCompleted", () => {
  // [代表値] 初期状態（localStorage未設定）→ false（デフォルト非表示）
  it("defaults to false when localStorage is not set", () => {
    const { result } = renderHook(() => useShowCompleted());
    expect(result.current[0]).toBe(false);
  });

  // [代表値] true に設定 → localStorage.getItem("showCompletedTodos") が "true" になる
  it("persists true to localStorage when set", () => {
    const { result } = renderHook(() => useShowCompleted());

    act(() => {
      result.current[1](true);
    });

    expect(window.localStorage.getItem("showCompletedTodos")).toBe("true");
    expect(result.current[0]).toBe(true);
  });

  // [境界値] 再マウント後も設定値を維持する（localStorage からの読み込み）
  it("keeps the persisted value after remount", () => {
    const first = renderHook(() => useShowCompleted());
    act(() => {
      first.result.current[1](true);
    });
    first.unmount();

    const second = renderHook(() => useShowCompleted());
    expect(second.result.current[0]).toBe(true);
  });
});
