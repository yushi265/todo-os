# design-conformance-polish: ui 詳細設計

> AI 実装エージェント（Codex）はこのファイルを読んで実装する。契約（AC・スコープ外）は [index.md](./index.md) が正本。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: ヘッダー（`TodoListPage.tsx`）に、デザイン通りの色付き正方形ロゴアイコン（`background:#4f46e5`、角丸）と「残り{N}件」のアクティブTODO件数表示が、タイトル文字列と並んで表示される。
- **AC-2**: 検索・フィルター・ソートバー（`TodoFilterBar.tsx`）から、デザインに存在しない外枠カード（`rounded-2xl border ... bg-card`）を除去し、検索入力に虫眼鏡アイコンが表示され、フィルターチップ・「＋フィルター」ボタン・ソートセレクト・方向切替ボタンがピル型（`rounded-full`）で統一される。
- **AC-3**: TODO作成/編集モーダル（`TodoFormModal.tsx`）で、モーダル背景オーバーレイに半透明のぼかし演出（`backdrop-blur`）が適用され、説明欄に適切な初期表示行数（`rows`属性）が設定され、「✓ 完了にする」ボタンがステータスセレクトと同じ行に横並び配置され、タグ選択トグル（`TagMultiSelect.tsx`）の選択済みタグがアクセントカラー（primary）で強いコントラストの配色になる。
- **AC-4**: タグ管理モーダル（`TagManagementModal.tsx`）で、閉じるボタンが円形の背景付きボタンになり、タグ行が個別のカード型（背景色・角丸・行間の隙間あり）で表示され、タグ名編集中の入力欄ボーダーがアクセントカラー（primary）に変化する。
- **AC-5**: 削除確認ダイアログ（`DeleteConfirmDialog.tsx`）が、PC・モバイル両方の画面幅で常に画面中央のセンタリング表示になる（モバイル幅でのボトムシート化をやめる）。
- **AC-6**: タグバッジ（`TagBadge.tsx`ほかタグ名を表示する全箇所）が「#」プレフィックス付きでタグ名を表示し、完了・キャンセル済みTODO行のタグバッジは未完了行より薄い色で表示される。
- **AC-7**: 完了表示トグル（`CompletedToggle.tsx`）が「スイッチ→ラベルテキスト」の順で表示され、ラベル文言がデザイン通り（「完了・キャンセル済みを表示」）になり、タップ可能領域44px以上を維持しつつスイッチの視覚サイズがデザインに近い外形になる。
- **AC-8**: 空状態表示（`TodoListPage.tsx`）で、「＋最初のTODOを追加」ボタンが`sm`以上（PC/タブレット）でのみ表示され、モバイル幅では表示されない（FABが作成導線を担うため）。加えて、空状態の枠に水平方向のpadding（デザイン相当の余白）が追加される。
- **AC-9**: 主要なCTAボタン（保存・追加・削除する・＋追加・＋最初のTODOを追加）が太字（`font-bold`/`font-weight:700`相当）で表示され、デザインでフォントサイズが明示されている主要なラベル・ボタン文字（ヘッダーの「タグ管理」ボタン等）がブラウザ既定サイズではなく意図したサイズで表示される。
- **AC-10**: トースト通知（`TodoListPage.tsx`）に表示時のフェード+スライドインアニメーションが適用され、シャドウがデザイン相当の強さになり、モバイル幅ではFAB（画面右下固定ボタン）と重ならない位置に表示される。

## このレイヤーが公開する契約（外部インターフェース）

変更なし。全コンポーネントの props・イベントハンドラのシグネチャは維持する（見た目のみの変更）。

## 実装配置

- `src/react-app/components/TodoListPage.tsx`（AC-1, AC-8, AC-9一部, AC-10）
- `src/react-app/components/TodoFilterBar.tsx`（AC-2, AC-6一部, AC-9一部）
- `src/react-app/components/TodoFormModal.tsx`（AC-3, AC-9一部）
- `src/react-app/components/TagMultiSelect.tsx`（AC-3, AC-6）
- `src/react-app/components/TagManagementModal.tsx`（AC-4, AC-6, AC-9一部）
- `src/react-app/components/DeleteConfirmDialog.tsx`（AC-5, AC-9一部）
- `src/react-app/components/TagBadge.tsx`（AC-6）
- `src/react-app/components/CompletedTodoListItem.tsx`（AC-6の`muted`適用）
- `src/react-app/components/CompletedToggle.tsx`（AC-7）
- `src/react-app/index.css`（AC-10の`@keyframes`追加。`@theme`ブロックは変更しない）

