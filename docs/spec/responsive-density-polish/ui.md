# responsive-density-polish: ui 詳細設計

> AI 実装エージェント（Codex）はこのファイルを読んで実装する。契約（AC・スコープ外）は [index.md](./index.md) が正本。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: ヘッダー（`TodoListPage.tsx`）の「タグ管理」ボタン・「+ 追加」ボタン・トースト通知が、`sm`以上でフォントサイズ`text-xs`・コンパクトなpaddingになる。`sm`未満は現状のサイズを維持する。
- **AC-2**: フィルターバー（`TodoFilterBar.tsx`）の検索input・フィルターチップ・「＋フィルター」ボタン・フィルターメニュー項目・ソートセレクト・方向切替ボタンが、`sm`以上でフォントサイズ`text-xs`・コンパクトなpadding/gapになる。`sm`未満は現状を維持する。
- **AC-3**: TODO一覧行（`TodoListItem.tsx`/`CompletedTodoListItem.tsx`）のメタ情報（優先度・期限・タグ）テキストと行間gapが、`sm`以上でコンパクトになる。`sm`未満は現状を維持する。既存の`sm:gap-4`を撤廃する。
- **AC-4**: 各モーダル（`TodoFormModal.tsx`/`TagManagementModal.tsx`/`DeleteConfirmDialog.tsx`）内のラベル・input・ボタンのテキストサイズが、`sm`以上で`text-xs`になる（モーダル外枠のpadding構造は対象外）。`sm`未満は現状を維持する。`TagManagementModal.tsx`内の共有`Button`コンポーネント（閉じる・追加ボタン）は`ui/button.tsx`の`SIZE_CLASSES`側で対応する。
- **AC-5**: タグ選択（`TagMultiSelect.tsx`）・タグ管理（`TagManagementModal.tsx`内タグ行）のテキスト・ボタンpaddingが、`sm`以上でコンパクトになる。`sm`未満は現状を維持する。
- **AC-6**: 完了トグル（`CompletedToggle.tsx`）のラベルテキストが、`sm`以上で`text-xs`になる（スイッチ本体は対象外）。`sm`未満は現状を維持する。
- **AC-7**: 本ユニットで変更する全要素において、タッチターゲット最小44px（`min-h-11`/`min-w-11`）はいかなる画面幅でも維持される。

## このレイヤーが公開する契約（外部インターフェース）

変更なし。全コンポーネントの props・イベントハンドラのシグネチャは維持する（見た目のみの変更）。

## 実装配置

- `src/react-app/components/TodoListPage.tsx`（AC-1）
- `src/react-app/components/TodoFilterBar.tsx`（AC-2）
- `src/react-app/components/TodoListItem.tsx`（AC-3）
- `src/react-app/components/CompletedTodoListItem.tsx`（AC-3）
- `src/react-app/components/TodoFormModal.tsx`（AC-4）
- `src/react-app/components/TagManagementModal.tsx`（AC-4, AC-5）
- `src/react-app/components/ui/button.tsx`（AC-4。共有`Button`コンポーネントの`SIZE_CLASSES`）
- `src/react-app/components/DeleteConfirmDialog.tsx`（AC-4）
- `src/react-app/components/TagMultiSelect.tsx`（AC-5）
- `src/react-app/components/CompletedToggle.tsx`（AC-6）
- `src/react-app/components/TodoList.tsx`（AC-3、空状態メッセージは対象外）

## 変換ルール（共通）

Tailwindスケール上で「1段階小さい値」を`sm:`プレフィックスで追加する。`sm`未満のデフォルト値は変更しない（フォントサイズ未指定だった要素へ`text-sm`を明示追加する場合を除く）。

