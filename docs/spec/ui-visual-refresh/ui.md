# ui-visual-refresh: ui 詳細設計

> [index.md](./index.md) の実装 spec。対象: `src/react-app/` 配下の表示層。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: TODO 一覧の各アイテム（未完了）が、デザイン準拠の配色・レイアウト（カード型・角丸・ステータス別アイコン色）で表示される。
- **AC-2**: 未完了 TODO（ステータスが `TODO` または `IN_PROGRESS`）のステータスアイコンをクリックすると、`TODO`→`IN_PROGRESS`→`DONE` の順に1段階だけステータスが進む。一覧カードにはステータス文字を重複表示しない。`DONE`・`CANCELED` の TODO にはこの操作 UI 自体が提供されない。
- **AC-3**: ステータス進行操作が成功した場合、変更内容のトースト通知と「元に戻す」ボタンが表示される。`DONE` 到達時のメッセージは「「{タイトル}」を完了にしました」、それ以外の進行時はステータス変更を知らせる。
- **AC-4**: TODO 編集モーダルで、現在のステータスが `DONE` 以外の場合に「✓ 完了にする」ボタンが表示される。クリックするとフォーム内のステータス値が `DONE` に変わる（保存自体はフォームの送信操作で行う。ボタン押下だけでは PATCH は発火しない）。
- **AC-5**: 完了・キャンセル済み TODO が、デザイン準拠の配色・レイアウト（アイコン+取り消し線タイトル、`DONE`=緑チェック / `CANCELED`=グレー×）で表示される。
- **AC-6**: TODO 作成/編集モーダル・削除確認ダイアログ・タグ管理モーダル（タグ削除確認含む）・トースト通知が、デザイン準拠の配色・角丸・シャドウで表示される。
- **AC-7**: 既存の非機能要件が全て維持される（回帰なし）: 二重送信防止（`isPending` 系の `disabled`）・aria 属性（`role="dialog"`/`aria-modal`/`aria-label`/`role="status"`/`role="alert"`/`aria-pressed`）・フォーカス管理（モーダル開時の初期フォーカス）・キーボード操作（タグ編集の Enter/Escape）・イベント伝播制御（削除ボタンの `stopPropagation`）・異常系のステータスコード別分岐（404/409/400）・`data-testid`。

## デザイントークン（`src/react-app/index.css` に `@theme` で追加）

Claude Design（`TodoOS v2.dc.html`）から抽出した確定値。既存の `@import "tailwindcss";` の後に追記する。

```css
@import "tailwindcss";

@theme {
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-surface: #f4f4f2;
  --color-card: #ffffff;

  --color-text-primary: #1c1c1e;
  --color-text-secondary: #48484a;
  --color-text-tertiary: #8e8e93;
  --color-text-quaternary: #aeaeb2;
  --color-text-faint: #c7c7cc;

  --color-border: #e3e3e0;
  --color-border-subtle: #ececea;
  --color-border-dashed: #d6d6d3;

  --color-danger: #dc2626;
  --color-danger-bg: #fee2e2;

  --color-status-todo-bg: #f2f2f0;
  --color-status-todo-fg: #636366;
  --color-status-inprogress-bg: #e7e5ff;
  --color-status-inprogress-fg: #4f46e5;
  --color-status-done-bg: #dcf5e7;
  --color-status-done-fg: #0d9459;
  --color-status-canceled-bg: #f2f2f0;
  --color-status-canceled-fg: #aeaeb2;

  --color-priority-high: #dc2626;
  --color-priority-medium: #c07c10;
  --color-priority-low: #8e8e93;

  --color-tag-bg: #f2f2f0;
  --color-tag-fg: #636366;
  --color-tag-fg-muted: #c7c7cc;

  --color-chip-bg: #eef1ff;
  --color-chip-border: #c7d2fe;
  --color-chip-fg: #4338ca;
}
```