## UI/UX 方針（各AC の具体的な変更内容）

### AC-1: ヘッダー

`TodoListPage.tsx` 166-188行目付近。

- `<header>`: `mb-4` → `mb-6`、`flex items-center` → `flex flex-wrap items-center`（`flex-wrap`追加）
- `<h1>`とその左のロゴアイコン・件数表示を1つの`<div className="flex items-center gap-2">`で包む:
  ```tsx
  <div className="flex items-center gap-2">
    <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded bg-primary" />
    <h1 className="text-xl font-bold text-text-primary sm:text-2xl">todo-os</h1>
    <span className="text-xs font-medium text-text-tertiary">残り{activeCount}件</span>
  </div>
  ```
- `activeCount`の算出: **表示中（フィルタ適用後）の`displayedTodos`のうち`status`が`TODO`または`IN_PROGRESS`の件数**を使う（デザインは「フィルタ前の全件」だが、新規API呼び出しを避けるため表示中件数を採用。判断根拠は index.md 参照）。`displayedTodos`が`undefined`の間（ローディング中）は`0`として扱う。
- ヘッダー右側のボタン群コンテナ: `<div className="flex items-center gap-4">` → `<div className="flex flex-wrap items-center gap-4">`（`flex-wrap`追加）

### AC-2: フィルターバー

`TodoFilterBar.tsx` 178-326行目付近。

- `<section>`のclassName: `"mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-[0_4px_14px_rgba(0,0,0,0.04)]"` → `"mb-4 flex flex-wrap items-center gap-2"`（カード装飾一式を除去）
- 検索input: 相対配置の`<div className="relative min-w-0 flex-1">`でinputを包み、その中に虫眼鏡SVGアイコンを絶対配置。inputに左パディングを追加:
  ```tsx
  <div className="relative min-w-0 flex-1">
    <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-quaternary">
      <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="10.3" y1="10.3" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    <input
      type="search"
      aria-label="TODOを検索"
      placeholder="タイトル・説明を検索"
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
      className="min-h-11 w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none sm:min-w-52"
    />
  </div>
  ```
  （既存の`min-w-0 flex-1`は外側divへ移動、inputは`w-full`に変更）
- 「＋フィルター」ボタン: `className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"` → `rounded-xl border border-border` を `rounded-full border border-dashed border-border` に変更
- ソートlabel: `className="text-sm text-text-secondary"` → `className="text-sm text-text-quaternary"`
- ソートセレクト: `className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary"` の `rounded-xl` を `rounded-full` に変更
- 方向切替ボタン: `className="min-h-11 min-w-11 rounded-xl border border-border bg-card px-3 py-2 text-lg text-text-secondary hover:bg-surface"` の `rounded-xl` を `rounded-full` に変更
- フィルターチップ本体・フィルターメニューのドロップダウンは変更しない（既にピル型/十分近い見た目のため対象外）。

### AC-3: TODO作成/編集モーダル

`TodoFormModal.tsx`。

- オーバーレイ: `className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"` の `bg-black/50` を `bg-black/50 backdrop-blur-sm` に変更。
- 説明欄`<textarea>`: `rows={3}`属性を追加（PC/モバイル共通で3行、レスポンシブでの出し分けはしない）。
- ステータスセレクト＋「✓ 完了にする」ボタン: 現在は縦積み（select→button）。横並びの`<div className="flex gap-2">`で包む:
  ```tsx
  <div className="flex gap-2">
    <select
      id="todo-status"
      value={values.status}
      onChange={...}
      className="min-h-11 flex-1 rounded-xl border border-border px-3 py-2 text-text-primary"
    >
      {...}
    </select>
    {values.status !== "DONE" && (
      <button
        type="button"
        onClick={() => setValues((v) => ({ ...v, status: "DONE" }))}
        className="min-h-11 shrink-0 rounded-xl bg-status-done-bg px-3 text-sm font-medium text-status-done-fg hover:opacity-90"
      >
        ✓ 完了にする
      </button>
    )}
  </div>
  ```
  （既存の`mt-1 w-fit`は削除、`flex-1`をselectに追加、buttonは`shrink-0`）