| 現状 | `sm:`追加後 |
|---|---|
| `text-sm` | `sm:text-xs` |
| （未指定・暗黙16px） | デフォルトに`text-sm`を追加 + `sm:text-xs` |
| `text-lg` | `sm:text-base` |
| `p-4` | `sm:p-3` |
| `px-4` | `sm:px-3` |
| `py-2` | `sm:py-1.5` |
| `px-3` | `sm:px-2.5` |
| `gap-2` | `sm:gap-1.5` |
| `gap-4` | `sm:gap-3` |
| `gap-3` | `sm:gap-2` |

`text-xs`・`gap-1`・`px-2`は既に最小のため変更しない。`min-h-11`/`min-w-11`はいかなる場合も変更しない。

## AC-1: ヘッダー（`TodoListPage.tsx`）

- 191行目付近「タグ管理」ボタン: `className="min-h-11 rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-secondary hover:bg-surface"` → `px-4 py-2 text-sm` を `px-4 py-2 text-sm sm:px-3 sm:py-1.5 sm:text-xs` に変更
- 198行目付近「+ 追加」ボタン（ヘッダー内、`hidden sm:inline-block`）: フォントサイズ未指定 → `text-sm sm:text-xs` を追加
- 312行目付近トースト: `className="... px-4 py-3 ..."` の `px-4 py-3` を `px-4 py-3 sm:px-3 sm:py-2` に変更。トースト本文テキストにもフォントサイズが無ければ `text-sm sm:text-xs` を追加

対象外: FAB（アイコンのみの円形ボタン、テキスト無し）、231/252行目付近の「再試行」「+ 最初のTODOを追加」ボタン（これらもテキストサイズ未指定なら `text-sm sm:text-xs` を追加してよい）、`py-10`系の状態表示余白、170行目付近のヘッダー`mb-6`・`gap-4`（h1と件数表示・ボタン群の全体配置なので変更しない）。

## AC-2: フィルターバー（`TodoFilterBar.tsx`）

- 181行目付近 `<section>` の `gap-2`: `sm:gap-1.5` を追加
- 213行目付近 検索input: フォントサイズ未指定 → `text-sm sm:text-xs` を追加。`py-2` があれば `sm:py-1.5` を追加
- 223行目付近 フィルターチップ: `text-sm` → `sm:text-xs`
- 228/237行目付近 チップ内ボタン: `px-3 py-1` → `sm:px-2.5`
- 251行目付近「＋フィルター」ボタン: `px-3 py-2 text-sm` → `sm:px-2.5 sm:py-1.5 sm:text-xs`
- 260行目付近 フィルターメニュー `p-2`: 変更不要（既に小さい）
- 269/280/290/296/305行目付近 メニュー項目: `text-sm` → `sm:text-xs`
- 314行目付近「並び順」ラベル: `text-sm` → `sm:text-xs`
- 327行目付近 ソートセレクト: `px-3 py-2 text-sm` → `sm:px-2.5 sm:py-1.5 sm:text-xs`
- 344行目付近 方向切替ボタン: `px-3 py-2 text-lg` → `sm:px-2.5 sm:py-1.5 sm:text-base`

## AC-3: TODO一覧行（`TodoListItem.tsx` / `CompletedTodoListItem.tsx` / `TodoList.tsx`）

`TodoListItem.tsx`:
- `<li>`のclassNameにある `sm:gap-4` を**削除**（既存値の撤廃。AC-7で維持するタッチターゲットとは無関係、単純な間隔値）。`gap-2`のみ残すか、`gap-2 sm:gap-1.5`にする（実装者の判断でどちらでもよいが、後者を推奨）
- `<li>`のカード外枠padding `p-4`: `sm:p-3`を追加（T3で対象漏れだった箇所。ユーザーから「カードの余白がまだ大きい」という追加指摘を受けて対応）
- 2段目メタ情報行（優先度・期限・タグの親`<span>`）: `text-sm` → `sm:text-xs`