- 角丸: カード `rounded-2xl`（16px 相当）、モーダルパネル `rounded-[22px]`、ボタン `rounded-xl`（12px 相当）、バッジ/ピル `rounded-full`。
- シャドウ: カード `shadow-[0_1px_2px_rgba(0,0,0,0.03)]`、カード hover `shadow-[0_4px_16px_rgba(0,0,0,0.07)]`、プライマリボタン `shadow-[0_4px_14px_rgba(79,70,229,0.3)]`、モーダル `shadow-[0_24px_70px_rgba(0,0,0,0.28)]`、`CompletedToggle` のスイッチつまみ `shadow-[0_1px_2px_rgba(0,0,0,0.2)]`（実装時追加・Tailwind v4 にシャドウのセマンティックトークンが無いため他箇所と同様 arbitrary value）。
- トースト背景色: 専用トークンは設けず、既存の `--color-text-primary`（`#1c1c1e`）を `bg-text-primary` として背景色に転用する（黒に近い最も暗い色でトースト表現として自然なため。命名は「文字色」由来だが、実装時にこの用途で採用・2 箇所〔`TodoListPage`/`TagManagementModal`〕で一貫適用）。
- `TagMultiSelect` のタグチップ配色: 未選択 = `bg-tag-bg`/`text-tag-fg`（`TagBadge` と共用）、選択済み = `bg-chip-bg`/`border-chip-border`/`text-chip-fg`（フィルターチップと同トークン）。
- ステータス・優先度別のクラス名は Tailwind の動的クラス名検出制約のため、以下の形で静的マッピングとして持つ（`lib/statusStyles.ts` 新設）:

```ts
export const STATUS_ICON_CLASSES: Record<TodoStatus, string> = {
  TODO: "bg-status-todo-bg text-status-todo-fg",
  IN_PROGRESS: "bg-status-inprogress-bg text-status-inprogress-fg",
  DONE: "bg-status-done-bg text-status-done-fg",
  CANCELED: "bg-status-canceled-bg text-status-canceled-fg",
};
export const STATUS_LABEL: Record<TodoStatus, string> = {
  TODO: "未着手", IN_PROGRESS: "進行中", DONE: "完了", CANCELED: "中止",
};
export const PRIORITY_LABEL_CLASSES: Record<TodoPriority, { label: string; className: string }> = {
  HIGH: { label: "優先度: 高", className: "text-priority-high" },
  MEDIUM: { label: "優先度: 中", className: "text-priority-medium" },
  LOW: { label: "優先度: 低", className: "text-priority-low" },
};
export const PRIORITY_ICON: Record<TodoPriority, string> = {
  HIGH: "▲", MEDIUM: "◆", LOW: "▽",
};
```

既存の `TodoListItem.tsx` にあった `STATUS_LABEL`/`PRIORITY_LABEL` 定数マップはこのファイルへ統合する。一覧カードでは `STATUS_LABEL` と `PRIORITY_LABEL_CLASSES.label` を文字表示には使わず、ステータス・優先度アイコンの `aria-label`/`title` に意味を補足する。

## このレイヤーが公開する契約（外部インターフェース）

表示層のみの変更のため、外部 API パス・データスキーマの追加/変更は無い。コンポーネントの props 契約を以下のとおり確定する。

