import { Hono } from "hono";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { asc, eq, sql } from "drizzle-orm";
import type { SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core";
import { todos } from "../../db/schema";
import { createTodoSchema, updateTodoSchema } from "../../shared/schemas";
import type { ErrorResponse, TodoResponse } from "../../shared/types";

const todosRoute = new Hono<{ Bindings: Env }>();

async function findTodoById(db: DrizzleD1Database, id: number) {
  const [found] = await db.select().from(todos).where(eq(todos.id, id)).all();
  return found;
}

/** 新規 TODO に割り当てる sort_order（AC-2）。既存が無ければ 0、あれば既存最大値 + 1。 */
export function calculateNextSortOrder(maxSortOrder: number | null): number {
  return (maxSortOrder ?? -1) + 1;
}

todosRoute.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db
    .select()
    .from(todos)
    .orderBy(asc(todos.sortOrder))
    .all();
  return c.json(result satisfies TodoResponse[]);
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

  return c.json(created satisfies TodoResponse, 201);
});

todosRoute.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = drizzle(c.env.DB);
  const found = await findTodoById(db, id);
  if (!found) {
    return c.json({ error: "Todo not found" } satisfies ErrorResponse, 404);
  }
  return c.json(found satisfies TodoResponse);
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

  return c.json(updated satisfies TodoResponse);
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
