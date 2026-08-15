import { z } from "zod";

const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  dueDate: z.string().regex(DUE_DATE_PATTERN).nullable().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  dueDate: z.string().regex(DUE_DATE_PATTERN).nullable().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
});

export const reorderTodosSchema = z.object({
  todoIds: z.array(z.number().int().positive()),
});

export const listTodosQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  tagId: z.coerce.number().int().positive().optional(),
  due: z.enum(["TODAY", "OVERDUE", "NONE"]).optional(),
  q: z.string().optional(),
  sortBy: z
    .enum(["manual", "dueDate", "priority", "createdAt", "updatedAt"])
    .optional()
    .default("manual"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type ReorderTodosInput = z.infer<typeof reorderTodosSchema>;
export type ListTodosQuery = z.infer<typeof listTodosQuerySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