- 保存ボタン: `font-bold`を追加（AC-9と共通）。

`TagMultiSelect.tsx`:

- 選択済みタグのclassName: `"min-h-11 rounded-full border border-chip-border bg-chip-bg px-3 py-1 text-sm font-medium text-chip-fg"` → `"min-h-11 rounded-full border border-primary bg-primary px-3 py-1 text-sm font-medium text-white"`（アクセントカラーのソリッド塗り）
- 未選択タグのclassNameは変更しない。

### AC-4: タグ管理モーダル

`TagManagementModal.tsx`。

- 閉じるボタン: `className="min-h-11 min-w-11 text-text-tertiary hover:text-text-primary"` → `className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface text-text-tertiary hover:text-text-primary"`
- タグ行リスト: `<ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">` → `<ul className="flex flex-col gap-1.5">`（外枠・区切り線を除去し、行間隔に変更）
- 各`<li>`: `className="flex min-h-11 items-center gap-2 px-3 py-2"` → `className="flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2"`（個別カード化）
- 編集中input: `className="min-h-11 flex-1 rounded-xl border border-border px-2 py-1 text-text-primary"` の `border-border` を `border-primary` に変更
- 追加ボタン: `font-bold`を追加（AC-9と共通）。

### AC-5: 削除確認ダイアログ

`DeleteConfirmDialog.tsx`。他モーダルと異なり、**このダイアログのみボトムシート化を持たず常時センタリング**にする。

- 外側`<div>`: `className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"` → `className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"`（`items-end`/`sm:items-center`の出し分けをやめ常時`items-center`、`p-4`を常時適用）
- 内側`<div>`: `className="w-full max-w-md rounded-t-[22px] rounded-b-none bg-card p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:rounded-[22px] sm:p-6"` → `className="w-full max-w-md rounded-[22px] bg-card p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]"`（角丸・paddingを常時PC値に統一）
- ドラッグハンドルバー（`<div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-border sm:hidden" />`）: **削除**（センタリング表示のみのため不要）
- 「削除する」ボタン: `font-bold`を追加（AC-9と共通）。

### AC-6: タグの「#」プレフィックスと完了行の薄色化

- `TagBadge.tsx`: `muted?: boolean`プロパティを追加（デフォルト`false`）。表示は`#`+タグ名に変更し、`muted`が`true`の時は`text-tag-fg`の代わりに既存トークン`text-tag-fg-muted`（`index.css`定義済み、追加不要）を使う:
  ```tsx
  interface TagBadgeProps {
    tag: TagResponse;
    muted?: boolean;
  }
  function TagBadge({ tag, muted = false }: TagBadgeProps) {
    return (
      <span className={`inline-flex items-center rounded-full bg-tag-bg px-2 py-1 text-xs font-medium ${muted ? "text-tag-fg-muted" : "text-tag-fg"}`}>
        #{tag.name}
      </span>
    );
  }
  ```
- `CompletedTodoListItem.tsx`: `<TagBadge key={tag.id} tag={tag} />` → `<TagBadge key={tag.id} tag={tag} muted />`（`TodoListItem.tsx`側の呼び出しは`muted`を渡さず現状維持）。
- `TagMultiSelect.tsx`: 選択済み・未選択どちらのボタンも`{tag.name}`→`#{tag.name}`に変更。
- `TagManagementModal.tsx`: タグ名表示`<span className="flex-1 text-text-primary">{tag.name}</span>`→`{"#"}{tag.name}`（または`#{tag.name}`）に変更。編集用input（`value={editValue}`）はプレフィックスを付けない（編集値は生のタグ名のまま）。
- `TodoFilterBar.tsx`の`filterValueLabel`関数: `attribute === "tagId"`の分岐（`tags.find(...)?.name ?? String(value)`）を`"#" + (tags.find(...)?.name ?? String(value))`に変更（フィルターチップのタグ値表示にも"#"を付ける）。

### AC-7: 完了表示トグル

`CompletedToggle.tsx`。「スイッチ→ラベル」の順に入れ替え、文言変更、タップ領域44px維持しつつ視覚サイズを縮小する。

