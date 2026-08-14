import { z } from "zod";

const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  dueDate: z.string().regex(DUE_DATE_PATTERN).nullable().optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  dueDate: z.string().regex(DUE_DATE_PATTERN).nullable().optional(),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
