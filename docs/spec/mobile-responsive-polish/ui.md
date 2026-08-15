# mobile-responsive-polish: ui 詳細設計

> [index.md](./index.md) の実装 spec。対象: `src/react-app/` 配下。実装は Codex に委譲する。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: モバイル画面幅（Tailwindの`sm`ブレークポイント未満、640px未満）で、TODO作成/編集モーダルがボトムシート型（画面下部に固定・上部のみ角丸・上部中央にハンドルバー）で表示される。`sm`以上では既存の中央ダイアログ表示のまま。
- **AC-2**: モバイル画面幅で、削除確認ダイアログ・タグ管理モーダルも同様にボトムシート型で表示される。
- **AC-3**: モバイル画面幅で、TODO追加ボタンが画面右下固定のFAB（円形ボタン）として表示される。`sm`以上では既存のヘッダー内ボタンのまま表示される。
- **AC-4**: モバイル画面幅で、未完了TODOカードの非インタラクティブ領域を500ms以上長押しした後、指を動かすことでTODOの並び替えができる（`sortBy=manual`の時のみ、完了・中止カードは対象外）。
- **AC-5**: 長押し中に指が10pxを超えて動いた場合、長押し判定はキャンセルされ、ページの通常スクロールとして扱われる（誤操作防止。ちょうど10pxの移動ではキャンセルされない）。
- **AC-6**: 長押しドラッグで確定した新しい順序は、Unit5で実装済みの`onReorder`コールバック（`buildFullReorderedIds`によるマージ処理を含む）にそのまま渡され、PC版D&Dと同じAPI呼び出しに帰着する。
- **AC-7**: PC・タブレット・スマホの主要画面（TODO一覧・フィルターバー・各モーダル）で、要素の重なり・はみ出し等のレイアウト崩れが無い。

## このレイヤーが公開する契約（外部インターフェース）

| コンポーネント | 変更種別 | 変更内容 | 備考 |
|---|---|---|---|
| `TodoFormModal` | 変更 | パネルクラスに`sm:`未満用のボトムシートスタイル追加（`rounded-t-[22px] rounded-b-none`+上部ハンドルバー要素、`items-end`は既存のまま） | props変更なし |
| `DeleteConfirmDialog` | 変更 | 同上 | props変更なし |
| `TagManagementModal` | 変更 | 同上 | props変更なし |
| `TodoListPage` | 変更 | ヘッダーの「+追加」ボタンを`sm:`以上のみ表示に変更し、`sm:`未満用にFAB（`fixed bottom-6 right-6 sm:hidden`）を追加 | props変更なし |
| `TodoListItem` | 変更 | カード本体に`onTouchStart`/`onTouchMove`/`onTouchEnd`を追加 | 新規props: `onTouchStart?: TouchEventHandler<HTMLElement>` 等 |
| `TodoList` | 変更 | 長押し検知ロジック（タイマー・移動量キャンセル・`elementFromPoint`によるドロップ先特定）を追加 | 既存の`onReorder`/`dragEnabled`propsをそのまま使う（新規propsなし） |

## 長押しドラッグの実装ロジック（疑似コード）

`TodoList`に以下を追加する。既存のHTML5 D&Dロジック（`handleDragStart`/`handleDragOver`/`handleDrop`/`handleDragEnd`）とは別経路だが、**確定処理（並び替え配列の計算と`onReorder`呼び出し）は共通関数に抽出して両方から呼ぶ**こと（重複実装を避ける）。

