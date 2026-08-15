# filter-sort-search: ui 詳細設計

> [index.md](./index.md) の実装 spec。対象: `src/react-app/` 配下。実装は Codex に委譲する。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-5**: フィルター・検索・ソートのどの組み合わせを指定しても、TODOの `sortOrder` カラムの値自体は変更されない（表示順の計算のみに影響する）。
- **AC-6**: UI一覧画面に検索ボックスが表示され、入力するとタイトル・説明で絞り込まれた一覧が表示される。
- **AC-7**: UI一覧画面にフィルター操作UI（ステータス・優先度・タグ・期限の4属性、チップ形式）が表示され、選択中の条件がチップとして表示・削除できる。同時に選択できる属性は最大4つ（各属性1条件まで）。
- **AC-8**: UI一覧画面にソート選択UI（5種類）が表示される。`manual`以外を選択すると昇順・降順切り替えボタンが表示され、`manual`選択時は非表示になる。

## このレイヤーが公開する契約（外部インターフェース）

新規コンポーネント`TodoFilterBar`を`TodoListPage`のヘッダー下に追加する。

| コンポーネント | 変更種別 | props | 備考 |
|---|---|---|---|
| `TodoFilterBar`（新規） | 追加 | `{ search: string; onSearchChange: (v: string) => void; filters: TodoFilters; onFiltersChange: (f: TodoFilters) => void; sortBy: SortBy; sortOrder: "asc" \| "desc"; onSortChange: (sortBy: SortBy, sortOrder: "asc" \| "desc") => void; tags: TagResponse[] }` | 検索ボックス・フィルターチップ・フィルターメニュー（属性→値の2段階）・ソートセレクト・方向トグルを内包。メニュー開閉状態は内部stateで持つ（親に漏らさない） |
| `TodoListPage` | 変更 | 既存のまま | `search`/`filters`/`sortBy`/`sortOrder`のstateを追加保持し、`useTodos()`へクエリパラメータとして渡す。`TodoFilterBar`をヘッダー下に配置 |
| `useTodos` (`hooks/useTodos.ts`) | 変更 | `useTodos(params?: ListTodosParams)` | 引数追加（既存の無引数呼び出しは`{}`扱いで後方互換）。クエリキーは`[...TODOS_QUERY_KEY, params]`（`TODOS_QUERY_KEY`自体は不変のため、他フックの`invalidateQueries({queryKey: TODOS_QUERY_KEY})`はprefix一致で全パラメータ組み合わせを無効化できる） |

### 型定義（`src/react-app/`側。`ListTodosParams`は`fetchTodos`のクエリ文字列組み立てに使う）

```ts
export interface TodoFilters {
  status: TodoStatus | null;
  priority: TodoPriority | null;
  tagId: number | null;
  due: "TODAY" | "OVERDUE" | "NONE" | null;
}
export type SortBy = "manual" | "dueDate" | "priority" | "createdAt" | "updatedAt";
export interface ListTodosParams {
  search?: string;
  filters?: TodoFilters;
  sortBy?: SortBy;
  sortOrder?: "asc" | "desc";
}
```

`fetchTodos(params)`は`URLSearchParams`で空でないフィールドのみをクエリ文字列化する（`filters`の各キーが`null`なら省略、`search`が空文字列なら`q`パラメータ自体を付けない）。

## このレイヤーが依存する下位の契約（呼び出す相手）

- 呼び出す相手: `GET /api/todos`（[service.md](./service.md)参照。クエリパラメータ: `status`/`priority`/`tagId`/`due`/`q`/`sortBy`/`sortOrder`）
- 呼び出す相手: `GET /api/tags`（既存、タグフィルターの選択肢生成に使う。`hooks/useTags.ts`の`useTags()`をそのまま利用）

## 実装配置

- `src/react-app/hooks/useTodos.ts`（変更） — `useTodos(params)`・`fetchTodos(params)`のクエリ文字列組み立て
- `src/react-app/components/TodoFilterBar.tsx`（新設）
- `src/react-app/components/TodoFilterBar.test.tsx`（新設）
- `src/react-app/components/TodoListPage.tsx`（変更） — `search`/`filters`/`sortBy`/`sortOrder`のstate追加、`TodoFilterBar`配置、`useTodos(params)`呼び出しへ変更

## UI/UX 方針

