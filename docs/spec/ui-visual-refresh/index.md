# ui-visual-refresh: TODO一覧UIのビジュアル刷新+ステータス進行ショートカット

> 薄い実装 spec の入口。読み手は人間（Gate 1/2/3 承認者）。AI 実装エージェントは [ui.md](./ui.md) を読む。

## 概要

Claude Design（`TodoOS v2.dc.html` / `TodoOS Mobile.dc.html`、projectId: `be85ba8e-4641-4fb7-9d71-945a1e5b751e`）の配色・レイアウトに合わせて、既存の TODO 管理 UI（Unit1: todo-crud-basic, Unit2: tag-management で実装済み）を Tailwind CSS で刷新する。あわせて、デザインに含まれる新機能「未完了ステータスアイコンのクリックによる進行ショートカット」と「編集モーダルの完了ショートカットボタン」を追加する。

## 対象範囲

- 対象レイヤー: 表示層（ui）のみ。[ui.md](./ui.md) 参照。service レイヤーの変更は無い（既存 API をそのまま再利用）。
- 対象ドメイン: TODO 一覧表示・TODO 作成/編集モーダル・削除確認ダイアログ・完了トグル・タグ管理モーダル・タグバッジ・タグ複数選択
- 対象外（やらないこと。YAGNI・後続ユニットのスコープ）:
  - 検索ボックス・フィルターチップ/メニュー・ソートセレクトの UI と機能（→ Unit4: filter-sort-search）
  - ドラッグハンドル・手動並び替え（D&D）の UI と機能（→ Unit5: manual-reorder）
  - ボトムシート型モーダル・FAB・長押し D&D 等のモバイル専用インタラクションパターン（→ Unit6: mobile-responsive-polish。本ユニットでは Tailwind のブレークポイントによる最低限のレスポンシブ対応のみ行う）
  - 優先度フィルター（REQUIREMENTS.md 11章にあるがデザインには存在しない。Unit4 着手時に人間へ確認する）

## ユニット計画

単一ユニット（本 spec で完結）。

## 受け入れ基準（AC）

- [ ] **AC-1**: TODO 一覧の各アイテム（未完了）が、デザイン準拠の配色・レイアウト（カード型・角丸・ステータス別バッジ色）で表示される。
- [ ] **AC-2**: 未完了 TODO（ステータスが `TODO` または `IN_PROGRESS`）のステータスアイコンをクリックすると、`TODO`→`IN_PROGRESS`→`DONE` の順に1段階だけステータスが進む。一覧カードにはステータス文字を重複表示しない。`DONE`・`CANCELED` の TODO にはこの操作 UI 自体が提供されない。
- [ ] **AC-3**: ステータス進行操作が成功した場合、変更内容のトースト通知と「元に戻す」ボタンが表示される。`DONE` 到達時のメッセージは「「{タイトル}」を完了にしました」、それ以外の進行時はステータス変更を知らせる。
- [ ] **AC-4**: TODO 編集モーダルで、現在のステータスが `DONE` 以外の場合に「✓ 完了にする」ボタンが表示される。クリックするとフォーム内のステータス値が `DONE` に変わる（保存自体はフォームの送信操作で行う。ボタン押下だけでは PATCH は発火しない）。
- [ ] **AC-5**: 完了・キャンセル済み TODO が、デザイン準拠の配色・レイアウト（アイコン+取り消し線タイトル、`DONE`=緑チェック / `CANCELED`=グレー×）で表示される。
- [ ] **AC-6**: TODO 作成/編集モーダル・削除確認ダイアログ・タグ管理モーダル（タグ削除確認含む）・トースト通知が、デザイン準拠の配色・角丸・シャドウで表示される。
- [ ] **AC-7**: 既存の非機能要件が全て維持される（回帰なし）: 二重送信防止（`isPending` 系の `disabled`）・aria 属性（`role="dialog"`/`aria-modal`/`aria-label`/`role="status"`/`role="alert"`/`aria-pressed`）・フォーカス管理（モーダル開時の初期フォーカス）・キーボード操作（タグ編集の Enter/Escape）・イベント伝播制御（削除ボタンの `stopPropagation`）・異常系のステータスコード別分岐（404/409/400）・`data-testid`。

## アーキテクチャ / レイヤー間フロー

UI レイヤーのみの変更。既存の `hooks/useTodos.ts`（`useUpdateTodo` 等）・`hooks/useTags.ts` をそのまま再利用する。ステータス進行ショートカットは既存の `useUpdateTodo()` で `PATCH /api/todos/:id`（body: `{ status: nextStatus }`）を呼ぶのみで、新規 API・新規契約は不要。

```
ステータスアイコン click → advanceStatus(todo) → useUpdateTodo().mutate({id, status: next})
                                                    → 成功: TODOS_QUERY_KEY invalidate → 一覧再取得
                                                    → 変更トースト＋「元に戻す」表示
```

## エラー・ログ方針（横断サマリ）

既存のまま変更しない（[codekb/shared.md](../../ai-dlc/codekb/shared.md) の異常系分岐パターンを踏襲）。ステータス進行の PATCH が失敗した場合（404/400/その他）も、既存の `TodoFormModal`/`TodoListPage` が持つ同種のエラー分岐パターン（404→トースト+再取得、その他→汎用エラー）に準じる。

