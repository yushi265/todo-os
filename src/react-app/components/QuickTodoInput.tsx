import { useState } from "react";
import type { FormEvent } from "react";
import { createTodoSchema } from "../../shared/schemas";
import { ApiError, useCreateTodo } from "../hooks/useTodos";

function QuickTodoInput() {
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createMutation = useCreateTodo();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const result = createTodoSchema.safeParse({ title: title.trim() });
    if (!result.success) {
      setErrorMessage("タイトルは1〜200文字で入力してください");
      return;
    }

    createMutation.mutate(
      { title: result.data.title },
      {
        onSuccess: () => setTitle(""),
        onError: (error) => {
          if (error instanceof ApiError && error.status === 400) {
            setErrorMessage("入力内容を確認してください");
            return;
          }
          setErrorMessage("時間をおいて再度お試しください");
        },
      },
    );
  }

  return (
    <form
      aria-label="TODOのクイック追加フォーム"
      onSubmit={handleSubmit}
      className="mb-4 flex flex-wrap gap-2"
    >
      <label htmlFor="quick-todo-title" className="sr-only">
        クイック追加
      </label>
      <input
        id="quick-todo-title"
        type="text"
        maxLength={200}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="TODOを入力してEnterで追加"
        aria-describedby={errorMessage ? "quick-todo-error" : undefined}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
      />
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {createMutation.isPending ? "追加中…" : "追加"}
      </button>
      {errorMessage && (
        <p
          id="quick-todo-error"
          role="alert"
          className="basis-full text-sm text-danger"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}

export default QuickTodoInput;
