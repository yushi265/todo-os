import { useCallback, useState } from "react";

const STORAGE_KEY = "showCompletedTodos";

function readStoredValue(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * 終了済み（DONE/CANCELED）TODO の表示トグル状態（AC-7）。
 * localStorage に永続化し、再マウント/再読み込み後も維持する。
 */
export function useShowCompleted(): [boolean, (value: boolean) => void] {
  const [showCompleted, setShowCompletedState] =
    useState<boolean>(readStoredValue);

  const setShowCompleted = useCallback((value: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(value));
    setShowCompletedState(value);
  }, []);

  return [showCompleted, setShowCompleted];
}