| コンポーネント | 変更種別 | props | 備考 |
|---|---|---|---|
| `TodoListItem` | 変更 | `{ todo: TodoResponse; onClick: (todo) => void; onDeleteClick: (todo) => void; onAdvanceStatus: (todo: TodoResponse) => void }` | **未完了専用**に用途を絞る。`onAdvanceStatus` を新規追加（呼び出し元 `TodoList` が配線）。完了済み todo は本コンポーネントに渡さない（`TodoList` 側で振り分け） |
| `CompletedTodoListItem`（新規） | 追加 | `{ todo: TodoResponse; onClick: (todo) => void; onDeleteClick: (todo) => void }` | 完了済み専用の表示コンポーネント。アイコン+取り消し線タイトル+更新日時+タグ、削除ボタンのみ。UTCで保存された `updatedAt`（SQLite の生文字列または ISO 文字列）を `Asia/Tokyo` の `YYYY/MM/DD HH:mm` に変換して表示する |
| `TodoList` | 変更 | 既存のまま（`TodoListProps`）。内部で `todo.status` により `TodoListItem` / `CompletedTodoListItem` を振り分けて描画 | `onAdvanceStatus` を追加で受け取り `TodoListItem` へ配線。呼び出し元は `TodoListPage` |
| `TodoListPage` | 変更 | 既存のまま。内部で `useUpdateTodo()` を用いて `handleAdvanceStatus` を実装し `TodoList` へ渡す | 新規 mutation 呼び出しの追加のみ。ページ外枠に `min-h-screen bg-surface` を追加（カード型 `TodoListItem`〔白背景〕とのコントラストを出すため。`--color-surface` トークンを使用） |
| `TodoFormModal` | 変更 | 既存のまま（`TodoFormModalProps` に変更なし） | 内部に「✓ 完了にする」ボタンを追加。フォーム内 state 操作のみで新規 props 不要 |
| `CompletedToggle` | 変更 | 既存のまま（`CompletedToggleProps` に変更なし） | 内部見た目のみ iOS 風スイッチに変更。`checked`/`onChange` 契約は不変 |
| `DeleteConfirmDialog`, `TagManagementModal`, `TagBadge`, `TagMultiSelect` | 変更 | 既存のまま props 変更なし | 配色・spacing のみ刷新 |

## このレイヤーが依存する下位の契約（呼び出す相手）

- 呼び出す相手: 既存 `service` レイヤーの `PATCH /api/todos/:id`（[codekb/shared.md](../../ai-dlc/codekb/shared.md) 参照。契約変更なし）。
- 受け渡し: ステータス進行は `useUpdateTodo().mutate({ id: todo.id, input: { status: nextStatus(todo.status) } })` のみ送信する（他フィールドは送らない。既存の PATCH は部分更新に対応済み）。
- 「✓ 完了にする」ボタンは通信を発生させない（フォーム内 state 変更のみ。送信は既存の `onSubmitForm` に委ねる）。

## 実装配置

- `src/react-app/index.css` — `@theme` トークン追加
- `src/react-app/lib/statusStyles.ts`（新設） — `STATUS_ICON_CLASSES` / `STATUS_LABEL` / `PRIORITY_LABEL_CLASSES` / `PRIORITY_ICON` / `nextStatus()`
- `src/react-app/lib/statusStyles.test.ts`（新設） — `nextStatus()` の単体テスト
- `src/react-app/components/TodoListItem.tsx`（変更） — 未完了専用レイアウトへ刷新、`onAdvanceStatus` 追加
- `src/react-app/components/CompletedTodoListItem.tsx`（新設） — 完了済み専用レイアウト
- `src/react-app/components/CompletedTodoListItem.test.tsx`（新設）
- `src/react-app/components/TodoList.tsx`（変更） — 振り分けロジック追加
- `src/react-app/components/TodoListPage.tsx`（変更） — `handleAdvanceStatus` 追加・ヘッダー配色刷新
- `src/react-app/components/TodoFormModal.tsx`（変更） — 「✓ 完了にする」ボタン追加・配色刷新
- `src/react-app/components/DeleteConfirmDialog.tsx`（変更） — 配色刷新のみ
- `src/react-app/components/CompletedToggle.tsx`（変更） — iOS 風スイッチへ変更
- `src/react-app/components/TagManagementModal.tsx`（変更） — 配色刷新のみ
- `src/react-app/components/TagBadge.tsx`（変更） — 配色刷新のみ
- `src/react-app/components/TagMultiSelect.tsx`（変更） — 配色刷新のみ