`CompletedTodoListItem.tsx`:
- 35行目付近 `<li>`の`gap-3`: `sm:gap-2`を追加
- 35行目付近 `<li>`のカード外枠padding `p-4`: `sm:p-3`を追加
- 53行目付近 メタ情報行: `text-sm` → `sm:text-xs`

`TodoList.tsx`:
- 230行目付近 リスト間隔`gap-3`: `sm:gap-2`を追加
- 223行目付近の空状態メッセージ（`px-4 py-6 text-sm`）は対象外（状態表示のため）

## AC-4: モーダル（`TodoFormModal.tsx` / `TagManagementModal.tsx` / `DeleteConfirmDialog.tsx`）

**外枠のpadding（`p-4 sm:p-6`等）・角丸・オーバーレイは一切変更しない**（対象外）。以下、内部要素のみ:

`TodoFormModal.tsx`:
- 189行目付近 見出し: `text-lg` → `sm:text-base`
- 192行目付近 フォーム全体の`gap-4`: `sm:gap-3`
- 196/219/237/262/292行目付近 各ラベル: `text-sm` → `sm:text-xs`
- 209/230/250/273/306行目付近 各input/select: フォントサイズ未指定 → `text-sm sm:text-xs` を追加
- 320行目付近「✓完了にする」ボタン: `text-sm` → `sm:text-xs`
- 335行目付近 ボタン行の`gap-2`: `sm:gap-1.5`
- 339/346行目付近 キャンセル/保存ボタン: フォントサイズ未指定 → `text-sm sm:text-xs` を追加。`px-4 py-2` があれば `sm:px-3 sm:py-1.5`

`TagManagementModal.tsx`: `TodoFormModal.tsx`と同型のパターン（見出し・ラベル・input・生の`<button>`要素）に同じ変換ルールを適用。164行目付近のタグ行はAC-5で扱う。266行目付近のトーストはAC-1のトースト変換と同じ扱い。

**共有`Button`コンポーネント化された箇所（閉じるボタン・追加ボタン）は、TagManagementModal.tsx側のclassNameではなく`src/react-app/components/ui/button.tsx`の`SIZE_CLASSES`を変更することで対応する**（ユーザー判断・2026-08-15）:

```ts
const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "min-h-11 rounded-xl px-4 py-2 text-sm sm:px-3 sm:py-1.5 sm:text-xs",
  sm: "min-h-11 rounded-xl px-3 py-1 text-sm sm:px-2.5 sm:text-xs",
  lg: "min-h-11 rounded-xl px-6 py-3 text-sm sm:px-4 sm:py-2 sm:text-xs",
  icon: "min-h-11 min-w-11 rounded-xl p-2",
};
```

`icon`サイズ（アイコンのみの正方形ボタン、閉じるボタンで使用）はpaddingが既に小さく、かつ`min-h-11 min-w-11`のタッチターゲット確保が主目的のため変更しない。`default`/`sm`/`lg`のみ`sm:`（画面幅640px以上）でコンパクト化する。`VARIANT_CLASSES`・`joinClasses`関数・コンポーネントのprops APIは変更しない。

`DeleteConfirmDialog.tsx`: キャンセル・削除するボタンは共有`Button`コンポーネント化済み（`variant="ghost"`/`variant="destructive"`）。T5で`ui/button.tsx`の`SIZE_CLASSES`を対応済みのため**ボタン自体への追加対応は不要**。本文メッセージ（`<p className="mb-4 text-text-primary">`）にフォントサイズが無指定なら `text-sm sm:text-xs` を追加する。

## AC-5: タグ選択・タグ管理（`TagMultiSelect.tsx` / `TagManagementModal.tsx`）

`TagMultiSelect.tsx`:
- 54/57/64/78行目付近: `text-sm` → `sm:text-xs`
- 68/115/121行目付近 タグボタン・追加ボタン: `px-3 py-1` or `py-2` → `sm:px-2.5 sm:py-1.5`（該当箇所のみ）、`text-sm` → `sm:text-xs`
- 104行目付近: 既に`text-xs`なので変更不要

