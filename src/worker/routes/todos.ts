import { Hono } from "hono";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { asc, eq, inArray, sql } from "drizzle-orm";
import type { SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core";
import { tags, todos, todoTags } from "../../db/schema";
import { createTodoSchema, updateTodoSchema } from "../../shared/schemas";
import type {
  ErrorResponse,
  TagResponse,
  TodoResponse,
} from "../../shared/types";

const todosRoute = new Hono<{ Bindings: Env }>();

async function findTodoById(db: DrizzleD1Database, id: number) {
  const [found] = await db.select().from(todos).where(eq(todos.id, id)).all();
  return found;
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
  todoRows: Omit<TodoResponse, "tags">[],
): Promise<TodoResponse[]> {
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

todosRoute.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db
    .select()
    .from(todos)
    .orderBy(asc(todos.sortOrder))
    .all();
  const withTags = await attachTags(db, result);
  return c.json(withTags satisfies TodoResponse[]);
});

todosRoute.post("/", async (c) => {
  const parsed = createTodoSchema.safeParse(await c.req.json());
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

  const [withTags] = await attachTags(db, [created]);
  return c.json(withTags satisfies TodoResponse, 201);
});

todosRoute.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = drizzle(c.env.DB);
  const found = await findTodoById(db, id);
  if (!found) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }
  const [withTags] = await attachTags(db, [found]);
  return c.json(withTags satisfies TodoResponse);
});

todosRoute.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = updateTodoSchema.safeParse(await c.req.json());
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

  const [updated] = await db
    .update(todos)
    .set(updates)
    .where(eq(todos.id, id))
    .returning();

  if ("tagIds" in parsed.data) {
    const tagIds = parsed.data.tagIds ?? [];
    await db.delete(todoTags).where(eq(todoTags.todoId, id));
    if (tagIds.length > 0) {
      await db
        .insert(todoTags)
        .values(tagIds.map((tagId) => ({ todoId: id, tagId })));
    }
  }

  const [withTags] = await attachTags(db, [updated]);
  return c.json(withTags satisfies TodoResponse);
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
