import type { TodoStatus } from "../../shared/types";

const OPEN_STATUSES: readonly TodoStatus[] = ["TODO", "IN_PROGRESS"];
const SOON_DAYS = 3;

export type DueDateStatus = "overdue" | "today" | "soon" | null;

function todayInTokyo(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
    now,
  );
}

function addDays(date: string, days: number): string {
  const utcDate = new Date(`${date}T00:00:00Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

/**
 * 未完了TODOの期限状態をAsia/Tokyo基準で判定する。
 * 「近日」は本日を除く3日以内（明日〜3日後）を表す。
 */
export function dueDateStatus(
  dueDate: string | null,
  status: TodoStatus,
  now: Date = new Date(),
): DueDateStatus {
  if (dueDate === null || !OPEN_STATUSES.includes(status)) {
    return null;
  }

  const today = todayInTokyo(now);
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate <= addDays(today, SOON_DAYS)) return "soon";
  return null;
}
