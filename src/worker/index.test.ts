import { describe, expect, it } from "vitest";
import { exports } from "cloudflare:workers";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const request = new Request("https://example.com/api/health");
    const res = await exports.default.fetch(request);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/todos", () => {
  it("returns an empty array when no todos exist", async () => {
    const request = new Request("https://example.com/api/todos");
    const res = await exports.default.fetch(request);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