```ts
const LONG_PRESS_MS = 500;
const CANCEL_THRESHOLD_PX = 10;

const touchStateRef = useRef<{
  todoId: number;
  startX: number;
  startY: number;
  timerId: ReturnType<typeof setTimeout> | null;
} | null>(null);

function commitReorder(sourceId: number, targetId: number) {
  // 既存 handleDrop の並び替え計算ロジックをここへ抽出し、
  // HTML5 D&D の handleDrop とタッチの handleTouchEnd 両方から呼ぶ。
  if (sourceId === targetId) return;
  const ids = draggableTodos.map((todo) => todo.id);
  const sourceIndex = ids.indexOf(sourceId);
  const targetIndex = ids.indexOf(targetId);
  if (sourceIndex === -1 || targetIndex === -1) return;
  const [movedId] = ids.splice(sourceIndex, 1);
  ids.splice(targetIndex, 0, movedId);
  onReorder(ids);
}

function handleTouchStart(todoId: number) {
  return (event: TouchEvent<HTMLButtonElement>) => {
    if (!dragEnabled) return;
    const touch = event.touches[0];
    const timerId = setTimeout(() => {
      setDragId(todoId);
      if (touchStateRef.current) touchStateRef.current.timerId = null;
    }, LONG_PRESS_MS);
    touchStateRef.current = { todoId, startX: touch.clientX, startY: touch.clientY, timerId };
  };
}

function handleTouchMove(event: TouchEvent<HTMLLIElement>) {
  const state = touchStateRef.current;
  if (!state) return;
  const touch = event.touches[0];
  const dx = Math.abs(touch.clientX - state.startX);
  const dy = Math.abs(touch.clientY - state.startY);

  if (state.timerId !== null) {
    // 長押し確定前: 一定以上動いたらキャンセルし、通常スクロールに委ねる
    if (dx > CANCEL_THRESHOLD_PX || dy > CANCEL_THRESHOLD_PX) {
      clearTimeout(state.timerId);
      touchStateRef.current = null;
    }
    return;
  }

  // 長押し確定済み = ドラッグモード中。スクロールを抑制し、指の下の要素からTODO行を特定する
  event.preventDefault();
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const li = target?.closest('li[data-testid^="todo-item-"]');
  const idAttr = li?.getAttribute("data-testid");
  const todoId = idAttr ? Number(idAttr.replace("todo-item-", "")) : NaN;
  if (!Number.isNaN(todoId) && draggableTodoIds.has(todoId)) {
    setDragOverId(todoId);
  }
}

function handleTouchEnd() {
  const state = touchStateRef.current;
  if (!state) return;
  if (state.timerId !== null) {
    clearTimeout(state.timerId); // 長押し未成立のまま終了（タップ・スクロール等）
  } else if (dragId !== null && dragOverId !== null) {
    commitReorder(dragId, dragOverId);
  }
  touchStateRef.current = null;
  setDragId(null);
  setDragOverId(null);
}
```

**重要な技術的注意（テスト実装時）**: jsdom環境には`document.elementFromPoint`の実装が無い（呼び出すと`undefined`を返すか、テストが失敗する）。`TodoList.test.tsx`でこの関数を使うテストを書く際は、`vi.spyOn(document, "elementFromPoint").mockReturnValue(...)`で対象要素をモックすること。タイマーのテストには`vi.useFakeTimers()`/`vi.advanceTimersByTime(500)`を使う。

**重要な技術的注意（通常スクロールとドラッグ中のスクロール抑止の両立）**: 長押し成立前・移動量超過によるキャンセル後はページの通常スクロールを許可する必要があるため、未完了カード本体には通常のタッチ操作を保つ。長押し成立後の`touchmove`だけは、Reactのpassiveリスナーの影響を避けるため、`TodoList`が`{ passive: false, capture: true }`のネイティブ`document`リスナーで`preventDefault()`を呼び、意図しないスクロールを抑止する。`TodoList`のJSXハンドラはドロップ先の行特定を担当する。`touchcancel`ではタイマー・ドラッグ状態を破棄する。

## 実装配置

- `src/react-app/components/TodoFormModal.tsx`（変更）
- `src/react-app/components/DeleteConfirmDialog.tsx`（変更）
- `src/react-app/components/TagManagementModal.tsx`（変更）
- `src/react-app/components/TodoListPage.tsx`（変更） — FAB追加
- `src/react-app/components/TodoListItem.tsx`（変更） — タッチイベントprops追加
- `src/react-app/components/TodoList.tsx`（変更） — 長押し検知ロジック追加、`commitReorder`共通化
- 対応する`.test.tsx`ファイル（変更）