## UI/UX 方針

- **画面フロー / 導線**: 既存のまま変更なし（一覧 → クリックで編集モーダル、+追加ボタンで作成モーダル、タグ管理ボタンでタグモーダル、削除ボタンで確認ダイアログ）。新規導線はステータスアイコンのクリックによる進行のみ（一覧上で完結、画面遷移なし）。
- **主要操作とフィードバック**:
  - ステータスアイコンのクリック → 即座に楽観的な見た目変化は行わず、PATCH 成功後のクエリ再取得で反映（既存の他 mutation と同じパターンに合わせる。楽観的更新は本ユニットのスコープ外＝YAGNI）。成功時は変更前の値を復元できるトーストを表示する。
  - 「✓ 完了にする」ボタン → フォーム内 `status` を `DONE` に変更（送信するまで実際の更新は起きない）。ボタンは `status !== "DONE"` の間だけ表示。
- **状態設計（出し分け）**: 初期・ローディング・空・エラー・成功の 4 状態分岐は既存構造を維持（[codekb/shared.md](../../ai-dlc/codekb/shared.md) 参照）。配色のみ刷新。
- **既存デザインシステムとの整合**: 本ユニットが `@theme` トークンの初出。以降のユニット（Unit4〜6）はこのトークンを再利用する。

### レスポンシブ / アクセシビリティ

- **対象端末**: PC・タブレット・スマートフォン（REQUIREMENTS.md 15章）。
- **主対象ブレークポイント**: 既存実装の `sm:`（640px）を踏襲する。本ユニットではデスクトップ版デザイン（`TodoOS v2.dc.html`）のレイアウトを基準に、Tailwind の `sm:`/`md:` ユーティリティで最低限のリフローのみ行う（1カラム化・モーダルのタップサイズ確保）。ボトムシート型モーダル・FAB・長押し D&D 等の本格的なモバイル専用パターン（`TodoOS Mobile.dc.html`）は Unit6（mobile-responsive-polish）で扱う。
- **タブレット方針**: PC レイアウトを維持しつつ `max-w` で幅を絞る（既存の `max-w-3xl` 相当を踏襲）。
- **スマホ方針**: モーダルは既存同様 `items-end`→`sm:items-center` で下端シート的表示のまま（本格ボトムシート化は Unit6）。TODO カードは折り返しレイアウト（`flex-wrap`）で1カラム表示。
- **a11y 最低限**: 全インタラクティブ要素に `min-h-11`（44px）のタップサイズを維持。ステータスアイコン（新規クリック可能要素）にも `min-h-11` 相当のヒット領域と `aria-label`（例: `「{タイトル}」を「{次のステータス}」に変更`）を付与する。「✓ 完了にする」ボタンにも明示的な `aria-label` またはボタンテキストで意図を示す。既存の aria 属性・role（AC-7）は全て維持。

## 異常系挙動

| シナリオ | 本レイヤーの挙動（エラーコード・レスポンス／表示・ログ） |
|---|---|
| ステータス進行 PATCH が 404（対象 TODO が既に削除済み） | 既存の `TodoListPage` の削除時 404 パターンに準拠: トースト「TODOが見つかりませんでした」相当を表示し、一覧を再取得（`refetch`）してステータスアイコン／行を消去する |
| ステータス進行 PATCH が 400（不正なステータス値。通常発生しないが防御的に扱う） | 汎用エラートースト表示。ステータス表示は変更前のまま（楽観的更新をしていないため自然にロールバックされる） |
| ステータス進行 PATCH がその他エラー（5xx・ネットワーク） | 汎用エラートースト「時間をおいて再度お試しください」相当。ステータス表示は変更前のまま |
| 「✓ 完了にする」ボタン押下後、フォーム送信が失敗（404/400） | 既存の `TodoFormModal` の送信失敗時分岐をそのまま踏襲（新規分岐は不要。フォーム内 `status` が `DONE` になった状態でエラー表示） |

