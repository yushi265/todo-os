import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from "../../shared/schemas";
import type { SubtaskResponse } from "../../shared/types";
import { requestJson, requestVoid } from "../lib/api";
import { ApiError, TODOS_QUERY_KEY } from "./useTodos";

export const SUBTASKS_QUERY_KEY = ["subtasks"] as const;

export function subtaskQueryKey(todoId: number) {
  return [...SUBTASKS_QUERY_KEY, todoId] as const;
}

const createSubtaskApiError = (status: number, message: string) =>
  new ApiError(status, message);

async function fetchSubtasks(todoId: number): Promise<SubtaskResponse[]> {
  return requestJson(
    `/api/todos/${todoId}/subtasks`,
    undefined,
    createSubtaskApiError,
  );
}

interface SubtaskMutationArgs {
  todoId: number;
  subtaskId: number;
}

async function createSubtask(
  todoId: number,
  input: CreateSubtaskInput,
): Promise<SubtaskResponse> {
  return requestJson(
    `/api/todos/${todoId}/subtasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    createSubtaskApiError,
  );
}

async function updateSubtask(
  args: SubtaskMutationArgs & { input: UpdateSubtaskInput },
): Promise<SubtaskResponse> {
  return requestJson(
    `/api/todos/${args.todoId}/subtasks/${args.subtaskId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.input),
    },
    createSubtaskApiError,
  );
}

async function deleteSubtask(args: SubtaskMutationArgs): Promise<void> {
  return requestVoid(
    `/api/todos/${args.todoId}/subtasks/${args.subtaskId}`,
    { method: "DELETE" },
    createSubtaskApiError,
  );
}

export function useSubtasks(
  todoId: number,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: subtaskQueryKey(todoId),
    queryFn: () => fetchSubtasks(todoId),
    retry: false,
    enabled: options.enabled ?? true,
  });
}

function invalidateSubtaskQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  todoId: number,
) {
  void queryClient.invalidateQueries({ queryKey: subtaskQueryKey(todoId) });
  void queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      todoId,
      input,
    }: {
      todoId: number;
      input: CreateSubtaskInput;
    }) => createSubtask(todoId, input),
    onSuccess: (_subtask, { todoId }) =>
      invalidateSubtaskQueries(queryClient, todoId),
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSubtask,
    onSuccess: (_subtask, { todoId }) =>
      invalidateSubtaskQueries(queryClient, todoId),
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubtask,
    onSuccess: (_result, { todoId }) =>
      invalidateSubtaskQueries(queryClient, todoId),
  });
}
