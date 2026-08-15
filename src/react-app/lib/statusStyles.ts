import type { TodoPriority, TodoStatus } from "../../shared/types";

/**
 * ステータス別バッジの配色クラス（AC-1, AC-5）。Tailwind の JIT はテンプレートリテラルで
 * 組み立てたクラス名を検出できないため、静的な Record として持つ（ui.md 実装に効く制約）。
 */
export const STATUS_BADGE_CLASSES: Record<TodoStatus, string> = {
  TODO: "bg-status-todo-bg text-status-todo-fg",
  IN_PROGRESS: "bg-status-inprogress-bg text-status-inprogress-fg",
  DONE: "bg-status-done-bg text-status-done-fg",
  CANCELED: "bg-status-canceled-bg text-status-canceled-fg",
};

/** ステータスの日本語ラベル。TodoListItem / CompletedTodoListItem / TodoFormModal で共有する。 */
export const STATUS_LABEL: Record<TodoStatus, string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  DONE: "完了",
  CANCELED: "中止",
};

/** 優先度の表示ラベルと配色クラス。TodoListItem で使用する。 */
export const PRIORITY_LABEL_CLASSES: Record<
  TodoPriority,
  { label: string; className: string }
> = {
  HIGH: { label: "優先度: 高", className: "text-priority-high" },
  MEDIUM: { label: "優先度: 中", className: "text-priority-medium" },
  LOW: { label: "優先度: 低", className: "text-priority-low" },
};

/**
 * ステータス進行ショートカット（AC-2）が次に遷移させるステータスを返す純粋関数。
 * `TODO`→`IN_PROGRESS`、`IN_PROGRESS`→`DONE`の1段階のみ進める。
 * `DONE`/`CANCELED` は一覧上で呼び出し UI 自体が提供されない状態だが、防御的に変更しない
 * （index.md 判断根拠）。
 */
export function nextStatus(status: TodoStatus): TodoStatus {
  if (status === "TODO") return "IN_PROGRESS";
  if (status === "IN_PROGRESS") return "DONE";
  return status;
}
