import { beforeEach, describe, expect, it } from "vitest";
import { env, exports } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { tags, todos, todoTags } from "../db/schema";
import type { ErrorResponse, TagResponse, TodoResponse } from "../shared/types";

const BASE_URL = "https://example.com";

// D1 storage in this pool persists across `it()` blocks within the same test
// file (no automatic per-test snapshot/rollback for D1), so each test starts
// from a clean slate explicitly. `todoTags` is cleared explicitly (rather than
// relying on ON DELETE CASCADE from `todos`/`tags`) so test isolation does not
// depend on the very cascade behavior that AC-3's tests independently verify.
beforeEach(async () => {
  const db = drizzle(env.DB);
  await db.delete(todoTags);
  await db.delete(tags);
  await db.delete(todos);
});

function buildRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`${BASE_URL}${path}`, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function todayInTokyo(offsetDays = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return exports.default.fetch(buildRequest(method, path, body));
}

async function createTodo(body: unknown): Promise<TodoResponse> {
  const res = await call("POST", "/api/todos", body);
  return (await res.json()) as TodoResponse;
}

async function createTag(body: unknown): Promise<TagResponse> {
  const res = await call("POST", "/api/tags", body);
  return (await res.json()) as TagResponse;
}

describe("POST /api/todos", () => {
  it("creates a todo with a 1-character title", async () => {
    const res = await call("POST", "/api/todos", { title: "a" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.title).toBe("a");
    expect(body.status).toBe("TODO");
    expect(body.sortOrder).toBe(0);
    expect(typeof body.id).toBe("number");
  });

  it("creates a todo with a 200-character title", async () => {
    const res = await call("POST", "/api/todos", { title: "a".repeat(200) });

    expect(res.status).toBe(201);
  });

  it("rejects an empty title", async () => {
    const res = await call("POST", "/api/todos", { title: "" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("rejects a 201-character title", async () => {
    const res = await call("POST", "/api/todos", { title: "a".repeat(201) });

    expect(res.status).toBe(400);
  });

  it("defaults description, priority and dueDate to null when omitted", async () => {
    const res = await call("POST", "/api/todos", { title: "title only" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.description).toBeNull();
    expect(body.priority).toBeNull();
    expect(body.dueDate).toBeNull();
  });

  it("creates a todo with a description", async () => {
    const res = await call("POST", "/api/todos", {
      title: "with description",
      description: "some details",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.description).toBe("some details");
  });

  it.each(["HIGH", "MEDIUM", "LOW"] as const)(
    "creates a todo with priority %s",
    async (priority) => {
      const res = await call("POST", "/api/todos", {
        title: "priority test",
        priority,
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as TodoResponse;
      expect(body.priority).toBe(priority);
    },
  );

  it("rejects an invalid priority enum value", async () => {
    const res = await call("POST", "/api/todos", {
      title: "bad priority",
      priority: "URGENT",
    });

    expect(res.status).toBe(400);
  });

  it("creates a todo with a valid dueDate", async () => {
    const res = await call("POST", "/api/todos", {
      title: "due date test",
      dueDate: "2026-08-20",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.dueDate).toBe("2026-08-20");
  });

  it("rejects a dueDate that is not in YYYY-MM-DD format", async () => {
    const res = await call("POST", "/api/todos", {
      title: "bad due date",
      dueDate: "2026/08/20",
    });

    expect(res.status).toBe(400);
  });

  it("ignores a status field in the request body and always creates as TODO", async () => {
    const res = await call("POST", "/api/todos", {
      title: "status ignored",
      status: "DONE",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.status).toBe("TODO");
  });

  it("assigns sortOrder 0 when no todos exist yet", async () => {
    const res = await call("POST", "/api/todos", { title: "first todo" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.sortOrder).toBe(0);
  });

  it("assigns sortOrder as the existing max + 1 when todos already exist", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values({ title: "existing", sortOrder: 5 });

    const res = await call("POST", "/api/todos", { title: "next todo" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.sortOrder).toBe(6);
  });

  it("creates a todo with tagIds and includes the tags in the response", async () => {
    const tagA = await createTag({ name: "tag-a" });
    const tagB = await createTag({ name: "tag-b" });

    const res = await call("POST", "/api/todos", {
      title: "tagged todo",
      tagIds: [tagA.id, tagB.id],
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.tags.map((tag) => tag.id).sort((a, b) => a - b)).toEqual(
      [tagA.id, tagB.id].sort((a, b) => a - b),
    );
  });

  it("creates a todo with an empty tags array when tagIds is omitted", async () => {
    const res = await call("POST", "/api/todos", { title: "no tags" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TodoResponse;
    expect(body.tags).toEqual([]);
  });

  it("rejects tagIds that do not exist and does not create the todo", async () => {
    const res = await call("POST", "/api/todos", {
      title: "bad tag ref",
      tagIds: [999999],
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("One or more tagIds do not exist");

    const listRes = await call("GET", "/api/todos");
    const list = (await listRes.json()) as TodoResponse[];
    expect(list.some((todo) => todo.title === "bad tag ref")).toBe(false);
  });
});

describe("GET /api/todos", () => {
  it("returns an empty array when no todos exist", async () => {
    const res = await call("GET", "/api/todos");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns todos ordered by sortOrder ascending", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "third", sortOrder: 2 },
      { title: "first", sortOrder: 0 },
      { title: "second", sortOrder: 1 },
    ]);

    const res = await call("GET", "/api/todos");

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse[];
    expect(body.map((todo) => todo.title)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("returns each todo with its correct combination of tags when multiple todos and tags exist (join, not N+1)", async () => {
    const tagX = await createTag({ name: "x" });
    const tagY = await createTag({ name: "y" });
    const tagZ = await createTag({ name: "z" });

    const todo1 = await createTodo({
      title: "todo1",
      tagIds: [tagX.id, tagY.id],
    });
    const todo2 = await createTodo({
      title: "todo2",
      tagIds: [tagY.id, tagZ.id],
    });
    const todo3 = await createTodo({ title: "todo3" });

    const res = await call("GET", "/api/todos");

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse[];
    const byId = new Map(body.map((todo) => [todo.id, todo]));
    expect(
      byId
        .get(todo1.id)
        ?.tags.map((tag) => tag.id)
        .sort((a, b) => a - b),
    ).toEqual([tagX.id, tagY.id].sort((a, b) => a - b));
    expect(
      byId
        .get(todo2.id)
        ?.tags.map((tag) => tag.id)
        .sort((a, b) => a - b),
    ).toEqual([tagY.id, tagZ.id].sort((a, b) => a - b));
    expect(byId.get(todo3.id)?.tags).toEqual([]);
  });

  it("filters by status", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "todo", status: "TODO", sortOrder: 0 },
      { title: "done", status: "DONE", sortOrder: 1 },
    ]);

    const res = await call("GET", "/api/todos?status=TODO");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["todo"]);
  });

  it("filters by priority", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "high", priority: "HIGH", sortOrder: 0 },
      { title: "low", priority: "LOW", sortOrder: 1 },
    ]);

    const res = await call("GET", "/api/todos?priority=HIGH");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["high"]);
  });

  it("filters by an existing tag id", async () => {
    const tag = await createTag({ name: "filter-tag" });
    const tagged = await createTodo({ title: "tagged", tagIds: [tag.id] });
    await createTodo({ title: "untagged" });

    const res = await call("GET", `/api/todos?tagId=${tag.id}`);

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.id),
    ).toEqual([tagged.id]);
  });

  it("returns no todos for a non-existent tag id", async () => {
    await createTodo({ title: "unrelated" });

    const res = await call("GET", "/api/todos?tagId=999999");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("filters by today's date in Asia/Tokyo", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "today", dueDate: todayInTokyo(), sortOrder: 0 },
      { title: "tomorrow", dueDate: todayInTokyo(1), sortOrder: 1 },
    ]);

    const res = await call("GET", "/api/todos?due=TODAY");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["today"]);
  });

  it.each([
    ["TODO", true],
    ["IN_PROGRESS", true],
    ["DONE", false],
    ["CANCELED", false],
  ] as const)(
    "filters overdue todos by status: %s is included=%s",
    async (status, included) => {
      const db = drizzle(env.DB);
      await db.insert(todos).values({
        title: status,
        status,
        dueDate: todayInTokyo(-1),
        sortOrder: 0,
      });

      const res = await call("GET", "/api/todos?due=OVERDUE");

      expect(res.status).toBe(200);
      expect(
        ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
      ).toEqual(included ? [status] : []);
    },
  );

  it("does not include a todo due today in overdue results", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values({
      title: "today",
      dueDate: todayInTokyo(),
      sortOrder: 0,
    });

    const res = await call("GET", "/api/todos?due=OVERDUE");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("filters todos without a due date", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "none", dueDate: null, sortOrder: 0 },
      { title: "dated", dueDate: todayInTokyo(), sortOrder: 1 },
    ]);

    const res = await call("GET", "/api/todos?due=NONE");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["none"]);
  });

  it("searches title and description case-insensitively", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "cloudflareを調べる", description: null, sortOrder: 0 },
      {
        title: "other title",
        description: "Deploy to Cloud Workers",
        sortOrder: 1,
      },
      { title: "unrelated", description: "local notes", sortOrder: 2 },
    ]);

    const res = await call("GET", "/api/todos?q=CLOUD");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["cloudflareを調べる", "other title"]);
  });

  it("combines status and priority filters with AND semantics", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "matching", status: "TODO", priority: "HIGH", sortOrder: 0 },
      { title: "wrong status", status: "DONE", priority: "HIGH", sortOrder: 1 },
      {
        title: "wrong priority",
        status: "TODO",
        priority: "LOW",
        sortOrder: 2,
      },
      {
        title: "wrong both",
        status: "DONE",
        priority: "LOW",
        sortOrder: 3,
      },
    ]);

    const res = await call("GET", "/api/todos?status=TODO&priority=HIGH");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["matching"]);
  });

  it("sorts by due date ascending with nulls last", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "null", dueDate: null, sortOrder: 0 },
      { title: "tomorrow", dueDate: todayInTokyo(1), sortOrder: 1 },
      { title: "yesterday", dueDate: todayInTokyo(-1), sortOrder: 2 },
    ]);

    const res = await call("GET", "/api/todos?sortBy=dueDate&sortOrder=asc");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["yesterday", "tomorrow", "null"]);
  });

  it("sorts by due date descending with nulls last", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "null", dueDate: null, sortOrder: 0 },
      { title: "tomorrow", dueDate: todayInTokyo(1), sortOrder: 1 },
      { title: "yesterday", dueDate: todayInTokyo(-1), sortOrder: 2 },
    ]);

    const res = await call("GET", "/api/todos?sortBy=dueDate&sortOrder=desc");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["tomorrow", "yesterday", "null"]);
  });

  it("sorts by priority ascending as unset, LOW, MEDIUM, then HIGH", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "unset", priority: null, sortOrder: 0 },
      { title: "high", priority: "HIGH", sortOrder: 1 },
      { title: "low", priority: "LOW", sortOrder: 2 },
      { title: "medium", priority: "MEDIUM", sortOrder: 3 },
    ]);

    const res = await call("GET", "/api/todos?sortBy=priority&sortOrder=asc");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["unset", "low", "medium", "high"]);
  });

  it("sorts by priority descending as HIGH, MEDIUM, LOW, then unset", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "unset", priority: null, sortOrder: 0 },
      { title: "high", priority: "HIGH", sortOrder: 1 },
      { title: "low", priority: "LOW", sortOrder: 2 },
      { title: "medium", priority: "MEDIUM", sortOrder: 3 },
    ]);

    const res = await call("GET", "/api/todos?sortBy=priority&sortOrder=desc");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["high", "medium", "low", "unset"]);
  });

  it.each([
    ["createdAt", "asc", ["old", "middle", "new"]],
    ["createdAt", "desc", ["new", "middle", "old"]],
    ["updatedAt", "asc", ["old", "middle", "new"]],
    ["updatedAt", "desc", ["new", "middle", "old"]],
  ] as const)(
    "sorts by %s in %s order",
    async (sortBy, sortOrder, expected) => {
      const db = drizzle(env.DB);
      await db.insert(todos).values([
        {
          title: "middle",
          sortOrder: 0,
          createdAt: "2026-08-02 00:00:00",
          updatedAt: "2026-08-02 00:00:00",
        },
        {
          title: "new",
          sortOrder: 1,
          createdAt: "2026-08-04 00:00:00",
          updatedAt: "2026-08-04 00:00:00",
        },
        {
          title: "old",
          sortOrder: 2,
          createdAt: "2026-08-01 00:00:00",
          updatedAt: "2026-08-01 00:00:00",
        },
      ]);

      const res = await call(
        "GET",
        `/api/todos?sortBy=${sortBy}&sortOrder=${sortOrder}`,
      );

      expect(res.status).toBe(200);
      expect(
        ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
      ).toEqual(expected);
    },
  );

  it("uses manual sort by default and ignores sortOrder when sortBy is manual", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      { title: "second", sortOrder: 1 },
      { title: "first", sortOrder: 0 },
    ]);

    const res = await call("GET", "/api/todos?sortBy=manual&sortOrder=desc");

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["first", "second"]);
  });

  it("applies filtering before sorting", async () => {
    const db = drizzle(env.DB);
    await db.insert(todos).values([
      {
        title: "done earlier",
        status: "DONE",
        dueDate: todayInTokyo(-1),
        sortOrder: 0,
      },
      {
        title: "todo later",
        status: "TODO",
        dueDate: todayInTokyo(1),
        sortOrder: 1,
      },
      {
        title: "todo earlier",
        status: "TODO",
        dueDate: todayInTokyo(-1),
        sortOrder: 2,
      },
    ]);

    const res = await call(
      "GET",
      "/api/todos?status=TODO&sortBy=dueDate&sortOrder=asc",
    );

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as TodoResponse[]).map((todo) => todo.title),
    ).toEqual(["todo earlier", "todo later"]);
  });

  it("does not change sortOrder when filters and sorting are applied", async () => {
    const db = drizzle(env.DB);
    const inserted = await db
      .insert(todos)
      .values([
        { title: "high", status: "TODO", priority: "HIGH", sortOrder: 7 },
        { title: "low", status: "DONE", priority: "LOW", sortOrder: 3 },
      ])
      .returning({ id: todos.id, sortOrder: todos.sortOrder });

    const before = new Map(inserted.map((todo) => [todo.id, todo.sortOrder]));
    const res = await call(
      "GET",
      "/api/todos?status=TODO&q=HIGH&sortBy=priority&sortOrder=desc",
    );
    expect(res.status).toBe(200);

    const after = await db
      .select({ id: todos.id, sortOrder: todos.sortOrder })
      .from(todos)
      .all();
    expect(new Map(after.map((todo) => [todo.id, todo.sortOrder]))).toEqual(
      before,
    );
  });

  it("rejects an invalid status query value", async () => {
    const res = await call("GET", "/api/todos?status=INVALID");

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("rejects a non-numeric tagId query value", async () => {
    const res = await call("GET", "/api/todos?tagId=not-a-number");

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Validation failed");
  });
});

