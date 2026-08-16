import { Hono } from "hono";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  lt,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core";
import { subtasks, tags, todos, todoTags } from "../../db/schema";
import {
  createTodoSchema,
  createSubtaskSchema,
  listTodosQuerySchema,
  reorderTodosSchema,
  updateSubtaskSchema,
  updateTodoSchema,
  type ListTodosQuery,
} from "../../shared/schemas";
import type {
  ErrorResponse,
  TagResponse,
  SubtaskResponse,
  TodoResponse,
} from "../../shared/types";
import { parseJsonBody } from "../request";

const todosRoute = new Hono<{ Bindings: Env }>();

async function findTodoById(db: DrizzleD1Database, id: number) {
  const [found] = await db.select().from(todos).where(eq(todos.id, id)).all();
  return found;
}

async function findSubtaskById(
  db: DrizzleD1Database,
  todoId: number,
  subtaskId: number,
) {
  const [found] = await db
    .select()
    .from(subtasks)
    .where(and(eq(subtasks.todoId, todoId), eq(subtasks.id, subtaskId)))
    .all();
  return found;
}

function todayInTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}

export function buildOrderBy(
  sortBy: ListTodosQuery["sortBy"],
  sortOrder: "asc" | "desc",
) {
  const direction = sortOrder === "asc" ? asc : desc;
  switch (sortBy) {
    case "dueDate":
      // Keep null due dates at the end for both directions.
      return [
        asc(sql`${todos.dueDate} IS NULL`),
        direction(todos.dueDate),
        asc(todos.id),
      ];
    case "priority": {
      const rank = sql`CASE ${todos.priority} WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END`;
      return [direction(rank), asc(todos.id)];
    }
    case "createdAt":
      return [direction(todos.createdAt), asc(todos.id)];
    case "updatedAt":
      return [direction(todos.updatedAt), asc(todos.id)];
    default:
      return [asc(todos.sortOrder), asc(todos.id)];
  }
}

/** 新規 TODO に割り当てる sort_order（AC-2）。既存が無ければ 0、あれば既存最大値 + 1。 */
export function calculateNextSortOrder(maxSortOrder: number | null): number {
  return (maxSortOrder ?? -1) + 1;
}

/** 指定した tagIds のうち実在するタグを id 昇順で返す（AC-7 の存在チェック・レスポンスの tags 構築の両方で使う）。 */
async function findTagsByIds(
  db: DrizzleD1Database,
  tagIds: number[],
): Promise<TagResponse[]> {
  if (tagIds.length === 0) return [];
  return db
    .select()
    .from(tags)
    .where(inArray(tags.id, tagIds))
    .orderBy(asc(tags.id))
    .all();
}

/** todoRows それぞれに、現在 todo_tags で紐づいているタグ（id 昇順）を付与する。
 * 対象 todo が複数でも一括 JOIN 1 回で解決する（N+1 回避）。 */
async function attachTags(
  db: DrizzleD1Database,
  todoRows: Omit<TodoResponse, "tags" | "subtasks">[],
): Promise<Omit<TodoResponse, "subtasks">[]> {
  if (todoRows.length === 0) return [];

  const todoIds = todoRows.map((todo) => todo.id);
  const joined = await db
    .select({ todoId: todoTags.todoId, tag: tags })
    .from(todoTags)
    .innerJoin(tags, eq(todoTags.tagId, tags.id))
    .where(inArray(todoTags.todoId, todoIds))
    .orderBy(asc(tags.id))
    .all();

  const tagsByTodoId = new Map<number, TagResponse[]>();
  for (const row of joined) {
    const list = tagsByTodoId.get(row.todoId);
    if (list) {
      list.push(row.tag);
    } else {
      tagsByTodoId.set(row.todoId, [row.tag]);
    }
  }

  return todoRows.map((todo) => ({
    ...todo,
    tags: tagsByTodoId.get(todo.id) ?? [],
  }));
}

