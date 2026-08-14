import type { TodoStatus } from "../../shared/types";

const OPEN_STATUSES: readonly TodoStatus[] = ["TODO", "IN_PROGRESS"];

function todayInTokyo(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
    now,
  );
}

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
  if (dueDate === null) {
    return false;
  }
  if (!OPEN_STATUSES.includes(status)) {
    return false;
  }
  return dueDate < todayInTokyo(now);
}