describe("GET /api/todos/:id", () => {
  it("returns 404 for a non-existent id", async () => {
    const res = await call("GET", "/api/todos/999999");

    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Todo not found");
  });

  it("returns the todo when it exists", async () => {
    const created = await createTodo({ title: "fetchable" });

    const res = await call("GET", `/api/todos/${created.id}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body).toEqual(created);
  });

  it("no longer lists a tag once that tag has been deleted (todo_tags ON DELETE CASCADE)", async () => {
    const tag = await createTag({ name: "cascade-me" });
    const created = await createTodo({
      title: "tagged todo",
      tagIds: [tag.id],
    });

    const deleteRes = await call("DELETE", `/api/tags/${tag.id}`);
    expect(deleteRes.status).toBe(204);

    const res = await call("GET", `/api/todos/${created.id}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body.tags).toEqual([]);
  });
});

describe("PATCH /api/todos/:id", () => {
  it("returns 404 for a non-existent id", async () => {
    const res = await call("PATCH", "/api/todos/999999", { title: "x" });

    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Todo not found");
  });

  it("rejects an invalid status enum value", async () => {
    const created = await createTodo({ title: "patchable" });

    const res = await call("PATCH", `/api/todos/${created.id}`, {
      status: "ARCHIVED",
    });

    expect(res.status).toBe(400);
  });

  it("rejects an empty title on update and leaves the todo unchanged", async () => {
    const created = await createTodo({ title: "valid title" });

    const res = await call("PATCH", `/api/todos/${created.id}`, { title: "" });

    expect(res.status).toBe(400);
    const getRes = await call("GET", `/api/todos/${created.id}`);
    const body = (await getRes.json()) as TodoResponse;
    expect(body.title).toBe("valid title");
  });

  it("updates only the specified field and refreshes updatedAt while leaving createdAt untouched", async () => {
    const db = drizzle(env.DB);
    const [seeded] = await db
      .insert(todos)
      .values({
        title: "original",
        description: "desc",
        priority: "LOW",
        dueDate: "2026-09-01",
        sortOrder: 0,
        createdAt: "2020-01-01 00:00:00",
        updatedAt: "2020-01-01 00:00:00",
      })
      .returning();

    const res = await call("PATCH", `/api/todos/${seeded.id}`, {
      title: "updated title",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body.title).toBe("updated title");
    expect(body.description).toBe("desc");
    expect(body.priority).toBe("LOW");
    expect(body.dueDate).toBe("2026-09-01");
    expect(body.status).toBe("TODO");
    expect(body.createdAt).toBe("2020-01-01 00:00:00");
    expect(body.updatedAt).not.toBe("2020-01-01 00:00:00");
  });

  it("updates description, priority and dueDate together, leaving title unchanged", async () => {
    const created = await createTodo({ title: "keep this title" });

    const res = await call("PATCH", `/api/todos/${created.id}`, {
      description: "new description",
      priority: "HIGH",
      dueDate: "2026-12-31",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body.title).toBe("keep this title");
    expect(body.description).toBe("new description");
    expect(body.priority).toBe("HIGH");
    expect(body.dueDate).toBe("2026-12-31");
  });

  it("clears description, priority and dueDate by setting them to null", async () => {
    const created = await createTodo({
      title: "clearable",
      description: "will be cleared",
      priority: "MEDIUM",
      dueDate: "2026-10-10",
    });

    const res = await call("PATCH", `/api/todos/${created.id}`, {
      description: null,
      priority: null,
      dueDate: null,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body.description).toBeNull();
    expect(body.priority).toBeNull();
    expect(body.dueDate).toBeNull();
  });

  it("walks through representative status transitions, including rollback and resume from CANCELED", async () => {
    const created = await createTodo({ title: "transition test" });

    for (const status of ["IN_PROGRESS", "DONE", "TODO"] as const) {
      const res = await call("PATCH", `/api/todos/${created.id}`, { status });
      expect(res.status).toBe(200);
      const body = (await res.json()) as TodoResponse;
      expect(body.status).toBe(status);
    }

    const cancelRes = await call("PATCH", `/api/todos/${created.id}`, {
      status: "CANCELED",
    });
    expect(cancelRes.status).toBe(200);

    const resumeRes = await call("PATCH", `/api/todos/${created.id}`, {
      status: "IN_PROGRESS",
    });
    expect(resumeRes.status).toBe(200);
    const resumeBody = (await resumeRes.json()) as TodoResponse;
    expect(resumeBody.status).toBe("IN_PROGRESS");
  });

  it("replaces tag associations with a new combination of tagIds", async () => {
    const tagA = await createTag({ name: "a" });
    const tagB = await createTag({ name: "b" });
    const tagC = await createTag({ name: "c" });
    const created = await createTodo({
      title: "retag me",
      tagIds: [tagA.id, tagB.id],
    });

    const res = await call("PATCH", `/api/todos/${created.id}`, {
      tagIds: [tagB.id, tagC.id],
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body.tags.map((tag) => tag.id).sort((a, b) => a - b)).toEqual(
      [tagB.id, tagC.id].sort((a, b) => a - b),
    );
  });

  it("leaves existing tag associations unchanged when tagIds is omitted", async () => {
    const tag = await createTag({ name: "keep-me" });
    const created = await createTodo({
      title: "leave tags alone",
      tagIds: [tag.id],
    });

    const res = await call("PATCH", `/api/todos/${created.id}`, {
      title: "renamed",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body.tags.map((tag) => tag.id)).toEqual([tag.id]);
  });

  it("clears all tag associations when tagIds is explicitly an empty array", async () => {
    const tag = await createTag({ name: "remove-me" });
    const created = await createTodo({
      title: "clear tags",
      tagIds: [tag.id],
    });

    const res = await call("PATCH", `/api/todos/${created.id}`, {
      tagIds: [],
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TodoResponse;
    expect(body.tags).toEqual([]);
  });

  it("rejects tagIds that do not exist on update and leaves the todo entirely unchanged", async () => {
    const created = await createTodo({ title: "original title" });

    const res = await call("PATCH", `/api/todos/${created.id}`, {
      title: "should not apply",
      tagIds: [999999],
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("One or more tagIds do not exist");

    const getRes = await call("GET", `/api/todos/${created.id}`);
    const getBody = (await getRes.json()) as TodoResponse;
    expect(getBody.title).toBe("original title");
  });
});

describe("DELETE /api/todos/:id", () => {
  it("returns 404 for a non-existent id", async () => {
    const res = await call("DELETE", "/api/todos/999999");

    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Todo not found");
  });

  it("deletes an existing todo, returning 204, and a subsequent GET returns 404", async () => {
    const created = await createTodo({ title: "to delete" });

    const deleteRes = await call("DELETE", `/api/todos/${created.id}`);
    expect(deleteRes.status).toBe(204);
    expect(await deleteRes.text()).toBe("");

    const getRes = await call("GET", `/api/todos/${created.id}`);
    expect(getRes.status).toBe(404);
  });
});

describe("POST /api/tags", () => {
  it("creates a tag with a 1-character name", async () => {
    const res = await call("POST", "/api/tags", { name: "a" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as TagResponse;
    expect(body.name).toBe("a");
    expect(typeof body.id).toBe("number");
  });

  it("creates a tag with a 50-character name", async () => {
    const res = await call("POST", "/api/tags", { name: "a".repeat(50) });

    expect(res.status).toBe(201);
  });

  it("rejects an empty name", async () => {
    const res = await call("POST", "/api/tags", { name: "" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("rejects a 51-character name", async () => {
    const res = await call("POST", "/api/tags", { name: "a".repeat(51) });

    expect(res.status).toBe(400);
  });

  it("rejects a name that duplicates an existing tag", async () => {
    await createTag({ name: "work" });

    const res = await call("POST", "/api/tags", { name: "work" });

    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Tag name already exists");
  });
});

describe("GET /api/tags", () => {
  it("returns an empty array when no tags exist", async () => {
    const res = await call("GET", "/api/tags");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns all tags ordered by id ascending", async () => {
    const first = await createTag({ name: "first" });
    const second = await createTag({ name: "second" });

    const res = await call("GET", "/api/tags");

    expect(res.status).toBe(200);
    const body = (await res.json()) as TagResponse[];
    expect(body.map((tag) => tag.id)).toEqual([first.id, second.id]);
  });
});

describe("PATCH /api/tags/:id", () => {
  it("renames a tag", async () => {
    const created = await createTag({ name: "old-name" });

    const res = await call("PATCH", `/api/tags/${created.id}`, {
      name: "new-name",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TagResponse;
    expect(body.name).toBe("new-name");
  });

  it("allows renaming to the tag's own current name", async () => {
    const created = await createTag({ name: "same-name" });

    const res = await call("PATCH", `/api/tags/${created.id}`, {
      name: "same-name",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as TagResponse;
    expect(body.name).toBe("same-name");
  });

  it("rejects a rename that duplicates a different existing tag", async () => {
    await createTag({ name: "taken" });
    const created = await createTag({ name: "mine" });

    const res = await call("PATCH", `/api/tags/${created.id}`, {
      name: "taken",
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Tag name already exists");
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await call("PATCH", "/api/tags/999999", { name: "x" });

    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Tag not found");
  });
});

describe("DELETE /api/tags/:id", () => {
  it("deletes a tag, returning 204, and a subsequent GET list no longer includes it", async () => {
    const created = await createTag({ name: "to delete" });

    const res = await call("DELETE", `/api/tags/${created.id}`);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");

    const listRes = await call("GET", "/api/tags");
    const body = (await listRes.json()) as TagResponse[];
    expect(body.map((tag) => tag.id)).not.toContain(created.id);
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await call("DELETE", "/api/tags/999999");

    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toBe("Tag not found");
  });

  // Cascade-into-TodoResponse.tags is verified in the "GET /api/todos/:id"
  // describe block below, once tagIds support (T5/T7) makes `tags` meaningful
  // on that response (see worklog: T4/T7 ordering note).
});