| シナリオ | ui の挙動 |
|---|---|
| ステータス進行 PATCH が 404（対象が既に削除済み） | トースト表示＋一覧再取得（既存の削除時404パターンに準拠） |
| ステータス進行 PATCH がその他エラー | 汎用エラートースト表示、ステータス表示は変更前のまま |

## テスト戦略

| AC | 単体 | レイヤー内結合 |
|----|------|--------------|
| AC-1, AC-5, AC-6 | コンポーネント表示（配色・構造） | — |
| AC-2, AC-3 | ステータス進行ロジック（`nextStatus`等の純粋関数があれば） | 対象（バッジ click → PATCH 呼び出し → 一覧反映・トースト） |
| AC-4 | フォーム内 state 変更（完了ボタン click） | 対象（完了ボタン→送信→PATCH body 確認） |
| AC-7 | 既存テストの回帰確認（disabled/aria/フォーカス/キーボード/伝播/異常系/testid） | 既存テストで担保済み。刷新後も green を維持 |

ケース詳細は [ui.md](./ui.md) の「テストケース」節を参照。

## 既存実装との関係（再利用 / 差分 / 衝突）

- **再利用**: `hooks/useTodos.ts` / `hooks/useTags.ts` / `hooks/useShowCompleted.ts` / `lib/isOverdue.ts` は変更不要（ロジック・契約とも既存のまま）。`TodoFormModal` の zod バリデーション（`createTodoSchema`/`updateTodoSchema`）もそのまま。
- **差分**: 全 9 コンポーネントの Tailwind クラス（配色・spacing・角丸・シャドウ）を刷新。`TodoListItem` は未完了/完了済みで大きく異なるレイアウトをデザインが要求するため、`TodoListItem`（未完了用）と `CompletedTodoListItem`（完了済み用）に分割する（判断根拠は後述）。`CompletedToggle` はチェックボックスから iOS 風スイッチ UI に変更（`checked`/`onChange` の props 契約は維持）。
- **衝突**: 無し。API 契約・DB スキーマへの影響も無い。

## 実装に効く制約

- Tailwind CSS のユーティリティクラスのみを使う（デザインのインライン `style` はそのまま転記しない。参照元として使うのみ）。
- デザイン固有の配色は Tailwind v4 の `@theme` でセマンティックなカラートークンとして定義し、コンポーネント側は `bg-primary` 等のクラス名で参照する（arbitrary value `bg-[#4f46e5]` の羅列を避ける。具体値は [ui.md](./ui.md) 「デザイントークン」参照）。
- ステータス・優先度別のクラス名は Tailwind の動的クラス名生成の制約（JIT がテンプレートリテラルで組み立てたクラス名を検出できない）を踏まえ、`Record<Status, string>` 形式の静的マッピングテーブルで持つ。
- [codekb/shared.md](../../ai-dlc/codekb/shared.md) の既知の罠・再利用可能な部品を踏襲する。
- AC-7 に列挙した既存の非機能要件・`data-testid` は退行させない（既存テストを全て green のまま維持する）。

## 判断根拠 / 未決事項

- **配色トークン化**: デザインの色（`#4f46e5` 等）は `TodoListItem`・`TagBadge`・`TodoFormModal` など複数コンポーネントで繰り返し使われる（Rule of Three 該当）ため、`@theme` でトークン定義してから参照する。個別の arbitrary value 羅列は保守性を下げるため却下。
- **`TodoListItem` の分割**: デザインでは未完了行（ステータス進行ショートカット・優先度/期限/タグをフル表示）と完了済み行（アイコン+取り消し線+更新日時+タグのみ、操作は削除のみ）で情報量・レイアウトが大きく異なる。1コンポーネント内の条件分岐で両対応すると分岐が肥大化するため、`TodoListItem`（未完了）と `CompletedTodoListItem`（完了済み）に分割する。`TodoList` が `todo.status` に応じて描画先を振り分ける。
- **ステータス進行ロジックの採用元**: デスクトップ版デザイン（`TodoOS v2.dc.html`）の `nextStatus(status) { return status === "TODO" ? "IN_PROGRESS" : "DONE"; }` をそのまま採用する。この関数は `TODO`/`IN_PROGRESS` の2値でのみ呼ばれる設計（`DONE`/`CANCELED` は一覧上で呼び出し UI 自体が無い）だが、実装では防御的に「`TODO`→`IN_PROGRESS`、`IN_PROGRESS`→`DONE`、それ以外は変更しない」とする（詳細は [ui.md](./ui.md)）。
- **編集モーダルの「完了にする」ボタン採用**: モバイル版デザイン（`TodoOS Mobile.dc.html`）由来の要素だが、デスクトップでも有用な操作であり画面幅を問わず実装する（デスクトップ版デザインに無いのは省略であって禁止ではないと判断）。
- **Unit3 に検索/フィルター/ソート/D&D の UI を含めない**: AI-DLC の「1 ユニット = 1 機能を縦に貫く」原則に従い、ツールバー UI とドラッグハンドルはそれぞれの機能ユニット（Unit4/Unit5）で機能と一体に追加する。本ユニットのヘッダーは「完了トグル・タグ管理ボタン・追加ボタン」の既存3要素の配色刷新に留める。
- **未決事項**: 優先度フィルターの扱い（REQUIREMENTS.md にあるがデザインに無い）は Unit4 着手時に人間へ確認する。本ユニットの実装をブロックしない。
