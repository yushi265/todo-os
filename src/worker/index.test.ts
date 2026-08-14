import { beforeEach, describe, expect, it } from "vitest";
import { env, exports } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { todos } from "../db/schema";
import type { ErrorResponse, TodoResponse } from "../shared/types";

const BASE_URL = "https://example.com";

// D1 storage in this pool persists across `it()` blocks within the same test
// file (no automatic per-test snapshot/rollback for D1), so each test starts
// from a clean `todos` table explicitly.
beforeEach(async () => {
  await drizzle(env.DB).delete(todos);
});

function buildRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`${BASE_URL}${path}`, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
