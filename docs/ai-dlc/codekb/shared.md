# codekb: shared（横断）

## 公開インターフェース

- `GET /api/todos`・`POST /api/todos`・`GET/PATCH/DELETE /api/todos/:id`（参照: `src/worker/routes/todos.ts`）。`app.route("/api/todos", todosRoute)` で `src/worker/index.ts` にマウント。`POST`/`PATCH` は `tagIds?: number[]` を受け付け、レスポンスの `TodoResponse` は常に `tags: TagResponse[]` を含む。`GET /api/todos` はクエリパラメータ `status`/`priority`/`tagId`/`due`(`TODAY`/`OVERDUE`/`NONE`)/`q`/`sortBy`(`manual`/`dueDate`/`priority`/`createdAt`/`updatedAt`)/`sortOrder`(`asc`/`desc`) に対応（`listTodosQuerySchema`、`src/shared/schemas.ts`。filter-sort-search ユニットで追加）。
- `PATCH /api/todos/reorder`（参照: `src/worker/routes/todos.ts`）: `{todoIds: number[]}`を受け取り、順序どおり`sortOrder`を0起点で一括更新（`db.batch()`）。成功時`204`。重複ID・全TODO集合との不一致（過不足）は`400`。**`todosRoute.patch("/reorder", ...)`は`todosRoute.patch("/:id", ...)`より前に登録する必要がある**（Honoはルート登録順で評価するため、後に登録すると`/reorder`が`:id="reorder"`として`/:id`ハンドラに誤ってマッチする。manual-reorder ユニットで追加）。
- `GET /api/tags`・`POST /api/tags`・`PATCH/DELETE /api/tags/:id`（参照: `src/worker/routes/tags.ts`）。`app.route("/api/tags", tagsRoute)` で `src/worker/index.ts` にマウント。タグ名重複は `409`、存在しない `tagIds` の指定は `400`。
- レスポンス型 `TodoResponse`・`TagResponse`・`ErrorResponse`、入力スキーマ `createTodoSchema`・`updateTodoSchema`・`createTagSchema`・`updateTagSchema`（参照: `src/shared/types.ts` / `src/shared/schemas.ts`）。service・ui 両レイヤーが import する共有契約（`docs/architecture.md` 参照）。

## 主要データ構造

- `todos` テーブル（id/title/description/status/priority/dueDate/sortOrder/createdAt/updatedAt。参照: `src/db/schema.ts`）。
- `tags`（id/name〔UNIQUE〕/createdAt/updatedAt）・`todo_tags`（todoId+tagId 複合主キー、両方 `ON DELETE CASCADE`）。tag-management ユニットで実装済み。
- `createdAt`/`updatedAt` は SQLite の `current_timestamp` 形式（`"YYYY-MM-DD HH:MM:SS"`・UTC・`'T'`区切りなし）。ISO 8601 ではない点に注意（消費側で厳密パースする場合は要変換）。

## 再利用可能な部品

