import type { TodoStatus } from "../../shared/types";
import { dueDateStatus } from "./dueDateStatus";

/**
 * 期限切れ判定（AC-4）。
 * 期限が Asia/Tokyo 基準の本日より前で、かつステータスが未完了（TODO/IN_PROGRESS）の場合に true。
 * 本日ちょうどは期限切れ扱いにしない。
 */
export function isOverdue(
  dueDate: string | null,
  status: TodoStatus,
  now: Date = new Date(),
): boolean {
  return dueDateStatus(dueDate, status, now) === "overdue";
}
