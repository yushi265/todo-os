# manual-reorder: ui 詳細設計

> [index.md](./index.md) の実装 spec。対象: `src/react-app/` 配下。実装は Codex に委譲する。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-4**: TODO一覧で、`sortBy=manual`の時のみ、表示中のTODOカード（未完了・DONE・CANCELED）全体またはドラッグハンドルからドラッグ&ドロップで並び替えができる。ドロップ確定後、並び替え結果を反映した`todoIds`で`PATCH /api/todos/reorder`を呼び出す。
- **AC-5**: `sortBy`が`manual`以外の場合、ドラッグハンドルは非活性表示になり、ドラッグ操作は行えない。
- **AC-6**: フィルター（ステータス・優先度・タグ・期限）や検索が適用され一覧が絞り込まれている状態で並び替えた場合、フィルター対象外のTODO（非表示中のもの）の相対順序を維持したまま、フィルター対象のTODOのみ新しい順序で全体の`todoIds`を再構成してAPIへ送信する（REQUIREMENTS.md 6.3節・17章）。
- **AC-7**: 並び替えAPIが失敗した場合、一覧は元の順序のまま変化せず、エラー通知が表示される。
- **AC-8**: フォーカス中のカードをSpaceで選択し、上下矢印で移動、Spaceで確定、Escapeでキャンセルできる。操作状態は`aria-live`で通知する。
- **AC-9**: タッチ端末ではカードの非インタラクティブ領域を長押しして並び替えを開始でき、通常のボタン等は長押し判定を開始しない。

## このレイヤーが公開する契約（外部インターフェース）

| コンポーネント/関数 | 変更種別 | シグネチャ | 備考 |
|---|---|---|---|
| `buildFullReorderedIds`（新規） | 追加 | `(allTodos: TodoResponse[], visibleIdsInNewOrder: number[]) => number[]` | AC-6のマージロジック。全体リスト内でフィルタ対象の出現位置はそのまま、そこに入るIDだけを新順序から順番に埋める（アルゴリズムは下記） |
| `useReorderTodos`（新規） | 追加 | 標準的なTanStack Query `useMutation`ラッパー（`useDeleteTodo`と同じパターン） | `PATCH /api/todos/reorder`を呼ぶ。成功時`TODOS_QUERY_KEY`をinvalidate |
| `useTodos`（変更） | 変更 | `useTodos(params?: ListTodosParams, options?: { enabled?: boolean })` | `enabled`オプションを追加（TanStack Queryの`enabled`にそのまま渡す）。第2引数省略時は常に有効（既存呼び出しと後方互換） |
| `TodoListItem` / `CompletedTodoListItem` | 変更 | `{ ...既存, dragEnabled: boolean; onDragStart, onDragOver, onDrop, onDragEnd, onTouchStart, onTouchMove, onTouchEnd, onKeyDown }` | 手動並び替え時はカード全体をドラッグ可能にし、6点リーダーは互換入口として残す。DONE/CANCELEDも同じ並び替え対象とする |
| `TodoList` | 変更 | `{ ...既存, dragEnabled: boolean; onReorder: (visibleIdsInNewOrder: number[]) => void }` | ドラッグ状態（`dragId`/`dragOverId`）を内部で管理し、ドロップ確定時に表示中TODOの新しい順序のIDリストを`onReorder`へ渡す |
| `TodoListPage` | 変更 | 既存のまま | `useTodos({}, {enabled: sortBy === "manual"})`で全件（フィルタなし・manual順）を追加取得し、`handleReorder`で`buildFullReorderedIds`によるマージ→`useReorderTodos`呼び出しを行う |

### `buildFullReorderedIds`のアルゴリズム（疑似コード）

```ts
function buildFullReorderedIds(
  allTodos: TodoResponse[],           // 全件、現在の sortOrder 順
  visibleIdsInNewOrder: number[],     // 表示中（フィルタ後）TODO の、ドラッグ後の新しい順序の ID 配列
): number[] {
  const visibleIdSet = new Set(visibleIdsInNewOrder);
  let cursor = 0;
  return allTodos.map((todo) => {
    if (visibleIdSet.has(todo.id)) {
      const id = visibleIdsInNewOrder[cursor];
      cursor += 1;
      return id;
    }
    return todo.id;
  });
}
```

例（REQUIREMENTS.md 6.3節）: `allTodos=[A,B,C,D]`、タグ「仕事」でA,Cのみ表示中、ドラッグでC→Aの順に並び替え。`visibleIdsInNewOrder=[C,A]`。結果: `[C,B,A,D]`（B,Dは元の位置のまま、A,Cの位置にC,Aが順に入る）。

## このレイヤーが依存する下位の契約（呼び出す相手）

- 呼び出す相手: `PATCH /api/todos/reorder`（[service.md](./service.md)参照）。
- 受け渡し: `useReorderTodos().mutate({ todoIds: buildFullReorderedIds(allTodosForReorder, visibleIdsInNewOrder) })`。

