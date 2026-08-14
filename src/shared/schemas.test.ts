import { describe, expect, it } from "vitest";
import {
  createTagSchema,
  createTodoSchema,
  updateTagSchema,
  updateTodoSchema,
} from "./schemas";

describe("createTodoSchema", () => {
  it("accepts a title with exactly 1 character", () => {
    expect(createTodoSchema.safeParse({ title: "a" }).success).toBe(true);
  });

  it("accepts a title with exactly 200 characters", () => {
    expect(createTodoSchema.safeParse({ title: "a".repeat(200) }).success).toBe(
      true,
    );
  });

  it("rejects an empty title", () => {
    expect(createTodoSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects a title with 201 characters", () => {
    expect(createTodoSchema.safeParse({ title: "a".repeat(201) }).success).toBe(
      false,
    );
  });

  it("rejects an invalid priority enum value", () => {
    const result = createTodoSchema.safeParse({
      title: "x",
      priority: "URGENT",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a dueDate that is not in YYYY-MM-DD format", () => {
    const result = createTodoSchema.safeParse({
      title: "x",
      dueDate: "2026/08/20",
    });
    expect(result.success).toBe(false);
  });

  it("omits optional fields from the parsed result when not provided", () => {
    const result = createTodoSchema.safeParse({ title: "x" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("description" in result.data).toBe(false);
      expect("priority" in result.data).toBe(false);
      expect("dueDate" in result.data).toBe(false);
    }
  });

  it("strips a status field from the request body (create cannot set status)", () => {
    const result = createTodoSchema.safeParse({ title: "x", status: "DONE" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("status" in result.data).toBe(false);
    }
  });
});

describe("updateTodoSchema", () => {
  it("accepts an empty object (no fields to update)", () => {
    expect(updateTodoSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an empty title on update", () => {
    expect(updateTodoSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects a title with 201 characters on update", () => {
    expect(updateTodoSchema.safeParse({ title: "a".repeat(201) }).success).toBe(
      false,
    );
  });

  it("rejects an invalid status enum value", () => {
    expect(updateTodoSchema.safeParse({ status: "ARCHIVED" }).success).toBe(
      false,
    );
  });

  it("accepts each valid status value", () => {
    for (const status of ["TODO", "IN_PROGRESS", "DONE", "CANCELED"]) {
      expect(updateTodoSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("distinguishes an omitted nullable field from an explicit null", () => {
    const omitted = updateTodoSchema.safeParse({});
    const explicitNull = updateTodoSchema.safeParse({ description: null });

    expect(omitted.success).toBe(true);
    expect(explicitNull.success).toBe(true);
    if (omitted.success && explicitNull.success) {
      expect("description" in omitted.data).toBe(false);
      expect(explicitNull.data.description).toBeNull();
    }
  });
});

describe("createTodoSchema tagIds", () => {
  it("accepts an array of positive integer tagIds", () => {
    const result = createTodoSchema.safeParse({
      title: "x",
      tagIds: [1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an explicit empty tagIds array", () => {
    expect(createTodoSchema.safeParse({ title: "x", tagIds: [] }).success).toBe(
      true,
    );
  });

  it("rejects a non-positive tagId", () => {
    expect(
      createTodoSchema.safeParse({ title: "x", tagIds: [0] }).success,
    ).toBe(false);
  });

  it("omits tagIds from the parsed result when not provided", () => {
    const result = createTodoSchema.safeParse({ title: "x" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("tagIds" in result.data).toBe(false);
    }
  });
});

describe("updateTodoSchema tagIds", () => {
  it("accepts an array of positive integer tagIds", () => {
    expect(updateTodoSchema.safeParse({ tagIds: [1, 2] }).success).toBe(true);
  });

  it("accepts an explicit empty tagIds array", () => {
    expect(updateTodoSchema.safeParse({ tagIds: [] }).success).toBe(true);
  });

  it("rejects a non-positive tagId", () => {
    expect(updateTodoSchema.safeParse({ tagIds: [-1] }).success).toBe(false);
  });

  it("omits tagIds from the parsed result when not provided", () => {
    const result = updateTodoSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect("tagIds" in result.data).toBe(false);
    }
  });
});

describe("createTagSchema", () => {
  it("accepts a name with exactly 1 character", () => {
    expect(createTagSchema.safeParse({ name: "a" }).success).toBe(true);
  });

  it("accepts a name with exactly 50 characters", () => {
    expect(createTagSchema.safeParse({ name: "a".repeat(50) }).success).toBe(
      true,
    );
  });

  it("rejects an empty name", () => {
    expect(createTagSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name with 51 characters", () => {
    expect(createTagSchema.safeParse({ name: "a".repeat(51) }).success).toBe(
      false,
    );
  });
});

describe("updateTagSchema", () => {
  it("accepts a name with exactly 1 character", () => {
    expect(updateTagSchema.safeParse({ name: "a" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(updateTagSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name with 51 characters", () => {
    expect(updateTagSchema.safeParse({ name: "a".repeat(51) }).success).toBe(
      false,
    );
  });

  it("rejects a missing name", () => {
    expect(updateTagSchema.safeParse({}).success).toBe(false);
  });
});