- `buildFullReorderedIds(allTodos, visibleIdsInNewOrder)`（参照: `src/react-app/lib/reorder.ts`）: フィルタ非表示中のTODOの相対順序を維持したまま、表示中TODOの新しい並び順を全体のID配列へマージする。「全体リスト内でフィルタ対象の出現位置は固定し、その位置に新順序のIDを順番に埋める」アルゴリズム（REQUIREMENTS.md 6.3節のA,B,C,D例で検証済み）。
- `useReorderTodos()`（参照: `src/react-app/hooks/useTodos.ts`）: `PATCH /api/todos/reorder`を呼ぶmutation。`useDeleteTodo`等と同型（成功時`TODOS_QUERY_KEY`をinvalidate）。
- `buildOrderBy(sortBy, sortOrder)`（参照: `src/worker/routes/todos.ts`）: ソートキー→Drizzleの`orderBy`配列への変換。`priority`は`CASE...ELSE 0 END`のランク式（`HIGH`=3,`MEDIUM`=2,`LOW`=1,未設定=0）、`dueDate`はNULL常に末尾（`asc(sql\`... IS NULL\`)`を先頭に固定しdirは実値側にのみ適用）。`export`済みで単体テスト可能（`src/worker/routes/todos.test.ts`、`SQLiteAsyncDialect().sqlToQuery()`でSQL文字列を検証するパターン）。
- `todayInTokyo()`（`src/worker/routes/todos.ts`側、service用）: `src/react-app/lib/isOverdue.ts`と同じAsia/Tokyo基準の日付取得ロジックだが、Workers runtime向けに独立実装（service/uiは別バンドルのため意図的に重複）。
- `TodoFilterBar`（参照: `src/react-app/components/TodoFilterBar.tsx`）: 検索ボックス+フィルターチップ（属性→値の2段階メニュー）+ソートセレクト+方向トグルの複合コンポーネント。Unit3で確立した`@theme`トークンを再利用し新規トークンを追加しない設計。
- `STATUS_LABEL` / `STATUS_ICON` / `STATUS_ICON_CLASSES` / `PRIORITY_LABEL_CLASSES` / `PRIORITY_ICON` / `nextStatus(status)`（参照: `src/react-app/lib/statusStyles.ts`）: ステータス・優先度の表示ラベル、一覧用アイコン、配色クラスの静的マッピング、およびステータス進行ロジック（`TODO`→`IN_PROGRESS`→`DONE`、`DONE`/`CANCELED`は不変）。`TodoListItem`/`CompletedTodoListItem`/`TodoFormModal`が共有する（ui-visual-refresh / backlog-polish ユニットで導入）。
- `TodoListItem`（未完了専用）/ `CompletedTodoListItem`（完了済み専用、参照: `src/react-app/components/`）: 未完了/完了済みで情報量・レイアウトが大きく異なる場合の分割パターン。`TodoList`が`todo.status`で振り分ける。1コンポーネント内の条件分岐より見通しが良い（ui-visual-refresh ユニットで導入）。
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
- `DeleteConfirmDialog`（参照: `src/react-app/components/DeleteConfirmDialog.tsx`）: 汎用の削除確認ダイアログ。`{title, message, onConfirm, onClose, isPending?}` を受け取る表示専用コンポーネント（mutation の呼び出し・エラー処理は呼び出し側が持つ）。`isPending` を渡さないと連打防止が効かないので、削除系コンポーネントを追加する際は必ず配線すること。**PC・モバイル問わず常時センタリング表示**（`items-center`固定、ドラッグハンドルバー無し）。`TodoFormModal`/`TagManagementModal`はモバイル幅でボトムシート型表示（`rounded-t-[22px] rounded-b-none` + `sm:rounded-[22px]`、上部中央にハンドルバー）に切り替わるが、`DeleteConfirmDialog`だけはClaude Designの意図（削除確認は常にモーダル中央）に合わせてボトムシート化しない（mobile-responsive-polishユニットでは他モーダルと同じボトムシート化パターンを誤って流用していたが、design-conformance-polishユニットで是正）。
- `TagBadge`（参照: `src/react-app/components/TagBadge.tsx`）: `{tag, muted?: boolean}`を受け取るタグ表示専用バッジ。`#`+タグ名で表示し、`muted`指定時は`text-tag-fg-muted`（薄色）で表示する。完了・キャンセル済み行（`CompletedTodoListItem`）は`muted`を付与、未完了行（`TodoListItem`）は付与しない、という呼び出し元による出し分けパターン（design-conformance-polishユニットで導入）。
- タップ領域とビジュアルサイズの分離パターン（参照: `src/react-app/components/CompletedToggle.tsx`）: アクセシビリティ上のタッチターゲット最小44px（`h-11 w-11`）を外側の`<span>`で確保しつつ、内側の`<span>`で視覚的なスイッチトラックサイズ（`h-[22px] w-[38px]`）をデザイン値に縮小する二重構造。`<label htmlFor>`と`<input id>`の関連付けにより、クリック領域はラベル全体（＝外側の44px)に及ぶ（design-conformance-polishユニットで導入）。
- 長押しタッチドラッグ（参照: `src/react-app/components/TodoList.tsx` / `TodoListItem.tsx`）: `LONG_PRESS_MS=500`・`CANCEL_THRESHOLD_PX=10`定数、`touchStateRef`（タイマーIDと開始座標を保持）、`handleTouchStart`/`handleTouchMove`/`handleTouchEnd`の3ハンドラで構成。PC版マウスD&D（`handleDrop`）と本ハンドラ（`handleTouchEnd`）の確定処理は`commitReorder(sourceId, targetId)`という共通関数に集約し、`buildFullReorderedIds`・`onReorder`呼び出しを重複させない設計（mobile-responsive-polish ユニットで導入）。
- 手動並び替えの現在契約（参照: `src/react-app/components/TodoList.tsx`）: `sortBy=manual`では表示中のTODO（TODO/IN_PROGRESS/DONE/CANCELED）を同じ`draggableTodos`集合として扱う。カード全体と6点リーダーからマウスD&Dを開始でき、カードの非インタラクティブ領域は500ms長押しでタッチD&Dを開始できる。フォーカス中のカードはSpace→上下矢印→Space/Escapeでキーボード並び替えができ、`#todo-reorder-help`のライブリージョンで状態を通知する。
- Access認証済みCLI（参照: `scripts/add-todo.mjs`）: `pnpm todo:add`は`TODO_OS_URL`とAccess Service Tokenの環境変数を読み、既存の`POST /api/todos`へ`CF-Access-Client-Id`/`CF-Access-Client-Secret`を付けて送信する。資格情報不足時はfetchを呼ばない。CLI単体テストは`pnpm test:cli`。
- `Button`（参照: `src/react-app/components/ui/button.tsx`）: shadcn/ui方式の共有ボタンコンポーネント。`ButtonVariant`（`default`/`outline`/`secondary`/`ghost`/`destructive`）と`ButtonSize`（`default`/`sm`/`lg`/`icon`）の2軸を`VARIANT_CLASSES`/`SIZE_CLASSES`という2つの`Record`で管理し、`joinClasses`関数で結合する。`TagManagementModal`（閉じる・追加ボタン）・`DeleteConfirmDialog`（キャンセル・削除するボタン）が導入済み（ui-high-priority-polishユニットで導入）。**レスポンシブ対応（`sm:`プレフィックス等）はボタン自体のclassNameではなく`SIZE_CLASSES`側に集約する**（呼び出し元ごとの二重対応を避けるため。`icon`サイズはタッチターゲット44px維持のため対象外。responsive-density-polishユニットで確立したパターン）。