/** 複数 TODO のサブタスクを一括取得して親 TODO ごとに付与する（N+1 回避）。 */
async function attachSubtasks(
  db: DrizzleD1Database,
  todoRows: Omit<TodoResponse, "subtasks">[],
): Promise<TodoResponse[]> {
  if (todoRows.length === 0) return [];

  const todoIds = todoRows.map((todo) => todo.id);
  const subtaskRows = await db
    .select()
    .from(subtasks)
    .where(inArray(subtasks.todoId, todoIds))
    .orderBy(asc(subtasks.id))
    .all();

  const subtasksByTodoId = new Map<number, SubtaskResponse[]>();
  for (const subtask of subtaskRows) {
    const list = subtasksByTodoId.get(subtask.todoId);
    if (list) {
      list.push(subtask);
    } else {
      subtasksByTodoId.set(subtask.todoId, [subtask]);
    }
  }

  return todoRows.map((todo) => ({
    ...todo,
    subtasks: subtasksByTodoId.get(todo.id) ?? [],
  }));
}

async function attachRelations(
  db: DrizzleD1Database,
  todoRows: Omit<TodoResponse, "tags" | "subtasks">[],
): Promise<TodoResponse[]> {
  const withTags = await attachTags(db, todoRows);
  return attachSubtasks(db, withTags);
}

