import { useState } from "react";
import type { FormEvent } from "react";
import { createTodoSchema } from "../../shared/schemas";
import type { TagResponse } from "../../shared/types";
import { ApiError, useCreateTodo } from "../hooks/useTodos";
import Button from "./ui/button";

interface QuickTodoInputProps {
  tags?: TagResponse[];
}

function QuickTodoInput({ tags = [] }: QuickTodoInputProps) {
  const [title, setTitle] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createMutation = useCreateTodo();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const payload = {
      title: title.trim(),
      ...(selectedTagId !== null ? { tagIds: [selectedTagId] } : {}),
    };
    const result = createTodoSchema.safeParse(payload);
    if (!result.success) {
      setErrorMessage("タイトルは1〜200文字で入力してください");
      return;
    }

    createMutation.mutate(result.data, {
      onSuccess: () => {
        setTitle("");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 400) {
          setErrorMessage("入力内容を確認してください");
          return;
        }
        setErrorMessage("時間をおいて再度お試しください");
      },
    });
  }

  return (
    <form
      aria-label="TODOのクイック追加フォーム"
      onSubmit={handleSubmit}
      className="mb-0 flex flex-col gap-2"
    >
      <div className="flex min-w-0 gap-2">
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
        {tags.length > 0 && (
          <div className="shrink-0">
            <label htmlFor="quick-todo-tag" className="sr-only">
              追加時のタグ
            </label>
            <select
              id="quick-todo-tag"
              aria-label="追加時のタグ"
              value={selectedTagId ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedTagId(value === "" ? null : Number(value));
              }}
              className="min-h-11 w-28 rounded-xl border border-border bg-card px-2 py-2 text-sm text-text-primary sm:w-36 sm:text-xs"
            >
              <option value="">タグなし</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  #{tag.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button
          variant="default"
          type="submit"
          disabled={createMutation.isPending}
          className="min-h-11 shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? "追加中…" : "追加"}
        </Button>
      </div>
      {errorMessage && (
        <p id="quick-todo-error" role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

export default QuickTodoInput;