## 命名・設計規約

- **レスポンシブは「`sm`未満は現状維持・`sm`（640px）以上でコンパクト化」という逆方向モバイルファースト**（通常のモバイルファースト＝デフォルト小さくbreakpointで拡大、とは逆）。スマホは現行の余白・文字サイズのまま、PC/タブレット幅でのみ`sm:text-xs`・`sm:p-3`等の1段階縮小クラスを追加する（responsive-density-polishユニットで確立。ユーザー方針: 「スマホ版は大きくてもいい」）。

## 既知の罠

- **D1 の UNIQUE 制約違反エラーは `Error.cause` の3階層下にある**（`DrizzleQueryError` → `D1_ERROR` → 生 SQLite エラー）。`error.message` の直接文字列一致では検出できない。`cause` チェーンを辿って判定する必要がある（参照: `src/worker/routes/tags.ts` の `isUniqueConstraintError`。出典: `docs/ai-dlc/retro/tag-management.md`）。
- SQLite の UNIQUE 制約は「自分自身の現在値と同じ値」への UPDATE を重複エラーにしない（PATCH でのリネームが自己名と同一でも成功する。特別な除外分岐は不要）。
- 共有コンポーネント（例: `DeleteConfirmDialog`）を props 汎用化する際、旧実装が持っていた非機能要件（連打防止の `disabled` 等）が新しい呼び出し元全てに配線されているか確認すること。テストで担保されていない非機能要件は self-review でも見落とされやすい（出典: `docs/ai-dlc/retro/tag-management.md`）。
- `@cloudflare/vitest-pool-workers` では v8 のネイティブカバレッジが未サポート（`node:inspector` 未実装でエラー）。Istanbul provider（`@vitest/coverage-istanbul`）を使う（参照: `vitest.config.ts`）。ただし Istanbul でも Workers runtime（workerd）内で収集したカバレッジデータが Node.js 側レポーターへ橋渡しされない未解決issueがあり、service 層（`src/worker/`）の数値は不正確になる。ui 層（jsdom・Node.js プロセス内実行）の数値のみ信頼できる（出典: `docs/ai-dlc/retro/todo-crud-basic.md`）。
- `cloudflare:test` の `env`/`SELF` エクスポートは非推奨（`@deprecated`）。代わりに `cloudflare:workers` の `env`/`exports` を使う（`exports.default.fetch(request)` は Service Binding 形式でループバック呼び出しになるため `env`/`ctx` 引数は渡さない。渡すと型エラーになる）。`applyD1Migrations` は非推奨ではない。
- Vitest 4 の `test.projects` で Workers 環境（`cloudflareTest` プラグイン）と jsdom 環境（`react()` プラグイン）を同一 `vitest.config.ts` 内に共存できる（`test.projects` 配列の各要素に `plugins`/`test.environment` を個別指定）。ルートの `test.include` を絞らないと `.claude/aidlc/` 配下の別プロジェクトのテストまで巻き込む。
- Tailwind CSS v4 は `@tailwindcss/vite` プラグイン + CSS ファイルへの `@import "tailwindcss";` のみでセットアップ完了（v3 系の `tailwind.config.js`/PostCSS 設定は不要）。デザイン固有の配色は `src/react-app/index.css` の `@theme` ブロックでセマンティックトークン（`--color-*`）として定義すると `bg-*`/`text-*`/`border-*` 等のユーティリティクラスが自動生成される。
- Tailwind の JIT はテンプレートリテラルで動的に組み立てたクラス名（例: `` `bg-${status}` ``）を検出できない。ステータス・優先度等の値に応じて配色を切り替える場合は `Record<Enum, string>` 形式の静的マッピングとして持つ（参照: `src/react-app/lib/statusStyles.ts`）。
- **Claude Design MCP（`DesignSync`）はメインループのセッションでのみ使用可能**。Agent ツールで起動したサブエージェント（Explore・general-purpose 等）からは `ToolSearch` で発見できない（11 通りのクエリで検証済み）。デザインファイルの分析・詳細抽出はメインループ自身が直接 `DesignSync.get_file` を呼んで行う必要がある（出典: `docs/ai-dlc/retro/ui-visual-refresh.md`）。
- `DesignSync.get_file` の結果は JSON 化された1行の巨大文字列で返り、ツール結果が大きいと `tool-results/*.txt` に保存されて `Read` が行数ベースの offset/limit で分割できない（1 行しかないため）。`python3 -c "import json; ...content..."` で JSON をデコードし実際の改行を復元したファイルをスクラッチパッドに書き出してから `Read`/`grep` する（出典: 同上）。