todosRoute.get("/", async (c) => {
  const parsed = listTodosQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        details: parsed.error.issues,
      } satisfies ErrorResponse,
      400,
    );
  }

  const { status, priority, tagId, due, q, sortBy, sortOrder } = parsed.data;
  const db = drizzle(c.env.DB);
  const today = todayInTokyo();
  const conditions: SQL[] = [];

  if (status) conditions.push(eq(todos.status, status));
  if (priority) conditions.push(eq(todos.priority, priority));
  if (due === "TODAY") conditions.push(eq(todos.dueDate, today));
  if (due === "OVERDUE") {
    conditions.push(lt(todos.dueDate, today));
    conditions.push(notInArray(todos.status, ["DONE", "CANCELED"]));
  }
  if (due === "NONE") conditions.push(isNull(todos.dueDate));
  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${todos.title})`, pattern),
        like(sql`lower(${todos.description})`, pattern),
      )!,
    );
  }
  if (tagId) {
    conditions.push(
      inArray(
        todos.id,
        db
          .select({ id: todoTags.todoId })
          .from(todoTags)
          .where(eq(todoTags.tagId, tagId)),
      ),
    );
  }

  let query = db.select().from(todos).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));
  query = query.orderBy(...buildOrderBy(sortBy, sortOrder));
  const result = await query.all();
  const withRelations = await attachRelations(db, result);
  return c.json(withRelations satisfies TodoResponse[]);
});

todosRoute.post("/", async (c) => {
  const body = await parseJsonBody(c.req.raw);
  if (!body.ok) {
    return c.json({ error: "Invalid JSON" } satisfies ErrorResponse, 400);
  }
  const parsed = createTodoSchema.safeParse(body.data);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        details: parsed.error.issues,
      } satisfies ErrorResponse,
      400,
    );
  }

  const db = drizzle(c.env.DB);

  const tagIds = parsed.data.tagIds ?? [];
  const foundTags = await findTagsByIds(db, tagIds);
  if (foundTags.length !== tagIds.length) {
    return c.json(
      { error: "One or more tagIds do not exist" } satisfies ErrorResponse,
      400,
    );
  }

  const [maxRow] = await db
    .select({ maxSortOrder: sql<number | null>`max(${todos.sortOrder})` })
    .from(todos)
    .all();
  const nextSortOrder = calculateNextSortOrder(maxRow?.maxSortOrder ?? null);

  const [created] = await db
    .insert(todos)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority ?? null,
      dueDate: parsed.data.dueDate ?? null,
      sortOrder: nextSortOrder,
    })
    .returning();

  if (tagIds.length > 0) {
    await db
      .insert(todoTags)
      .values(tagIds.map((tagId) => ({ todoId: created.id, tagId })));
  }

  const [withRelations] = await attachRelations(db, [created]);
  return c.json(withRelations satisfies TodoResponse, 201);
});

todosRoute.get("/:id/subtasks", async (c) => {
  const todoId = Number(c.req.param("id"));
  const db = drizzle(c.env.DB);
  const parent = await findTodoById(db, todoId);
  if (!parent) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }

  const result = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.todoId, todoId))
    .orderBy(asc(subtasks.id))
    .all();
  return c.json(result satisfies SubtaskResponse[]);
});

todosRoute.post("/:id/subtasks", async (c) => {
  const todoId = Number(c.req.param("id"));
  const body = await parseJsonBody(c.req.raw);
  if (!body.ok) {
    return c.json({ error: "Invalid JSON" } satisfies ErrorResponse, 400);
  }
  const parsed = createSubtaskSchema.safeParse(body.data);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        details: parsed.error.issues,
      } satisfies ErrorResponse,
      400,
    );
  }

  const db = drizzle(c.env.DB);
  const parent = await findTodoById(db, todoId);
  if (!parent) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }

  const [created] = await db
    .insert(subtasks)
    .values({ todoId, title: parsed.data.title })
    .returning();
  return c.json(created satisfies SubtaskResponse, 201);
});

todosRoute.patch("/:id/subtasks/:subtaskId", async (c) => {
  const todoId = Number(c.req.param("id"));
  const subtaskId = Number(c.req.param("subtaskId"));
  const body = await parseJsonBody(c.req.raw);
  if (!body.ok) {
    return c.json({ error: "Invalid JSON" } satisfies ErrorResponse, 400);
  }
  const parsed = updateSubtaskSchema.safeParse(body.data);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        details: parsed.error.issues,
      } satisfies ErrorResponse,
      400,
    );
  }

  const db = drizzle(c.env.DB);
  const parent = await findTodoById(db, todoId);
  if (!parent) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }
  const existing = await findSubtaskById(db, todoId, subtaskId);
  if (!existing) {
    return c.json({ error: "Subtask not found" } satisfies ErrorResponse, 404);
  }

  const updates: SQLiteUpdateSetSource<typeof subtasks> = {
    updatedAt: sql`(current_timestamp)`,
  };
  updates.completed = parsed.data.completed;

  const [updated] = await db
    .update(subtasks)
    .set(updates)
    .where(eq(subtasks.id, subtaskId))
    .returning();
  return c.json(updated satisfies SubtaskResponse);
});

todosRoute.delete("/:id/subtasks/:subtaskId", async (c) => {
  const todoId = Number(c.req.param("id"));
  const subtaskId = Number(c.req.param("subtaskId"));
  const db = drizzle(c.env.DB);
  const parent = await findTodoById(db, todoId);
  if (!parent) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }
  const existing = await findSubtaskById(db, todoId, subtaskId);
  if (!existing) {
    return c.json({ error: "Subtask not found" } satisfies ErrorResponse, 404);
  }

  await db.delete(subtasks).where(eq(subtasks.id, subtaskId));
  return c.body(null, 204);
});

todosRoute.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = drizzle(c.env.DB);
  const found = await findTodoById(db, id);
  if (!found) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }
  const [withRelations] = await attachRelations(db, [found]);
  return c.json(withRelations satisfies TodoResponse);
});

todosRoute.patch("/reorder", async (c) => {
  const body = await parseJsonBody(c.req.raw);
  if (!body.ok) {
    return c.json({ error: "Invalid JSON" } satisfies ErrorResponse, 400);
  }
  const parsed = reorderTodosSchema.safeParse(body.data);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        details: parsed.error.issues,
      } satisfies ErrorResponse,
      400,
    );
  }

  const { todoIds } = parsed.data;
  const uniqueIds = new Set(todoIds);
  if (uniqueIds.size !== todoIds.length) {
    return c.json(
      { error: "todoIds contains duplicate values" } satisfies ErrorResponse,
      400,
    );
  }

  const db = drizzle(c.env.DB);
  const existing = await db.select({ id: todos.id }).from(todos).all();
  const existingIds = new Set(existing.map((todo) => todo.id));
  const isExactMatch =
    uniqueIds.size === existingIds.size &&
    [...uniqueIds].every((id) => existingIds.has(id));
  if (!isExactMatch) {
    return c.json(
      {
        error: "todoIds must match the full set of existing todo ids",
      } satisfies ErrorResponse,
      400,
    );
  }

  if (todoIds.length === 0) return c.body(null, 204);

  const updates = todoIds.map((id, index) =>
    db.update(todos).set({ sortOrder: index }).where(eq(todos.id, id)),
  );
  await db.batch(updates as [(typeof updates)[number], ...typeof updates]);

  return c.body(null, 204);
});

todosRoute.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await parseJsonBody(c.req.raw);
  if (!body.ok) {
    return c.json({ error: "Invalid JSON" } satisfies ErrorResponse, 400);
  }
  const parsed = updateTodoSchema.safeParse(body.data);
  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        details: parsed.error.issues,
      } satisfies ErrorResponse,
      400,
    );
  }

  const db = drizzle(c.env.DB);
  const existing = await findTodoById(db, id);
  if (!existing) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }

  // Same "in" presence check as below: only replace tag associations when
  // `tagIds` was explicitly sent (an explicit [] clears all associations).
  if ("tagIds" in parsed.data) {
    const tagIds = parsed.data.tagIds ?? [];
    const foundTags = await findTagsByIds(db, tagIds);
    if (foundTags.length !== tagIds.length) {
      return c.json(
        { error: "One or more tagIds do not exist" } satisfies ErrorResponse,
        400,
      );
    }
  }

  // Only fields explicitly present in the request body are applied; zod
  // omits unspecified optional keys entirely (verified: absent key !==
  // explicit null), so `in` distinguishes "not provided" from "clear to null".
  const updates: SQLiteUpdateSetSource<typeof todos> = {
    updatedAt: sql`(current_timestamp)`,
  };
  if ("title" in parsed.data) updates.title = parsed.data.title;
  if ("description" in parsed.data)
    updates.description = parsed.data.description;
  if ("status" in parsed.data) updates.status = parsed.data.status;
  if ("priority" in parsed.data) updates.priority = parsed.data.priority;
  if ("dueDate" in parsed.data) updates.dueDate = parsed.data.dueDate;

  const updateStatement = db.update(todos).set(updates).where(eq(todos.id, id));

  if ("tagIds" in parsed.data) {
    const tagIds = parsed.data.tagIds ?? [];
    const statements = [
      updateStatement,
      db.delete(todoTags).where(eq(todoTags.todoId, id)),
      ...(tagIds.length > 0
        ? [
            db
              .insert(todoTags)
              .values(tagIds.map((tagId) => ({ todoId: id, tagId }))),
          ]
        : []),
    ];
    await db.batch(
      statements as [
        (typeof statements)[number],
        ...(typeof statements)[number][],
      ],
    );

    const updated = await findTodoById(db, id);
    if (!updated) {
      throw new Error(`Todo disappeared during update: ${id}`);
    }
    const [withRelations] = await attachRelations(db, [updated]);
    return c.json(withRelations satisfies TodoResponse);
  }

  const [updated] = await updateStatement.returning();
  const [withRelations] = await attachRelations(db, [updated]);
  return c.json(withRelations satisfies TodoResponse);
});

todosRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = drizzle(c.env.DB);
  const existing = await findTodoById(db, id);
  if (!existing) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }

  await db.delete(todos).where(eq(todos.id, id));
  return c.body(null, 204);
});

export default todosRoute;
