# codekb: shared（横断）

## 公開インターフェース

- `GET /api/todos`・`POST /api/todos`・`GET/PATCH/DELETE /api/todos/:id`（参照: `src/worker/routes/todos.ts`）。`app.route("/api/todos", todosRoute)` で `src/worker/index.ts` にマウント。`POST`/`PATCH` は `tagIds?: number[]` を受け付け、レスポンスの `TodoResponse` は常に `tags: TagResponse[]` を含む。
- `GET /api/tags`・`POST /api/tags`・`PATCH/DELETE /api/tags/:id`（参照: `src/worker/routes/tags.ts`）。`app.route("/api/tags", tagsRoute)` で `src/worker/index.ts` にマウント。タグ名重複は `409`、存在しない `tagIds` の指定は `400`。
- レスポンス型 `TodoResponse`・`TagResponse`・`ErrorResponse`、入力スキーマ `createTodoSchema`・`updateTodoSchema`・`createTagSchema`・`updateTagSchema`（参照: `src/shared/types.ts` / `src/shared/schemas.ts`）。service・ui 両レイヤーが import する共有契約（`docs/architecture.md` 参照）。

## 主要データ構造

- `todos` テーブル（id/title/description/status/priority/dueDate/sortOrder/createdAt/updatedAt。参照: `src/db/schema.ts`）。
- `tags`（id/name〔UNIQUE〕/createdAt/updatedAt）・`todo_tags`（todoId+tagId 複合主キー、両方 `ON DELETE CASCADE`）。tag-management ユニットで実装済み。
- `createdAt`/`updatedAt` は SQLite の `current_timestamp` 形式（`"YYYY-MM-DD HH:MM:SS"`・UTC・`'T'`区切りなし）。ISO 8601 ではない点に注意（消費側で厳密パースする場合は要変換）。

## 再利用可能な部品

- `findTodoById(db, id)` / `findTagsByIds(db, tagIds)`（参照: `src/worker/routes/todos.ts`）: id 指定の 1 件取得・複数 id の存在確認+取得。GET/:id・PATCH・DELETE、`tagIds` の存在チェックで共通化。
- `calculateNextSortOrder(maxSortOrder: number | null): number`（参照: 同上）: 新規行の sort_order 採番（既存最大値+1、0件なら0）。
- `attachTags(db, todoRows)`（参照: 同上）: 複数 TODO に紐づくタグを 1 回の JOIN で一括取得しグルーピングして付与する（N+1 回避パターン）。一覧・単体取得・作成・更新のレスポンス構築で共通利用。
- PATCH の「未指定」と「明示 null（または空配列）」の区別は `"key" in parsed.data` で判定する（Zod の optional は未指定キーを省略するため区別可能。参照: 同上。`tagIds: []` は「全解除」の意味になる）。
- `isUniqueConstraintError(error)`（参照: `src/worker/routes/tags.ts`）: D1 の UNIQUE 制約違反検出。下記「既知の罠」参照。
- `isOverdue(dueDate, status, now?)`（参照: `src/react-app/lib/isOverdue.ts`）: 期限切れ判定。`Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" })` で "YYYY-MM-DD" 文字列を得て日付文字列比較する手法（タイムゾーン計算を自前実装しない）。
- `renderWithQueryClient(ui)` / `jsonResponse(body, status?)`（参照: `src/react-app/test-utils.tsx`）: TanStack Query を使うコンポーネントのテストヘルパー。
- `useTodos()` / `useCreateTodo()` / `useUpdateTodo()` / `useDeleteTodo()`（参照: `src/react-app/hooks/useTodos.ts`）: `ApiError` で service のエラー応答（400/404/500）をラップ。一覧クエリは `retry: false`（エラー即表示のため）。
- `useTags()` / `useCreateTag()` / `useUpdateTag()` / `useDeleteTag()` / `tagMutationErrorMessage(error)`（参照: `src/react-app/hooks/useTags.ts`）: `TagApiError` で 400/404/409 をラップ。`tagMutationErrorMessage` はエラーコード→表示文言変換の共通関数（`TagManagementModal`/`TagMultiSelect` 両方から参照）。`useDeleteTag` は成功時に `tags` と `todos` 両方のクエリキャッシュを invalidate する（タグ削除で TODO 側のタグバッジ表示も追従させるため）。
- `useShowCompleted()`（参照: `src/react-app/hooks/useShowCompleted.ts`）: `localStorage` 連携の表示トグル状態。
- `DeleteConfirmDialog`（参照: `src/react-app/components/DeleteConfirmDialog.tsx`）: 汎用の削除確認ダイアログ。`{title, message, onConfirm, onClose, isPending?}` を受け取る表示専用コンポーネント（mutation の呼び出し・エラー処理は呼び出し側が持つ）。`isPending` を渡さないと連打防止が効かないので、削除系コンポーネントを追加する際は必ず配線すること。

## 既知の罠

- **D1 の UNIQUE 制約違反エラーは `Error.cause` の3階層下にある**（`DrizzleQueryError` → `D1_ERROR` → 生 SQLite エラー）。`error.message` の直接文字列一致では検出できない。`cause` チェーンを辿って判定する必要がある（参照: `src/worker/routes/tags.ts` の `isUniqueConstraintError`。出典: `docs/ai-dlc/retro/tag-management.md`）。
- SQLite の UNIQUE 制約は「自分自身の現在値と同じ値」への UPDATE を重複エラーにしない（PATCH でのリネームが自己名と同一でも成功する。特別な除外分岐は不要）。
- 共有コンポーネント（例: `DeleteConfirmDialog`）を props 汎用化する際、旧実装が持っていた非機能要件（連打防止の `disabled` 等）が新しい呼び出し元全てに配線されているか確認すること。テストで担保されていない非機能要件は self-review でも見落とされやすい（出典: `docs/ai-dlc/retro/tag-management.md`）。
- `@cloudflare/vitest-pool-workers` では v8 のネイティブカバレッジが未サポート（`node:inspector` 未実装でエラー）。Istanbul provider（`@vitest/coverage-istanbul`）を使う（参照: `vitest.config.ts`）。ただし Istanbul でも Workers runtime（workerd）内で収集したカバレッジデータが Node.js 側レポーターへ橋渡しされない未解決issueがあり、service 層（`src/worker/`）の数値は不正確になる。ui 層（jsdom・Node.js プロセス内実行）の数値のみ信頼できる（出典: `docs/ai-dlc/retro/todo-crud-basic.md`）。
- `cloudflare:test` の `env`/`SELF` エクスポートは非推奨（`@deprecated`）。代わりに `cloudflare:workers` の `env`/`exports` を使う（`exports.default.fetch(request)` は Service Binding 形式でループバック呼び出しになるため `env`/`ctx` 引数は渡さない。渡すと型エラーになる）。`applyD1Migrations` は非推奨ではない。
- Vitest 4 の `test.projects` で Workers 環境（`cloudflareTest` プラグイン）と jsdom 環境（`react()` プラグイン）を同一 `vitest.config.ts` 内に共存できる（`test.projects` 配列の各要素に `plugins`/`test.environment` を個別指定）。ルートの `test.include` を絞らないと `.claude/aidlc/` 配下の別プロジェクトのテストまで巻き込む。
- Tailwind CSS v4 は `@tailwindcss/vite` プラグイン + CSS ファイルへの `@import "tailwindcss";` のみでセットアップ完了（v3 系の `tailwind.config.js`/PostCSS 設定は不要）。

## 最終更新

- tag-management / 2026-08-15（本コミットで追加。commit SHA はコミット後に確認）
