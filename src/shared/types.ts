export type TodoStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";
export type TodoPriority = "HIGH" | "MEDIUM" | "LOW";

export interface TagResponse {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoResponse {
  id: number;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  tags: TagResponse[];
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
}
