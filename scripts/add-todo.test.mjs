import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addTodo, buildRequest, parseArgs } from "./add-todo.mjs";

describe("add-todo CLI", () => {
  it("parses the title and optional TODO fields", () => {
    assert.deepEqual(
      parseArgs([
        "--title",
        "  調査する  ",
        "--description",
        "公式資料を読む",
        "--priority",
        "HIGH",
        "--due-date",
        "2026-08-20",
        "--tag-id",
        "3",
        "--tag-id",
        "5",
      ]),
      {
        title: "  調査する  ",
        description: "公式資料を読む",
        priority: "HIGH",
        dueDate: "2026-08-20",
        tagIds: [3, 5],
      },
    );
  });

  it("builds a request for the existing API with Access service-token headers", () => {
    const request = buildRequest(
      { title: "追加する", description: undefined, tagIds: [] },
      {
        TODO_OS_URL: "https://todo.example.com/",
        TODO_OS_ACCESS_CLIENT_ID: "client-id",
        TODO_OS_ACCESS_CLIENT_SECRET: "client-secret",
      },
    );

    assert.equal(request.url, "https://todo.example.com/api/todos");
    assert.equal(request.init.method, "POST");
    assert.equal(request.init.headers["CF-Access-Client-Id"], "client-id");
    assert.equal(
      request.init.headers["CF-Access-Client-Secret"],
      "client-secret",
    );
    assert.deepEqual(JSON.parse(request.init.body), { title: "追加する" });
  });

  it("does not build an unauthenticated request when credentials are missing", () => {
    assert.throws(
      () =>
        buildRequest(
          { title: "追加する", tagIds: [] },
          { TODO_OS_URL: "https://todo.example.com" },
        ),
      /TODO_OS_ACCESS_CLIENT_ID/,
    );
  });

  it("returns the API response and sends the request once", async () => {
    const calls = [];
    const todo = { id: 9, title: "追加済み" };
    const result = await addTodo(
      { title: "追加済み", tagIds: [] },
      {
        TODO_OS_URL: "https://todo.example.com",
        TODO_OS_ACCESS_CLIENT_ID: "client-id",
        TODO_OS_ACCESS_CLIENT_SECRET: "client-secret",
      },
      async (url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify(todo), { status: 201 });
      },
    );

    assert.deepEqual(result, todo);
    assert.equal(calls.length, 1);
  });
});