## テストケース（技法注記付き）

- [状態遷移] `nextStatus("TODO")` → `"IN_PROGRESS"` を返す
- [状態遷移] `nextStatus("IN_PROGRESS")` → `"DONE"` を返す
- [状態遷移/禁止] `nextStatus("DONE")` → `"DONE"`（変更しない。呼び出し元は本来この状態で呼ばないが関数として防御的に検証）
- [状態遷移/禁止] `nextStatus("CANCELED")` → `"CANCELED"`（変更しない）
- [代表値] 未完了 TODO 一覧で、各行のステータスアイコンをクリックすると `useUpdateTodo` の `mutate` が `{id, status: "IN_PROGRESS"}` 相当で呼ばれる（`TODO` の場合）
- [代表値] `IN_PROGRESS` の TODO でステータスアイコンをクリックすると `mutate` が `{id, status: "DONE"}` で呼ばれ、成功後にトースト「「{タイトル}」を完了にしました」が表示される
- [代表値] `TODO`→`IN_PROGRESS` の進行でも、変更を元に戻せるトーストが表示される
- [境界値/デシジョンテーブル] 完了済みセクション（`DONE`/`CANCELED`）の行にはステータスアイコンのクリックハンドラ（進行 UI）が存在しない
- [デシジョンテーブル] 編集モーダルで `status !== "DONE"` の時「✓ 完了にする」ボタンが表示される（`TODO`/`IN_PROGRESS`/`CANCELED` の3ケース）
- [デシジョンテーブル] 編集モーダルで `status === "DONE"` の時「✓ 完了にする」ボタンが表示されない
- [代表値] 「✓ 完了にする」ボタンをクリックするとフォーム内のステータスセレクトの値が `DONE` になる（送信 mutation はまだ呼ばれない）
- [代表値] ステータス進行 PATCH が 404 → トースト表示＋一覧再取得（既存の 404 分岐パターンに準拠しているかを検証）
- [代表値] 「✓ 完了にする」ボタン押下後にフォームを送信すると、PATCH body に `status: "DONE"` が含まれる（AC-4 のレイヤー内結合。完了ボタン→送信→実際に PATCH へ `DONE` が渡る経路をエンドツーエンドで検証。実装確認: TDD 手順追記時点で 2026-08-15 に `TodoFormModal.tsx` の該当分岐を一時的にミュータント化して RED を確認済み）
- [代表値] ステータス進行 PATCH がその他エラー（5xx）→ 汎用エラートースト「時間をおいて再度お試しください」表示、ステータス表示は変更前のまま（異常系挙動表の該当行に対応するテストケースの転記漏れを補完。実装確認: 同上の手順で `TodoListPage.tsx` の該当分岐を一時的にミュータント化して RED を確認済み）
- [代表値] 完了済み TODO（`DONE`）が取り消し線タイトル＋緑チェックアイコンで表示される
- [代表値] 完了済み TODO（`CANCELED`）が取り消し線タイトル＋グレー×アイコンで表示される
- [境界値] 完了済み TODO の UTC日時（SQLite形式）が日付をまたぐ場合も、更新日時を `Asia/Tokyo` の `YYYY/MM/DD HH:mm` で表示する
- [回帰] 既存の `TodoListItem.test.tsx` / `TodoList.test.tsx` / `TodoListPage.test.tsx` / `TodoFormModal.test.tsx` / `DeleteConfirmDialog.test.tsx` / `CompletedToggle.test.tsx` / `TagManagementModal.test.tsx` / `TagBadge.test.tsx` / `TagMultiSelect.test.tsx` / `useShowCompleted.test.ts` / `isOverdue.test.ts` が全て green のまま（AC-7 の担保）。`TodoListItem.test.tsx` は完了済みケースの記述を `CompletedTodoListItem.test.tsx` へ移設する場合、移設後もケース数の純減が無いことを確認する
