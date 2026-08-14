import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTagInput, UpdateTagInput } from "../../shared/schemas";
import type { ErrorResponse, TagResponse } from "../../shared/types";
import { TODOS_QUERY_KEY } from "./useTodos";

export const TAGS_QUERY_KEY = ["tags"] as const;

/** service（Hono API）からのエラー応答を表す。ui 層のエラー分岐（400/404/409/500）に使う。 */
export class TagApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TagApiError";
    this.status = status;
  }
}

async function toTagApiError(res: Response): Promise<TagApiError> {
  try {
    const body = (await res.json()) as ErrorResponse;
    return new TagApiError(res.status, body.error || `HTTP ${res.status}`);
  } catch {
    return new TagApiError(res.status, `HTTP ${res.status}`);
  }
}

/**
 * タグ作成・リネームの mutation エラーを表示用メッセージへ変換する（異常系挙動表）。
 * TagManagementModal・TagMultiSelect の両方から呼ばれる共通ロジックのため、ここに集約する。
 */
export function tagMutationErrorMessage(error: unknown): string {
  if (error instanceof TagApiError) {
    if (error.status === 409) {
      return "同じ名前のタグが既に存在します";
    }
    if (error.status === 400) {
      return "タグ名は1〜50文字で入力してください";
    }
  }
  return "時間をおいて再度お試しください";
}

async function fetchTags(): Promise<TagResponse[]> {
  const res = await fetch("/api/tags");
  if (!res.ok) {
    throw await toTagApiError(res);
  }
  return (await res.json()) as TagResponse[];
}

async function createTag(input: CreateTagInput): Promise<TagResponse> {
  const res = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toTagApiError(res);
  }
  return (await res.json()) as TagResponse;
}

interface UpdateTagArgs {
  id: number;
  input: UpdateTagInput;
}

async function updateTag({ id, input }: UpdateTagArgs): Promise<TagResponse> {
  const res = await fetch(`/api/tags/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toTagApiError(res);
  }
  return (await res.json()) as TagResponse;
}

async function deleteTag(id: number): Promise<void> {
  const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw await toTagApiError(res);
  }
}

/**
 * タグ一覧取得（AC-8）。
 * 失敗時は自動リトライせず即座に isError にする（ui 側は手動の「再試行」ボタンで再取得する設計）。
 */
export function useTags() {
  return useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: fetchTags,
    retry: false,
  });
}

/** タグ作成（AC-1）。成功時にタグ一覧キャッシュを invalidate する。 */
export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
}

/** タグ名変更（AC-2）。成功時にタグ一覧キャッシュを invalidate する。 */
export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });
}

/**
 * タグ削除（AC-3）。成功時にタグ一覧・TODO一覧の両方のキャッシュを invalidate する
 * （削除で関連付けが解除された TODO のタグバッジ表示を追従させるため）。
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
