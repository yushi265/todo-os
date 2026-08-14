# todo-crud-basic: ui 詳細設計

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: タイトル（1〜200文字必須）・説明（任意）・優先度（HIGH/MEDIUM/LOW、任意）・期限（YYYY-MM-DD、任意）を指定して TODO を作成できる。ステータスは常に `TODO` で作成され、作成リクエストで指定することはできない
- **AC-3**: TODO 一覧は `sort_order` 昇順で表示され、各行にタイトル・ステータス・優先度・期限を表示する
- **AC-4**: 期限が本日（Asia/Tokyo 基準）より前で、かつステータスが `TODO` または `IN_PROGRESS`（未完了）の TODO は、一覧上で視覚的に判別できる（期限切れ表示）
- **AC-5**: 既存 TODO のタイトル・説明・ステータス・優先度・期限を編集できる。ステータスは `TODO`/`IN_PROGRESS`/`DONE`/`CANCELED` の 4 値間を遷移制約なく自由に変更できる
- **AC-6**: TODO を削除できる。削除操作には確認ダイアログを伴い、確認後に物理削除される。キャンセルした場合は削除されない
- **AC-7**: 終了済み（`DONE`/`CANCELED`）TODO は一覧でデフォルト非表示。表示トグルを ON にすると表示され、OFF にすると再度非表示になる。トグルの状態は `localStorage` に保持され、再読み込み後も維持される
- **AC-8**: タイトル未入力（0文字）、または 201 文字以上での TODO 作成・更新はエラーとなり、TODO は作成・更新されない
  （本レイヤーはエラー表示を担当。バリデーション自体は service.md）
- **AC-9**: 存在しない TODO ID に対する取得（GET）・更新（PATCH）・削除（DELETE）はエラー（404）になる
  （本レイヤーはエラー表示を担当）

## このレイヤーが公開する契約（外部インターフェース）

画面パスはルーティングなしの単一ページ（`/`）。本ユニットでは画面遷移を持たない。

| 操作 | 名前 / パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|------|------------|-----------------|-------------------|------|
| 追加 | `/`（TODO一覧画面） | 表示: TODO一覧・追加ボタン・完了表示トグル | Cloudflare Access（画面遷移前提。アプリコードでの追加チェックなし） | 唯一の画面 |

コンポーネント構成（`src/react-app/` 配下）:

```
App.tsx                      … ルート。QueryClientProvider は main.tsx に既存
components/
  TodoListPage.tsx            … TanStack Query でデータ取得・状態の出し分けを統括
  TodoList.tsx                … 一覧表示（表示対象は TodoListPage がフィルタ済みの配列を渡す）
  TodoListItem.tsx             … 1 行。期限切れ判定・クリックで編集モーダルを開く
  TodoFormModal.tsx            … 作成/編集共通モーダル（isEdit props で分岐）
  DeleteConfirmDialog.tsx      … 削除確認
  CompletedToggle.tsx          … 終了済み表示トグル（チェックボックス）
hooks/
  useTodos.ts                  … TanStack Query（GET /api/todos）+ create/update/delete mutation
  useShowCompleted.ts           … localStorage 連携フック（AC-7）
lib/
  isOverdue.ts                  … 期限切れ判定関数（AC-4。Asia/Tokyo 基準）
```

`src/shared/schemas.ts`（service.md 参照）の `createTodoSchema` / `updateTodoSchema` を `TodoFormModal` のクライアント側バリデーションに再利用する（service と同一のバリデーションルールを二重管理しない）。`src/shared/types.ts` の `TodoResponse` を `useTodos` のレスポンス型として使う。

## このレイヤーが依存する下位の契約（呼び出す相手）

- 呼び出す相手: [service.md](./service.md) の `GET/POST /api/todos`・`PATCH/DELETE /api/todos/:id`（単体 `GET /api/todos/:id` は未使用。編集モーダルは一覧取得済みデータをそのまま初期値にするため呼び出さない）
- 受け渡し: `fetch()` + TanStack Query（`useQuery`/`useMutation`）。認証情報は Cloudflare Access がブラウザ Cookie で自動付与するため、アプリコードでのトークン受け渡しは不要。

## UI/UX 方針

- **画面フロー / 導線**: 単一画面（TODO 一覧）。ヘッダーの「+ 追加」ボタン → 作成モーダル。各行クリック → 編集モーダル（同一コンポーネント、初期値を該当 TODO で埋める）。各行の削除ボタン → 削除確認ダイアログ → 確認で `DELETE` 実行。
- **主要操作とフィードバック**:
  - 作成/更新成功 → モーダルを閉じ、TanStack Query のキャッシュを invalidate して一覧に即反映
  - 削除成功 → 一覧から即消える（invalidate）
  - バリデーションエラー（クライアント側 Zod 相当 + サーバー 400 応答）→ モーダルを閉じずフィールド直下にエラーメッセージ表示
  - 404（対象が既に削除済み等）→ トースト的な通知 + 一覧再取得