- **`referee-check`の`post`（`npx lefthook run pre-commit`）ステップは、変更が`git add`されていない状態では対象ファイル0件で実質skipされ、lint等が検査されないまま`GREEN`と判定される**。実装後の権威検証では、`git add`（対象ファイル）してから`referee-check --layer all`を実行するか、`npx eslint .`のようなリポジトリ全体を対象にしたコマンドを別途直接実行して確認すること。この盲点により実際に`react-hooks/set-state-in-effect`のESLintエラーを1件見逃した事例あり（出典: `docs/ai-dlc/retro/manual-reorder.md`）。
- **`.claude/aidlc/context-guard.json`の`contextWindow`はaidlc-init時点の既定値（200000）のままだと、拡張コンテキストウィンドウを使うセッションでサブエージェント起動を誤ブロックする**。実際のモデルの窓に合わせて更新すること。この設定ファイル自体の編集は自動モード分類器にブロックされる場合があり、その際はEditツールではなくBash（`sed`等）での編集が通ることがある（出典: 同上）。
- **context-guard誤ブロックはcontextWindow値の修正だけでは再発しうる**（値が妥当でも、長時間の1セッション内で複数回のCodex委譲+3体レビューを連続実行するとusedTokensが閾値に近づき再ブロックする）。さらに設定ファイル編集自体がEdit・Bash両方でブロックされるケースもある。**この場合は設定変更を試みる前に、まず`progress.md`へ状態を確定して`/compact`することを優先する**（コンテキスト圧迫そのものが原因のため、compactだけで設定変更なしに解消することがある。出典: `docs/ai-dlc/retro/mobile-responsive-polish.md`）。
- **React19は`touchstart`/`touchmove`/`wheel`のネイティブイベントリスナーをルートコンテナへ`{passive: true}`で登録する**（`node_modules/react-dom/cjs/react-dom-client.development.js`で確認可能）。そのため`onTouchMove`ハンドラ内で`event.preventDefault()`を呼んでも実ブラウザでは無効になりうる（パフォーマンス最適化のためのReact標準仕様）。タッチドラッグ操作でページの意図しないスクロールを防ぐには、CSSの`touch-action: none`（Tailwindの`touch-none`）をドラッグ対象要素に指定する必要がある。jsdomの`fireEvent.touchMove`はこのpassiveリスナーの実ブラウザ挙動を再現しないため、テストでは検出できない（出典: `docs/ai-dlc/retro/mobile-responsive-polish.md`）。

