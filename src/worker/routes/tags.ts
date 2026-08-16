import { Hono } from "hono";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { asc, eq, sql } from "drizzle-orm";
import { tags } from "../../db/schema";
import { createTagSchema, updateTagSchema } from "../../shared/schemas";
import type { ErrorResponse, TagResponse } from "../../shared/types";
import { parseJsonBody } from "../request";

const tagsRoute = new Hono<{ Bindings: Env }>();

async function findTagById(db: DrizzleD1Database, id: number) {
  const [found] = await db.select().from(tags).where(eq(tags.id, id)).all();
  return found;
}

/** D1/SQLite reports a UNIQUE constraint violation as a thrown Error whose
 * message contains this text. Drizzle wraps the raw D1 error in a
 * `DrizzleQueryError` (message: "Failed query: ..."), and D1 itself wraps the
 * underlying SQLite error again (message: "D1_ERROR: ..."), so the matching
 * text only surfaces a few levels down the `cause` chain (verified via the
 * actual thrown error shape, not assumed). Walk the chain to find it. */
function isUniqueConstraintError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (/UNIQUE constraint failed/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}

tagsRoute.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(tags).orderBy(asc(tags.id)).all();
  return c.json(result satisfies TagResponse[]);
});

tagsRoute.post("/", async (c) => {
  const body = await parseJsonBody(c.req.raw);
  if (!body.ok) {
    return c.json({ error: "Invalid JSON" } satisfies ErrorResponse, 400);
  }
  const parsed = createTagSchema.safeParse(body.data);
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
  try {
    const [created] = await db
      .insert(tags)
      .values({ name: parsed.data.name })
      .returning();
    return c.json(created satisfies TagResponse, 201);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return c.json(
        { error: "Tag name already exists" } satisfies ErrorResponse,
        409,
      );
    }
    throw error;
  }
});

tagsRoute.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await parseJsonBody(c.req.raw);
  if (!body.ok) {
    return c.json({ error: "Invalid JSON" } satisfies ErrorResponse, 400);
  }
  const parsed = updateTagSchema.safeParse(body.data);
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
  const existing = await findTagById(db, id);
  if (!existing) {
    return c.json({ error: "Tag not found" } satisfies ErrorResponse, 404);
  }

  try {
    const [updated] = await db
      .update(tags)
      .set({ name: parsed.data.name, updatedAt: sql`(current_timestamp)` })
      .where(eq(tags.id, id))
      .returning();
    return c.json(updated satisfies TagResponse);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return c.json(
        { error: "Tag name already exists" } satisfies ErrorResponse,
        409,
      );
    }
    throw error;
  }
});

tagsRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = drizzle(c.env.DB);
  const existing = await findTagById(db, id);
  if (!existing) {
    return c.json({ error: "Tag not found" } satisfies ErrorResponse, 404);
  }

  // `todo_tags` rows referencing this tag are removed by the ON DELETE
  // CASCADE foreign key (src/db/schema.ts) without any additional query here.
  await db.delete(tags).where(eq(tags.id, id));
  return c.body(null, 204);
});

export default tagsRoute;