- **状態設計（出し分け）**:
  - 初期 / ローディング: 一覧取得中はスケルトンまたはスピナー表示
  - 空（0件）: 「TODO はまだありません」+ 作成導線の強調
  - エラー（一覧取得失敗）: エラーメッセージ + 再試行ボタン
  - 成功: 一覧表示（終了済みトグルの状態でフィルタ済み）
- **既存デザインシステムとの整合**: 新規プロジェクトのため既存デザインシステムなし。Tailwind CSS v4（`tailwindcss` / `@tailwindcss/vite`、npm 確認済み最新 v4.3.3）をユーティリティクラスとして採用する（Gate 1 で人間確認済み・[index.md](./index.md) 判断根拠）。

### レスポンシブ / アクセシビリティ（表示層は必須・空通過不可）

- **対象端末**: PC / タブレット / スマートフォン（REQUIREMENTS.md 15章）
- **主対象ブレークポイント**: Tailwind CSS 既定値を使用（`sm: 640px` / `md: 768px` / `lg: 1024px`）。一覧は `md` 未満でカード的な縦積みレイアウト、`md` 以上で横並び行レイアウト。
- **タブレット崩れ許容度**: 本ユニットでは基本レイアウトの破綻がない範囲まで対応する。細部の最適化（余白・フォントサイズの微調整）は後続ユニットで許容。
- **スマホ方針**: モーダルは画面幅いっぱいに近い表示（余白最小化）。タップ領域は44px相当を確保。
- **a11y 最低限**: フォーム input に `<label>` を紐付け、モーダルは `role="dialog"` + `aria-modal="true"` + 開いた時にフォーカスを先頭要素へ移動、削除ボタン等アイコンのみの操作要素に `aria-label` を付与。

## 異常系挙動

| シナリオ | 本レイヤーの挙動（表示・ログ） |
|---|---|
| 一覧取得（`GET /api/todos`）失敗 | エラーメッセージ + 再試行ボタンを表示。一覧は表示しない |
| 作成・更新のバリデーションエラー（クライアント側 Zod 検証） | モーダルを閉じずフィールド直下にエラーメッセージを表示 |
| 作成・更新のバリデーションエラー（サーバー `400`。クライアントと同一スキーマ共有のため通常到達しない防御的分岐） | モーダルを閉じずフォーム下部の汎用エラー欄にエラーメッセージを表示 |
| 更新・削除対象が既に存在しない（`404`） | トースト通知「対象の TODO が見つかりませんでした」+ 一覧を再取得してモーダル/ダイアログを閉じる |
| サーバー内部エラー（`500`） | 汎用エラーメッセージ表示（「時間をおいて再度お試しください」） |

## テストケース（技法注記付き）

- [代表値] `isOverdue()`: 期限が昨日・ステータス `TODO` → `true`
- [境界値] `isOverdue()`: 期限が本日（Asia/Tokyo基準） → `false`（本日は期限切れ扱いにしない）
- [デシジョンテーブル] `isOverdue()`: 期限あり×未完了=判定対象 / 期限あり×完了済み(DONE/CANCELED)=常に`false` / 期限なし=常に`false`
- [代表値] `useShowCompleted()`: 初期状態（localStorage未設定）→ `false`（デフォルト非表示）
- [代表値] `useShowCompleted()`: `true` に設定 → `localStorage.getItem("showCompletedTodos")` が `"true"` になる
- [境界値] `useShowCompleted()`: 再マウント後も設定値を維持する（localStorage からの読み込み）
- [代表値] `TodoList`: 終了済みトグル OFF で `DONE`/`CANCELED` の TODO が一覧に表示されない
- [代表値] `TodoList`: 終了済みトグル ON で全ステータスの TODO が表示される
- [代表値] `TodoFormModal`: タイトル入力＋送信 → 作成 mutation が呼ばれる
- [境界値] `TodoFormModal`: タイトル空文字で送信 → クライアント側バリデーションでエラー表示、mutation は呼ばれない
- [代表値] `TodoFormModal`: 編集モードで開くと既存値がフォームに初期表示される
- [代表値] `DeleteConfirmDialog`: 確認ボタン押下 → delete mutation が呼ばれる
- [代表値] `DeleteConfirmDialog`: キャンセル押下 → mutation は呼ばれずダイアログが閉じる
- [代表値] `TodoListPage`: 一覧が空配列 → 空状態メッセージを表示
- [代表値] `TodoListPage`: 取得エラー → エラーメッセージ + 再試行ボタンを表示