```tsx
function CompletedToggle({ checked, onChange }: CompletedToggleProps) {
  return (
    <label
      htmlFor="show-completed-toggle"
      className="flex min-h-11 items-center gap-2 text-sm text-text-secondary"
    >
      <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
        <span className="relative inline-flex h-[22px] w-[38px] items-center">
          <input
            id="show-completed-toggle"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-border-dashed transition-colors peer-checked:bg-primary"
          />
          <span
            aria-hidden="true"
            className="absolute left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform peer-checked:translate-x-4"
          />
        </span>
      </span>
      完了・キャンセル済みを表示
    </label>
  );
}
```

- トラックOFF色: `bg-border` → `bg-border-dashed`（既存トークン、`#d6d6d3`）。
- ラベル文言: 「終了済みを表示」→「完了・キャンセル済みを表示」。
- 外側の`h-11 w-11`（44×44px）がタップ領域、内側の`h-[22px] w-[38px]`が視覚トラック（デザインPC値に一致）。

### AC-8: 空状態表示

`TodoListPage.tsx` 223-243行目付近。

- 枠のclassName: `className="rounded-2xl border border-dashed border-border-dashed py-10 text-center"` → `className="rounded-2xl border border-dashed border-border-dashed px-5 py-10 text-center"`（`px-5`追加）
- 「＋最初のTODOを追加」ボタン: `className="min-h-11 rounded-xl bg-primary px-6 py-3 text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-primary-hover"` に `hidden sm:inline-block` を追加し、`sm`未満で非表示にする。`font-bold`も追加（AC-9と共通）。

### AC-9: 横断タイポグラフィ（太字・フォントサイズ）

対象の各ボタンに`font-bold`を追加する（既存のtext colorやpadding等は変更しない）:

- `TodoFormModal.tsx`: 保存ボタン（`type="submit"`）
- `TagManagementModal.tsx`: 追加ボタン（`onClick={handleCreateSubmit}`）
- `DeleteConfirmDialog.tsx`: 削除するボタン（`onClick={onConfirm}`）
- `TodoListPage.tsx`: ヘッダーの「+ 追加」ボタン、FABボタン（`aria-label="TODOを追加"`）、空状態の「+ 最初のTODOを追加」ボタン（AC-8で追加した`hidden sm:inline-block`と併記）

フォントサイズ指定漏れの対象（`text-sm`を追加）:

- `TodoListPage.tsx`: ヘッダーの「タグ管理」ボタン（`className="min-h-11 rounded-xl border border-border bg-card px-4 py-2 text-text-secondary hover:bg-surface"` に `text-sm` を追加）

### AC-10: トースト通知

`TodoListPage.tsx` 293-309行目付近。

- `index.css`に`@keyframes`を追加（`@theme`ブロックの外、ファイル末尾等）:
  ```css
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  ```
- トースト本体のclassName: `className="fixed inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-3 rounded-xl bg-text-primary px-4 py-3 text-white shadow-[0_4px_16px_rgba(0,0,0,0.07)]"` を以下に変更:
  - `bottom-4` → `bottom-24 sm:bottom-4`（モバイルはFAB=`bottom-6 h-14`(56px)の上に余白を確保するため`bottom-24`(96px)、`sm`以上はFABが無いので`bottom-4`のまま）
  - `shadow-[0_4px_16px_rgba(0,0,0,0.07)]` → `shadow-[0_12px_36px_rgba(0,0,0,0.32)]`
  - `animate-[toast-in_0.18s_ease-out]` を追加

`TagManagementModal.tsx`内のトースト（262-278行目、同一パターン）も同様に変更する（このモーダルはボトムシートでFABと同時に出ないため`bottom-4`固定のままでよいが、シャドウ・アニメーションは統一する）。

## レスポンシブ / アクセシビリティ

- 対象端末: 既存方針を継続（`sm`=640pxブレークポイント、PC/タブレット=`sm`以上、スマホ=`sm`未満）。
- タッチターゲット最小44px（`min-h-11`/`min-w-11`）は**すべての対象要素で維持**する。AC-7（完了トグル）はタップ領域44×44pxを外側要素で確保し、視覚サイズのみ縮小する二重構造で対応する。
- 新規追加するアイコン（ヘッダーのロゴ・検索の虫眼鏡）は`aria-hidden="true"`を付与し、スクリーンリーダーの読み上げ対象にしない。
- 既存のフォーカス管理・`aria-label`・`role`属性は変更しない。