## 実装配置

- `src/react-app/lib/reorder.ts`（新設） — `buildFullReorderedIds`
- `src/react-app/lib/reorder.test.ts`（新設）
- `src/shared/schemas.ts`（変更、service.mdと共通） — `reorderTodosSchema`
- `src/react-app/hooks/useTodos.ts`（変更） — `useTodos`に`enabled`オプション追加、`useReorderTodos`追加
- `src/react-app/components/TodoListItem.tsx`（変更） — ドラッグハンドル追加
- `src/react-app/components/TodoList.tsx`（変更） — ドラッグイベント管理・`onReorder`配線
- `src/react-app/components/TodoListPage.tsx`（変更） — 全件取得・`handleReorder`実装

## UI/UX 方針

- **画面フロー / 導線**: 既存のまま。新規導線はカード全体・ドラッグハンドル・キーボード・タッチ長押しで、一覧上で完結する。
- **主要操作とフィードバック**: ドラッグ中は対象行の見た目を変化させる（ドラッグオーバー中の行に薄い背景色`bg-chip-bg`+境界線`border-chip-border`、Unit3のデザインファイルの`isDragOver`パターンを踏襲）。ドロップ確定後、楽観的にローカル順序を即座に反映しつつAPI呼び出しを行う（既存のステータス進行等とは異なり、D&D操作は視覚的即時性が重要なためここのみ楽観的更新を行う。API失敗時は元の順序にロールバックしエラートースト表示）。
- **状態設計（出し分け）**: 既存の4状態分岐（ローディング/エラー/空/成功）は不変。ドラッグ機能はデータ取得成功時のみ関与する。
- **既存デザインシステムとの整合**: 新規トークン追加なし。ドラッグハンドルアイコン（6ドットのgripアイコン、Claude Designの`TodoOS v2.dc.html`参照）はSVGインラインで実装する。

### レスポンシブ / アクセシビリティ

- **対象端末**: PCのHTML5 D&D、タブレット・スマートフォンの長押しタッチ、キーボード操作を対象とする。
- **主対象ブレークポイント**: `sm:`以上はカードの密度を保ち、`sm:`未満は既存の余白を維持する。並び替え操作の可否は画面幅ではなく`sortBy=manual`と操作種別で決める。
- **a11y**: カードは手動並び替え時だけフォーカス可能・`aria-grabbed`・`aria-describedby`を持つ。Space/矢印/Escapeを受け付け、`role="status"`のライブリージョンで状態を通知する。ボタン等のタッチ操作はカードの長押し処理から除外する。主要ボタンとステータス操作には`min-h-11`を適用する。

## 異常系挙動

| シナリオ | 本レイヤーの挙動 |
|---|---|
| 並び替えAPIが`400`（重複/不一致。通常起こり得ないが念のため） | 汎用エラートースト「時間をおいて再度お試しください」。楽観的更新をロールバックし元の順序で再表示 |
| 並び替えAPIが5xx・ネットワークエラー | 同上 |
| ドラッグ中に一覧データが再取得されて内容が変わった（他タブでの操作等） | 本ユニットのスコープ外（低頻度・個人用アプリのため楽観的更新のロールバックのみで許容） |

## テストケース（技法注記付き）

- [代表値] `buildFullReorderedIds`: 全件表示（フィルタなし）で並び替え → 新順序がそのまま返る
- [代表値] `buildFullReorderedIds`: フィルタで一部のみ表示中に並び替え → REQUIREMENTS.md 6.3節の例（A,B,C,D→タグでA,C抽出→C,Aに並び替え→結果C,B,A,D）を検証
- [境界値] `buildFullReorderedIds`: 表示中TODOが0件（該当なし） → 元の順序がそのまま返る
- [境界値] `buildFullReorderedIds`: 全TODOが表示中（フィルタなし相当） → 新順序がそのまま返る
- [代表値] `sortBy=manual`の時、ドラッグハンドルが活性表示（`draggable=true`）
- [デシジョンテーブル] `sortBy`が`manual`以外（`dueDate`/`priority`/`createdAt`/`updatedAt`）の時、ドラッグハンドルが非活性（`draggable=false`）
- [代表値] ドラッグ&ドロップ操作後、`useReorderTodos`の`mutate`が正しい`todoIds`で呼ばれる
- [代表値] 並び替えAPIが失敗した場合、一覧が元の順序に戻り、エラートーストが表示される
- [代表値] DONE/CANCELEDを含む表示中のカードをドラッグして、同じ`todoIds`再構成処理で並び替えられる
- [代表値] カード本体からドラッグを開始でき、6点リーダーからも開始できる
- [代表値] Space/矢印/Escapeでキーボード並び替えができ、ライブリージョンが更新される
- [代表値] タッチ長押しはカード本体で開始でき、ステータスボタン等では開始しない
