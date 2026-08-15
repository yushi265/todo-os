import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "todo-os-theme";

export const THEME_OPTIONS = [
  { value: "default", label: "標準", description: "落ち着いたニュートラル" },
  { value: "ocean", label: "海", description: "澄んだブルー" },
  { value: "forest", label: "森", description: "穏やかなグリーン" },
  { value: "sunset", label: "夕焼け", description: "あたたかなコーラル" },
  { value: "lavender", label: "ラベンダー", description: "やわらかなパープル" },
  { value: "monochrome", label: "モノトーン", description: "白黒のミニマル" },
] as const;

export type ThemeName = (typeof THEME_OPTIONS)[number]["value"];

function isThemeName(value: string | null): value is ThemeName {
  return THEME_OPTIONS.some((option) => option.value === value);
}

function readStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : "default";
  } catch {
    return "default";
  }
}

function persistTheme(theme: ThemeName) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // private browsingなどで保存できなくても、現在の画面上の選択は維持する。
  }
}

/** テーマの選択・DOM反映・localStorage永続化を管理するUIフック。 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  }, [theme]);

  const selectTheme = useCallback((nextTheme: ThemeName) => {
    setTheme(nextTheme);
  }, []);

  return { theme, setTheme: selectTheme, options: THEME_OPTIONS };
}