`TagManagementModal.tsx`:
- 164行目付近 タグ行: `px-3 py-2` → `sm:px-2.5 sm:py-1.5`

## AC-6: 完了トグル（`CompletedToggle.tsx`）

- 11行目付近 ラベルの`text-sm`: `sm:text-xs`を追加
- スイッチ本体（`h-11 w-11`外側タップ領域、`h-[22px] w-[38px]`視覚トラック、`h-[18px] w-[18px]`ノブ）は**変更しない**（固定pxはAC-7のタッチターゲット44px維持と密接に結びついており、レスポンシブ化の対象外）

## レスポンシブ / アクセシビリティ

- 対象端末: 既存方針を継続（`sm`=640pxブレークポイント、PC/タブレット=`sm`以上、スマホ=`sm`未満）。
- タッチターゲット最小44px（`min-h-11`/`min-w-11`）は**すべての対象要素で維持**する（AC-7）。padding縮小によってボタンの内側余白が減っても、`min-h-11`等のクラスが付いている要素はそのまま維持し、実際のクリック領域が44px未満にならないようにする。
- フォントサイズ縮小（`sm:text-xs`、12px）はWCAGの最小フォントサイズ推奨（一般的に12px以上）を下回らない値に留める。

## 異常系挙動

見た目のみの変更であり、異常系挙動に変更はない。既存のテストが引き続きパスすることを確認する。

## テストケース（技法注記付き）

- [代表値] `TodoListPage`: 「タグ管理」ボタンが`sm:text-xs`クラスを持つ
- [代表値] `TodoListPage`: トースト要素が`sm:px-3`/`sm:py-2`クラスを持つ
- [代表値] `TodoFilterBar`: 検索inputが`text-sm`と`sm:text-xs`クラスを持つ
- [代表値] `TodoFilterBar`: 「＋フィルター」ボタンが`sm:text-xs`クラスを持つ
- [代表値] `TodoFilterBar`: 方向切替ボタンが`sm:text-base`クラスを持つ
- [代表値] `TodoListItem`: `<li>`要素が`sm:gap-4`クラスを持たない（既存値の撤廃確認）
- [代表値] `TodoListItem`: メタ情報行が`sm:text-xs`クラスを持つ
- [代表値] `CompletedTodoListItem`: メタ情報行が`sm:text-xs`クラスを持つ
- [代表値] `TodoFormModal`: 見出しが`sm:text-base`クラスを持つ
- [代表値] `TodoFormModal`: タイトルinputが`text-sm`と`sm:text-xs`クラスを持つ
- [代表値] `TodoFormModal`: 保存ボタンが`text-sm`と`sm:text-xs`クラスを持つ
- [代表値] `TagManagementModal`: タグ行が`sm:px-2.5`/`sm:py-1.5`クラスを持つ
- [代表値] `Button`（`ui/button.tsx`）: `size="default"`が`sm:px-3`/`sm:py-1.5`/`sm:text-xs`クラスを持つ
- [代表値] `Button`（`ui/button.tsx`）: `size="icon"`が`sm:`系のpaddingクラスの変更を持たない（タッチターゲット優先の現状維持を確認）
- [代表値] `DeleteConfirmDialog`: 本文メッセージが`text-sm`と`sm:text-xs`クラスを持つ
- [代表値] `TagMultiSelect`: 選択済みタグボタンが`sm:text-xs`クラスを持つ
- [代表値] `CompletedToggle`: ラベルが`sm:text-xs`クラスを持つ
- [代表値] `CompletedToggle`: スイッチ本体（トラック・ノブ）のクラスが変更されていない（固定px値の回帰確認）
- [代表値] 各ボタン（ドラッグハンドル・削除ボタン・完了トグルのタップ領域等）が`min-h-11`/`min-w-11`クラスを維持している（回帰確認、既存テストの再実行で担保）
