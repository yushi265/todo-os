import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTodoInput, UpdateTodoInput } from "../../shared/schemas";
import type {
  ErrorResponse,
  TodoPriority,
  TodoResponse,
  TodoStatus,
} from "../../shared/types";

export const TODOS_QUERY_KEY = ["todos"] as const;

export interface TodoFilters {
  status: TodoStatus | null;
  priority: TodoPriority | null;
  tagId: number | null;
  due: "TODAY" | "OVERDUE" | "NONE" | null;
}

export type SortBy =
  "manual" | "dueDate" | "priority" | "createdAt" | "updatedAt";

export interface ListTodosParams {
  search?: string;
  filters?: TodoFilters;
  sortBy?: SortBy;
  sortOrder?: "asc" | "desc";
}

/** service（Hono API）からのエラー応答を表す。ui 層のエラー分岐（400/404/500）に使う。 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ErrorResponse;
    return new ApiError(res.status, body.error || `HTTP ${res.status}`);
  } catch {
    return new ApiError(res.status, `HTTP ${res.status}`);
  }
}

export async function fetchTodos(
  params: ListTodosParams = {},
): Promise<TodoResponse[]> {
  const query = new URLSearchParams();
  const filters = params.filters;

  if (filters?.status !== null && filters?.status !== undefined) {
    query.set("status", filters.status);
  }
  if (filters?.priority !== null && filters?.priority !== undefined) {
    query.set("priority", filters.priority);
  }
  if (filters?.tagId !== null && filters?.tagId !== undefined) {
    query.set("tagId", String(filters.tagId));
  }
  if (filters?.due !== null && filters?.due !== undefined) {
    query.set("due", filters.due);
  }
  if (params.search) query.set("q", params.search);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);

  const queryString = query.toString();
  const res = await fetch(
    queryString ? `/api/todos?${queryString}` : "/api/todos",
  );
  if (!res.ok) {
    throw await toApiError(res);
  }
  return (await res.json()) as TodoResponse[];
}

async function createTodo(input: CreateTodoInput): Promise<TodoResponse> {
  const res = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return (await res.json()) as TodoResponse;
}

interface UpdateTodoArgs {
  id: number;
  input: UpdateTodoInput;
}

async function updateTodo({
  id,
  input,
}: UpdateTodoArgs): Promise<TodoResponse> {
  const res = await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return (await res.json()) as TodoResponse;
}

async function deleteTodo(id: number): Promise<void> {
  const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw await toApiError(res);
  }
}

/**
 * TODO 一覧取得（AC-3）。
 * 失敗時は自動リトライせず即座に isError にする（ui 側は手動の「再試行」ボタンで再取得する設計）。
 */
export function useTodos(params: ListTodosParams = {}) {
  return useQuery({
    queryKey: [...TODOS_QUERY_KEY, params],
    queryFn: () => fetchTodos(params),
    retry: false,
  });
}

/** TODO 作成（AC-1, AC-2, AC-8）。成功時に一覧キャッシュを invalidate する。 */
export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}

/** TODO 更新（AC-5, AC-8, AC-9）。成功時に一覧キャッシュを invalidate する。 */
export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTodo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}

/** TODO 削除（AC-6, AC-9）。成功時に一覧キャッシュを invalidate する。 */
export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
