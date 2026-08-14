# codekb: shared（横断）

## 公開インターフェース

- `GET /api/todos`・`POST /api/todos`・`GET/PATCH/DELETE /api/todos/:id`（参照: `src/worker/routes/todos.ts`）。`app.route("/api/todos", todosRoute)` で `src/worker/index.ts` にマウント。
- レスポンス型 `TodoResponse`・`ErrorResponse`、入力スキーマ `createTodoSchema`・`updateTodoSchema`（参照: `src/shared/types.ts` / `src/shared/schemas.ts`）。service・ui 両レイヤーが import する共有契約（`docs/architecture.md` 参照）。

## 主要データ構造

- `todos` テーブル（id/title/description/status/priority/dueDate/sortOrder/createdAt/updatedAt。参照: `src/db/schema.ts`）。`tags`/`todo_tags` は定義済みだが未使用（タグ機能は未実装）。
- `createdAt`/`updatedAt` は SQLite の `current_timestamp` 形式（`"YYYY-MM-DD HH:MM:SS"`・UTC・`'T'`区切りなし）。ISO 8601 ではない点に注意（消費側で厳密パースする場合は要変換）。

## 再利用可能な部品

- `findTodoById(db, id)`（参照: `src/worker/routes/todos.ts`）: id 指定の 1 件取得。GET/:id・PATCH・DELETE で共通化。
- `calculateNextSortOrder(maxSortOrder: number | null): number`（参照: 同上）: 新規行の sort_order 採番（既存最大値+1、0件なら0）。
- PATCH の「未指定」と「明示 null」の区別は `"key" in parsed.data` で判定する（Zod の optional は未指定キーを省略するため区別可能。参照: 同上）。
- `isOverdue(dueDate, status, now?)`（参照: `src/react-app/lib/isOverdue.ts`）: 期限切れ判定。`Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" })` で "YYYY-MM-DD" 文字列を得て日付文字列比較する手法（タイムゾーン計算を自前実装しない）。
- `renderWithQueryClient(ui)` / `jsonResponse(body, status?)`（参照: `src/react-app/test-utils.tsx`）: TanStack Query を使うコンポーネントのテストヘルパー。
- `useTodos()` / `useCreateTodo()` / `useUpdateTodo()` / `useDeleteTodo()`（参照: `src/react-app/hooks/useTodos.ts`）: `ApiError` で service のエラー応答（400/404/500）をラップ。一覧クエリは `retry: false`（エラー即表示のため）。
- `useShowCompleted()`（参照: `src/react-app/hooks/useShowCompleted.ts`）: `localStorage` 連携の表示トグル状態。

## 既知の罠

- `@cloudflare/vitest-pool-workers` では v8 のネイティブカバレッジが未サポート（`node:inspector` 未実装でエラー）。Istanbul provider（`@vitest/coverage-istanbul`）を使う（参照: `vitest.config.ts`）。ただし Istanbul でも Workers runtime（workerd）内で収集したカバレッジデータが Node.js 側レポーターへ橋渡しされない未解決issueがあり、service 層（`src/worker/`）の数値は不正確になる。ui 層（jsdom・Node.js プロセス内実行）の数値のみ信頼できる（出典: `docs/ai-dlc/retro/todo-crud-basic.md`）。
- `cloudflare:test` の `env`/`SELF` エクスポートは非推奨（`@deprecated`）。代わりに `cloudflare:workers` の `env`/`exports` を使う（`exports.default.fetch(request)` は Service Binding 形式でループバック呼び出しになるため `env`/`ctx` 引数は渡さない。渡すと型エラーになる）。`applyD1Migrations` は非推奨ではない。
- Vitest 4 の `test.projects` で Workers 環境（`cloudflareTest` プラグイン）と jsdom 環境（`react()` プラグイン）を同一 `vitest.config.ts` 内に共存できる（`test.projects` 配列の各要素に `plugins`/`test.environment` を個別指定）。ルートの `test.include` を絞らないと `.claude/aidlc/` 配下の別プロジェクトのテストまで巻き込む。
- Tailwind CSS v4 は `@tailwindcss/vite` プラグイン + CSS ファイルへの `@import "tailwindcss";` のみでセットアップ完了（v3 系の `tailwind.config.js`/PostCSS 設定は不要）。

## 最終更新

- todo-crud-basic / 2026-08-15（本コミットで追加。commit SHA はコミット後に確認）