- **画面フロー / 導線**: `TodoListPage`ヘッダー（Unit3で刷新済み）の下に`TodoFilterBar`を配置する。検索ボックス→フィルターチップ列（+フィルター追加ボタン）→ソートセレクト+方向トグル、の横並び（Unit3の配色トークン・角丸・shadowパターンを踏襲）。
- **主要操作とフィードバック**:
  - 検索ボックスに入力するたび（`onChange`）に一覧が絞り込まれる（デバウンス無し。REQUIREMENTS.mdに要求が無くYAGNI）。
  - フィルター「+フィルター」ボタン→属性選択メニュー（ステータス/優先度/タグ/期限）→値選択メニューの2段階。選択済み属性はメニューの選択肢から除外される（最大4チップ）。
  - チップの×クリックで該当フィルターを解除。チップ本体クリックで値選択メニューを再度開く（値の変更）。
  - ソートセレクトで`manual`以外を選ぶと方向トグル（↑/↓）が現れる。`manual`に戻すとトグルは消える。
- **状態設計（出し分け）**: 検索・フィルター・ソートの変更は`TodoListPage`の既存のローディング/エラー/空/成功の4状態分岐（Unit3で確立）にそのまま乗る（`useTodos(params)`の`isLoading`/`isError`は既存分岐を再利用）。フィルター適用で0件になった場合の空状態メッセージは、Unit3のデザイン（`TodoOS v2.dc.html`のrenderVals）に倣い「条件に一致する TODO がありません」（TODOが1件も無い場合の「TODO はまだありません」とは文言を分ける）。
- **既存デザインシステムとの整合**: Unit3で確立した`@theme`トークン（`chip-bg`/`chip-border`/`chip-fg`等）をそのまま使う。新規トークン追加は不要。

### レスポンシブ / アクセシビリティ

- **対象端末**: PC・タブレット・スマートフォン。
- **主対象ブレークポイント**: Unit3を踏襲し`sm:`基準。`TodoFilterBar`内の要素（検索ボックス・チップ列・ソートセレクト）は画面幅が狭い場合`flex-wrap`で折り返す。横スクロール可能なチップ列（デザインのモバイル版パターン）は本ユニットでは採用せず、折り返しで対応する（横スクロールUIはUnit6のモバイル専用パターンで検討）。
- **タブレット/スマホ方針**: PCと同一構造のまま`flex-wrap`で縦積みに近い表示になる。
- **a11y 最低限**: 検索ボックスに`aria-label="TODOを検索"`（placeholderのみに頼らない）。フィルターチップの削除ボタンに`aria-label="フィルターを削除"`。ソートセレクトに関連付いた`<label>`。フィルターメニュー（ポップオーバー）は`Escape`キーで閉じる。既存の`min-h-11`タップサイズ規約を新規要素にも適用する。

## 異常系挙動

| シナリオ | 本レイヤーの挙動 |
|---|---|
| フィルター適用でAPIが`400`（通常起こり得ないが念のため） | 既存の一覧取得エラー分岐（`isError`→「TODOの取得に失敗しました」+再試行ボタン）に合流させる |
| タグ一覧取得（`useTags()`）が失敗 | フィルターメニューのタグ属性の選択肢が空になる（`useTags()`の既存エラー処理に委ねる。フィルターバー自体は表示され続ける） |

## テストケース（技法注記付き）

- [代表値] 検索ボックスに文字を入力すると`useTodos`に`search`パラメータが渡り、APIへ`q`クエリが送信される
- [代表値] ステータスフィルターを選択すると一覧が絞り込まれる（チップが表示される）
- [代表値] フィルターチップの×をクリックすると該当フィルターが解除され、一覧が再取得される
- [デシジョンテーブル] フィルターメニューの属性選択肢（ステータス/優先度/タグ/期限）は、選択済みの属性を除いた残りのみ表示される（4属性 × 選択済み0〜3個の組み合わせ）
- [代表値] ソートセレクトで`期限`を選択すると方向トグルボタンが表示される
- [代表値] ソートセレクトで`手動`を選択すると方向トグルボタンが非表示になる
- [代表値] 方向トグルボタンをクリックすると`asc`/`desc`が切り替わり、APIへ渡る`sortOrder`が変わる
- [境界値] フィルター適用で0件になった場合「条件に一致する TODO がありません」が表示される（TODO自体が0件の場合の文言とは異なる）
- [代表値] 複数フィルター（例: ステータス+期限）を同時に適用すると、両方の条件がAPIクエリパラメータに含まれる
- [回帰] 既存の`TodoListPage.test.tsx`のローディング/エラー/空/成功の4状態分岐テストが、`useTodos()`のシグネチャ変更後も green のまま
