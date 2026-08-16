import { useState, type KeyboardEvent } from "react";
import {
  createSubtaskSchema,
  type CreateSubtaskInput,
} from "../../shared/schemas";
import type { SubtaskResponse } from "../../shared/types";
import { ApiError } from "../hooks/useTodos";
import {
  useCreateSubtask,
  useDeleteSubtask,
  useSubtasks,
  useUpdateSubtask,
} from "../hooks/useSubtasks";
import Button from "./ui/button";

interface TodoSubtaskListProps {
  todoId: number;
}

function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "サブタスクが見つかりませんでした";
  }
  return "時間をおいて再度お試しください";
}

function TodoSubtaskList({ todoId }: TodoSubtaskListProps) {
  const [title, setTitle] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    data: subtasks = [],
    isLoading,
    isError,
    refetch,
  } = useSubtasks(todoId);
  const createMutation = useCreateSubtask();
  const updateMutation = useUpdateSubtask();
  const deleteMutation = useDeleteSubtask();
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  function handleMutationError(error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      void refetch();
    }
    setRequestError(mutationErrorMessage(error));
  }

  function handleCreate() {
    setInputError(null);
    setRequestError(null);

    const result = createSubtaskSchema.safeParse({ title });
    if (!result.success) {
      setInputError("サブタスクは1〜200文字で入力してください");
      return;
    }

    const input: CreateSubtaskInput = result.data;
    createMutation.mutate(
      { todoId, input },
      {
        onSuccess: () => setTitle(""),
        onError: handleMutationError,
      },
    );
  }

  function handleCreateKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    handleCreate();
  }

  function handleToggle(subtask: SubtaskResponse) {
    setRequestError(null);
    updateMutation.mutate(
      {
        todoId,
        subtaskId: subtask.id,
        input: { completed: !subtask.completed },
      },
      { onError: handleMutationError },
    );
  }

  function handleDelete(subtask: SubtaskResponse) {
    setRequestError(null);
    deleteMutation.mutate(
      { todoId, subtaskId: subtask.id },
      { onError: handleMutationError },
    );
  }

  return (
    <section aria-labelledby="todo-subtasks-heading" className="space-y-2">
      <h3
        id="todo-subtasks-heading"
        className="text-sm font-medium text-text-secondary sm:text-xs"
      >
        サブタスク
      </h3>
      <div
        role="group"
        aria-label="サブタスク追加フォーム"
        className="flex items-start gap-2"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={`subtask-title-${todoId}`} className="sr-only">
            サブタスクのタイトル
          </label>
          <input
            id={`subtask-title-${todoId}`}
            type="text"
            maxLength={200}
            value={title}
            onKeyDown={handleCreateKeyDown}
            onChange={(event) => {
              setTitle(event.target.value);
              setInputError(null);
              setRequestError(null);
            }}
            placeholder="サブタスクを追加"
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm text-text-primary sm:text-xs"
          />
          {inputError && (
            <p className="mt-1 text-sm text-danger">{inputError}</p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="サブタスクを追加"
          onClick={handleCreate}
          disabled={isMutating}
          className="min-h-11 shrink-0 rounded-xl px-3 text-sm sm:text-xs"
        >
          追加
        </Button>
      </div>

      {isLoading && (
        <p role="status" className="text-sm text-text-tertiary sm:text-xs">
          サブタスクを読み込み中…
        </p>
      )}
      {isError && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-danger sm:text-xs">
            サブタスクの取得に失敗しました
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="rounded-xl text-sm sm:text-xs"
          >
            再試行
          </Button>
        </div>
      )}

      {!isLoading && !isError && subtasks.length === 0 && (
        <p className="text-sm text-text-tertiary sm:text-xs">
          サブタスクはありません
        </p>
      )}

      {!isLoading && !isError && subtasks.length > 0 && (
        <ul aria-label="サブタスク一覧" className="space-y-1">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-surface px-2"
            >
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={() => handleToggle(subtask)}
                disabled={isMutating}
                aria-label={`サブタスク「${subtask.title}」を${subtask.completed ? "未完了に戻す" : "完了にする"}`}
                className="h-5 w-5 shrink-0 accent-primary"
              />
              <span
                className={`min-w-0 flex-1 break-words text-sm sm:text-xs ${subtask.completed ? "text-text-tertiary line-through" : "text-text-primary"}`}
              >
                {subtask.title}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`サブタスク「${subtask.title}」を削除`}
                onClick={() => handleDelete(subtask)}
                disabled={isMutating}
                className="min-h-11 min-w-11 shrink-0 rounded-xl text-text-tertiary hover:bg-danger-bg hover:text-danger"
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}

      {requestError && (
        <p role="alert" className="text-sm text-danger sm:text-xs">
          {requestError}
        </p>
      )}
    </section>
  );
}

export default TodoSubtaskList;
