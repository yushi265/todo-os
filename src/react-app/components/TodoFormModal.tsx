import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createTodoSchema, updateTodoSchema } from "../../shared/schemas";
import type { TodoResponse, TodoStatus } from "../../shared/types";
import { ApiError, useCreateTodo, useUpdateTodo } from "../hooks/useTodos";
import TagMultiSelect from "./TagMultiSelect";

type PriorityValue = "" | "HIGH" | "MEDIUM" | "LOW";

interface FormValues {
  title: string;
  description: string;
  priority: PriorityValue;
  dueDate: string;
  status: TodoStatus;
  tagIds: number[];
}

interface TodoFormModalProps {
  isEdit: boolean;
  todo: TodoResponse | null;
  onClose: () => void;
  onNotFound: () => void;
}

const STATUS_OPTIONS: { value: TodoStatus; label: string }[] = [
  { value: "TODO", label: "未着手" },
  { value: "IN_PROGRESS", label: "進行中" },
  { value: "DONE", label: "完了" },
  { value: "CANCELED", label: "中止" },
];

function initialValues(todo: TodoResponse | null): FormValues {
  if (!todo) {
    return {
      title: "",
      description: "",
      priority: "",
      dueDate: "",
      status: "TODO",
      tagIds: [],
    };
  }
  return {
    title: todo.title,
    description: todo.description ?? "",
    priority: todo.priority ?? "",
    dueDate: todo.dueDate ?? "",
    status: todo.status,
    tagIds: todo.tags.map((tag) => tag.id),
  };
}

function fieldErrorMessage(field: string): string {
  switch (field) {
    case "title":
      return "タイトルは1〜200文字で入力してください";
    case "dueDate":
      return "期限はYYYY-MM-DD形式で入力してください";
    default:
      return "入力内容を確認してください";
  }
}

function TodoFormModal({
  isEdit,
  todo,
  onClose,
  onNotFound,
}: TodoFormModalProps) {
  const [values, setValues] = useState<FormValues>(() => initialValues(todo));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function handleMutationError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        onNotFound();
        onClose();
        return;
      }
      if (error.status === 400) {
        // tagIds の存在チェック違反（サーバー側の防御的分岐。タグ削除と TODO 編集が
        // 同時に行われた場合の競合等）はタグ選択欄の直下にエラーを表示する（ui.md 異常系挙動）。
        if (error.message.toLowerCase().includes("tagid")) {
          setFieldErrors((prev) => ({
            ...prev,
            tagIds: "指定したタグが存在しません。タグの選択を見直してください",
          }));
          return;
        }
        setSubmitError(error.message || "入力内容を確認してください");
        return;
      }
    }
    setSubmitError("時間をおいて再度お試しください");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const rawPayload = {
      title: values.title,
      description: values.description === "" ? null : values.description,
      priority: values.priority === "" ? null : values.priority,
      dueDate: values.dueDate === "" ? null : values.dueDate,
      tagIds: values.tagIds,
    };

    if (isEdit && todo) {
      const result = updateTodoSchema.safeParse({
        ...rawPayload,
        status: values.status,
      });
      if (!result.success) {
        setFieldErrors(collectFieldErrors(result.error.issues));
        return;
      }
      updateMutation.mutate(
        {
          id: todo.id,
          input: {
            title: result.data.title,
            description: result.data.description ?? null,
            priority: result.data.priority ?? null,
            dueDate: result.data.dueDate ?? null,
            status: result.data.status,
            tagIds: result.data.tagIds ?? [],
          },
        },
        { onSuccess: onClose, onError: handleMutationError },
      );
      return;
    }

    const result = createTodoSchema.safeParse(rawPayload);
    if (!result.success) {
      setFieldErrors(collectFieldErrors(result.error.issues));
      return;
    }
    createMutation.mutate(
      {
        title: result.data.title,
        description: result.data.description ?? null,
        priority: result.data.priority ?? null,
        dueDate: result.data.dueDate ?? null,
        tagIds: result.data.tagIds ?? [],
      },
      { onSuccess: onClose, onError: handleMutationError },
    );
  }

  function collectFieldErrors(
    issues: { path: PropertyKey[] }[],
  ): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in errors)) {
        errors[field] = fieldErrorMessage(field);
      }
    }
    return errors;
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "TODOを編集" : "TODOを作成"}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[22px] rounded-b-none bg-card p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:rounded-[22px] sm:p-6"
      >
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-10 rounded-full bg-border sm:hidden"
        />
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          {isEdit ? "TODOを編集" : "TODOを作成"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="todo-title"
              className="text-sm font-medium text-text-secondary"
            >
              タイトル
            </label>
            <input
              id="todo-title"
              ref={titleRef}
              type="text"
              maxLength={200}
              value={values.title}
              onChange={(e) =>
                setValues((v) => ({ ...v, title: e.target.value }))
              }
              className="min-h-11 rounded-xl border border-border px-3 py-2 text-text-primary"
            />
            {fieldErrors.title && (
              <p className="text-sm text-danger">{fieldErrors.title}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="todo-description"
              className="text-sm font-medium text-text-secondary"
            >
              説明
            </label>
            <textarea
              id="todo-description"
              rows={3}
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
              className="rounded-xl border border-border px-3 py-2 text-text-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="todo-priority"
              className="text-sm font-medium text-text-secondary"
            >
              優先度
            </label>
            <select
              id="todo-priority"
              value={values.priority}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  priority: e.target.value as PriorityValue,
                }))
              }
              className="min-h-11 rounded-xl border border-border px-3 py-2 text-text-primary"
            >
              <option value="">未設定</option>
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="todo-due-date"
              className="text-sm font-medium text-text-secondary"
            >
              期限
            </label>
            <input
              id="todo-due-date"
              type="date"
              value={values.dueDate}
              onChange={(e) =>
                setValues((v) => ({ ...v, dueDate: e.target.value }))
              }
              className="min-h-11 rounded-xl border border-border px-3 py-2 text-text-primary"
            />
            {fieldErrors.dueDate && (
              <p className="text-sm text-danger">{fieldErrors.dueDate}</p>
            )}
          </div>

          <TagMultiSelect
            selectedTagIds={values.tagIds}
            onChange={(tagIds) => setValues((v) => ({ ...v, tagIds }))}
          />
          {fieldErrors.tagIds && (
            <p className="text-sm text-danger">{fieldErrors.tagIds}</p>
          )}

          {isEdit && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="todo-status"
                className="text-sm font-medium text-text-secondary"
              >
                ステータス
              </label>
              <div className="flex gap-2">
                <select
                  id="todo-status"
                  value={values.status}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      status: e.target.value as TodoStatus,
                    }))
                  }
                  className="min-h-11 flex-1 rounded-xl border border-border px-3 py-2 text-text-primary"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {/* ✓ 完了にする（AC-4）: フォーム内 state のみ変更し、送信（PATCH）は発火しない。
                    status が既に DONE の間は不要な操作のため非表示にする（自己非表示）。 */}
                {values.status !== "DONE" && (
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, status: "DONE" }))}
                    className="min-h-11 shrink-0 rounded-xl bg-status-done-bg px-3 text-sm font-medium text-status-done-fg hover:opacity-90"
                  >
                    ✓ 完了にする
                  </button>
                )}
              </div>
            </div>
          )}

          {submitError && (
            <p role="alert" className="text-sm text-danger">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 py-2 text-text-secondary hover:bg-surface"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-primary-hover disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TodoFormModal;