## UI/UX 方針

- **画面フロー / 導線**: 既存のまま。モバイルでは「+追加」の導線がFABに変わる以外、画面遷移・操作フローに変更はない。
- **主要操作とフィードバック**: ボトムシートは画面下部からスライドインする視覚効果を持たせる（CSSトランジション。既存の`fixed inset-0`オーバーレイ構造は維持）。長押し中はドラッグ対象の行に既存のD&Dと同じハイライト（`isDragOver`時の`bg-chip-bg`/`border-chip-border`）を適用し、フィードバックを統一する。
- **状態設計（出し分け）**: 既存の4状態分岐（ローディング/エラー/空/成功）は不変。
- **既存デザインシステムとの整合**: 新規トークン追加なし。ボトムシートの角丸・シャドウはUnit3で確立した値（`rounded-[22px]`・`shadow-[0_24px_70px_rgba(0,0,0,0.28)]`）を上部のみに適用する形（`rounded-t-[22px] rounded-b-none`）に変更する。

### レスポンシブ / アクセシビリティ

- **対象端末**: PC・タブレット・スマートフォン。
- **主対象ブレークポイント**: `sm`（640px）を境に、`sm`未満=モバイル専用パターン（ボトムシート・FAB・長押しドラッグ）、`sm`以上=既存のPC/タブレット表示（中央ダイアログ・ヘッダーボタン・マウスD&D）。
- **タブレット方針**: `sm`以上として扱われるため、PC版のレイアウトがそのまま適用される（REQUIREMENTS.mdもタブレットに専用要件を課していない）。
- **スマホ方針**: 上記AC-1〜6の通り。
- **a11y 最低限**: FABに`aria-label="TODOを追加"`。ボトムシートのハンドルバーは装飾要素（`aria-hidden="true"`）とし、閉じる操作自体は既存のキャンセルボタン・オーバーレイクリックのまま変更しない。長押しドラッグはキーボード操作に対応しない（HTML5 D&D同様、REQUIREMENTS.mdにも要求なし、Unit5からの継続方針）。`min-h-11`のタップサイズ規約をFAB（58x58px相当）にも適用する。

## 異常系挙動

Unit5の異常系挙動（並び替えAPI失敗時のロールバック・エラートースト）をそのまま継承する。本ユニットでの追加の異常系は無い（長押し検知自体はクライアント内で完結し、通信を伴わないため）。

## テストケース（技法注記付き）

- [代表値] `sm`未満のビューポートで、TODO作成モーダルがボトムシート型クラス（`rounded-t-[22px]`等）を持つ
- [代表値] `sm`以上のビューポートで、TODO作成モーダルが既存の中央ダイアログ型クラスのまま
- [回帰] 削除確認ダイアログ・タグ管理モーダルも同様にボトムシート/中央ダイアログの出し分けができる
- [代表値] `sm`未満でFABが表示され、`sm`以上ではヘッダーの「+追加」ボタンが表示される（互いに排他）
- [代表値] 未完了TODOカードを500ms長押し（`vi.advanceTimersByTime`）した後、`touchmove`で別のTODO行にオーバーラップすると、その行が`isDragOver`状態になる
- [境界値] 長押し中（タイマー完了前）に10pxを超えて指が動くと、長押しがキャンセルされドラッグモードに入らない
- [境界値] 長押し中に10px未満の移動では、長押しはキャンセルされずタイマーが継続する
- [代表値] 長押しドラッグ確定（`touchend`）後、`onReorder`が正しい新順序の配列で呼ばれる
- [デシジョンテーブル] `dragEnabled=false`の時は`touchstart`があってもタイマーが開始されない（`sortBy≠manual`時の長押しドラッグ無効化、Unit5のAC-5相当をタッチ入力でも担保）
- [回帰] 既存のマウスD&D（`TodoList.test.tsx`のUnit5テスト群）がすべてgreenのまま
