import { describe, expect, it } from "vitest";
import { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core";
import { buildOrderBy, calculateNextSortOrder } from "./todos";

const sqliteDialect = new SQLiteAsyncDialect();

function toSql(expression: ReturnType<typeof buildOrderBy>[number]): string {
  return sqliteDialect.sqlToQuery(expression).sql;
}

describe("calculateNextSortOrder", () => {
  // [代表値] 既存TODOが無い（MAX が null）→ 0
  it("returns 0 when there are no existing todos", () => {
    expect(calculateNextSortOrder(null)).toBe(0);
  });

  // [代表値] 既存の最大値 + 1
  it("returns the existing max + 1", () => {
    expect(calculateNextSortOrder(5)).toBe(6);
  });

  // [境界値] 既存の最大値が 0（最初の1件のみ存在）
  it("returns 1 when the existing max is 0", () => {
    expect(calculateNextSortOrder(0)).toBe(1);
  });
});

describe("buildOrderBy", () => {
  it.each([
    ["manual", "asc", ['"todos"."sort_order" asc', '"todos"."id" asc']],
    ["manual", "desc", ['"todos"."sort_order" asc', '"todos"."id" asc']],
    [
      "dueDate",
      "asc",
      [
        '"todos"."due_date" IS NULL asc',
        '"todos"."due_date" asc',
        '"todos"."id" asc',
      ],
    ],
    [
      "dueDate",
      "desc",
      [
        '"todos"."due_date" IS NULL asc',
        '"todos"."due_date" desc',
        '"todos"."id" asc',
      ],
    ],
    [
      "priority",
      "asc",
      [
        "CASE \"todos\".\"priority\" WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END asc",
        '"todos"."id" asc',
      ],
    ],
    [
      "priority",
      "desc",
      [
        "CASE \"todos\".\"priority\" WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END desc",
        '"todos"."id" asc',
      ],
    ],
    ["createdAt", "asc", ['"todos"."created_at" asc', '"todos"."id" asc']],
    ["createdAt", "desc", ['"todos"."created_at" desc', '"todos"."id" asc']],
    ["updatedAt", "asc", ['"todos"."updated_at" asc', '"todos"."id" asc']],
    ["updatedAt", "desc", ['"todos"."updated_at" desc', '"todos"."id" asc']],
  ] as const)(
    "maps %s/%s to the intended Drizzle orderBy expressions",
    (sortBy, sortOrder, expected) => {
      expect(buildOrderBy(sortBy, sortOrder).map(toSql)).toEqual(expected);
    },
  );
});