## 異常系挙動

見た目のみの変更であり、異常系挙動（エラーメッセージ・トースト内容・404ハンドリング等）に変更はない。既存のテストが引き続きパスすることを確認する。

## テストケース（技法注記付き）

- [代表値] `TodoListPage`: ヘッダーにロゴアイコン（`aria-hidden`のspan、`bg-primary`クラス）が存在する
- [代表値] `TodoListPage`: ヘッダーに「残り{N}件」の件数表示が、表示中TODOのTODO/IN_PROGRESS件数と一致して表示される
- [境界値] `TodoListPage`: 表示中の未完了TODOが0件のとき「残り0件」と表示される
- [代表値] `TodoFilterBar`: `<section>`要素が`bg-card`/`shadow-`クラスを持たない（カード装飾除去の確認）
- [代表値] `TodoFilterBar`: 検索input付近に虫眼鏡アイコン（svg）が存在する
- [代表値] `TodoFilterBar`: 「＋フィルター」ボタンが`rounded-full`と`border-dashed`クラスを持つ
- [代表値] `TodoFormModal`: オーバーレイ要素が`backdrop-blur-sm`クラスを持つ
- [代表値] `TodoFormModal`: 説明欄`<textarea>`が`rows="3"`属性を持つ
- [代表値] `TodoFormModal`（`isEdit=true`かつ`status !== "DONE"`）: ステータスセレクトと「✓ 完了にする」ボタンが同一の親要素（`flex`コンテナ）内にある
- [デシジョンテーブル] `TodoFormModal`（`isEdit=true`）: `status === "DONE"`のとき「✓ 完了にする」ボタンが表示されない／`status !== "DONE"`のとき表示される（既存挙動の回帰確認）
- [代表値] `TagMultiSelect`: 選択済みタグボタンが`bg-primary`クラスを持ち、テキストが`#`で始まる
- [代表値] `TagManagementModal`: 閉じるボタンが`rounded-full`クラスを持つ
- [代表値] `TagManagementModal`: タグ行の`<li>`要素が`rounded-xl`と`border-border-subtle`クラスを持つ（個別カード化の確認）
- [代表値] `TagManagementModal`: 編集中の`<input>`が`border-primary`クラスを持つ
- [代表値] `DeleteConfirmDialog`: 外側コンテナが`items-end`クラスを持たない（常時センタリングの確認、`sm:items-center`の出し分けも無いこと）
- [代表値] `DeleteConfirmDialog`: ドラッグハンドルバー要素が存在しない
- [代表値] `TagBadge`（`muted`未指定）: `#`+タグ名で表示され、`text-tag-fg`クラスを持つ
- [代表値] `TagBadge`（`muted=true`）: `text-tag-fg-muted`クラスを持つ
- [代表値] `CompletedTodoListItem`: タグバッジに`muted`が渡され`text-tag-fg-muted`クラスで表示される
- [代表値] `TodoFilterBar`: タグでフィルタ選択時、フィルターチップのラベルが`#`+タグ名を含む
- [代表値] `CompletedToggle`: ラベル要素の子要素順序が「スイッチ（`<span>`）→テキストノード」である
- [代表値] `CompletedToggle`: ラベルテキストが「完了・キャンセル済みを表示」である
- [代表値] `TodoListPage`（空状態・`sm`相当）: 「＋最初のTODOを追加」ボタンに`hidden`と`sm:inline-block`クラスが付与されている（実描画のvisibility自体はjsdomでは検証できないため、クラスの存在確認で担保する）
- [代表値] `TodoListPage`: 保存/追加/削除する/+追加/FAB/+最初のTODOを追加ボタンが`font-bold`クラスを持つ（各コンポーネントのテストファイルに分散して追加）
- [代表値] `TodoListPage`: 「タグ管理」ボタンが`text-sm`クラスを持つ
- [代表値] `TodoListPage`: トースト要素が`animate-[toast-in_0.18s_ease-out]`クラスと`bottom-24`/`sm:bottom-4`クラスを持つ