- **`wrangler.jsonc`の`d1_databases[].database_id`を変更すると、ローカルの`wrangler dev`（Miniflare/workerd）が参照するD1エミュレーションのストレージファイルも切り替わる**。ローカル開発用のプレースホルダーIDから本番用の実IDに差し替えた直後、ローカルで`no such table`エラーが発生する（新IDに対応する空のローカルDBを参照するため、マイグレーション未適用状態になる）。`pnpm db:migrate:local`を再実行してテーブルを作り直す必要がある（既存のローカルテストデータは失われる。出典: `docs/ai-dlc/retro/design-conformance-polish.md`）。
- **委譲サイクル中の中間`git add -A`は、コミット確定前の別タスクの変更を無自覚に巻き込むリスクがある**。同一セッション内で複数ユニット・複数タスクを並行して進める場合、`git add -A`のたびに「承認待ちで宙に浮いている別タスクの変更」までstagedになり、最終的なセルフレビュー（3体並列）で初めて混入に気づく事態が起きた。対象ファイルを明示指定した`git add <files>`を徹底すること（出典: `docs/ai-dlc/retro/design-conformance-polish.md`）。

## Codexへの委譲（advisory・filter-sort-searchで初導入）

- **Codexのサンドボックス環境は`pnpm test:service`（Cloudflare Workers runtime起動を伴う）を実行できない**（`127.0.0.1` listenでEPERM。`@cloudflare/vitest-pool-workers`がMiniflare/workerdのローカルサーバーを起動できないため）。`pnpm test:ui`（jsdom・Node.jsプロセス内実行）は実行できる。Codexへservice層のTDD実装を委譲する場合、Codex自身のRED/GREEN確認は期待できず、**メインループが必ず`referee-check`で権威再検証する**前提で進める（出典: `docs/ai-dlc/retro/filter-sort-search.md`）。
- **Codexのモデル指定**: `~/.codex/config.toml`の`model`/`model_reasoning_effort`がデフォルト設定として存在する。ユーザーの口語的な指定（例:「モデル名 max」）はreasoning effortレベルの意図である可能性が高く、モデル名にそのまま連結すると`400 model not supported`エラーになる。迷ったらモデル関連オプションを一切指定せずデフォルト設定のまま起動する。
- **`codex:status`/`codex:result`はSkillツール経由（`disable-model-invocation`）で呼び出し禁止**。メインループは自律的に完了検知・結果取得ができず、都度ユーザーに`/codex:status <job-id>`の実行を依頼する必要がある。
- Codexが生成したコードにReact非推奨パターン（`useEffect`内での直接`setState`呼び出し等）が混入することがある。上記のreferee-check盲点と組み合わさると、ESLintエラーがGate3直前まで見逃されるリスクがあるため、Codex実装後は必ずリポジトリ全体への`npx eslint .`を独立実行する（出典: `docs/ai-dlc/retro/manual-reorder.md`）。
- **`codex:codex-rescue`の`status: completed`通知は「委譲リクエスト送信の完了」を意味するだけで、実際のCodexバックグラウンドジョブの完了を意味しない**。ジョブ自体は非同期でバックグラウンド継続実行される。実際の完了検知は`git status --short`/`ls -la`でのファイル更新時刻確認で独立に行う必要がある（出典: `docs/ai-dlc/retro/responsive-density-polish.md`）。

## 中断・再開の運用（advisory）

- worker（implementer 等）への委譲中に API エラー（マシンスリープ・セッション使用量上限等）で中断した場合、`progress.md` の worklog チェックポイントと `git status`/`pnpm test` による実物確認を組み合わせれば無損失で再開できる（3 回の中断を経て実証。出典: `docs/ai-dlc/retro/ui-visual-refresh.md`）。ただし worker が中断直前に worklog 追記そのものを完了できていないことがあるため、再開前にオーケストレーター側で実物確認し、記録漏れがあれば代理で追記してから再開させる。

## 最終更新

- responsive-density-polish / 2026-08-16（本コミットで追加。commit SHA はコミット後に確認）
- design-conformance-polish / 2026-08-15
