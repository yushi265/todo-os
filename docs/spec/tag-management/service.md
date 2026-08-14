# tag-management: service 詳細設計

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: タグ名（1〜50文字必須・一意）を指定してタグを作成できる。既存タグと重複する名前では作成できずエラーになる
- **AC-2**: 既存タグの名前を変更（リネーム）できる。変更後の名前が自分以外の既存タグと重複する場合はエラーになり変更されない
- **AC-3**: タグを削除できる。削除には確認ダイアログを伴う。削除するとそのタグを持つ全 TODO から関連付けが解除されるが、TODO 本体・他のタグは削除されない
  （本レイヤーは削除の実行と `ON DELETE CASCADE` によるデータ整合性を担当。確認ダイアログは ui.md）
- **AC-4**: TODO 作成時に、既存タグの選択・新規タグ名の入力により複数タグを同時に付与できる
  （本レイヤーは `POST /api/todos` の `tagIds` 受け付けを担当。新規タグ名の入力からのタグ作成自体は ui 側が `POST /api/tags` を先に呼ぶ）
- **AC-5**: TODO 編集時に、付与するタグの追加・削除（タグ付けの変更）ができる
- **AC-7**: 存在しないタグ ID を TODO 作成・更新のリクエストに含めた場合はエラーになり、TODO は作成・更新されない

## このレイヤーが公開する契約（外部インターフェース）

追加型:

```ts
interface TagResponse {
  id: number;
  name: string;
  createdAt: string; // SQLite の current_timestamp 形式（"YYYY-MM-DD HH:MM:SS"。ISO 8601 ではない）
  updatedAt: string;
}
```

既存型の拡張（`src/shared/types.ts`。既存フィールドは変更しない）:

```ts
interface TodoResponse {
  // ...既存フィールド（id/title/description/status/priority/dueDate/sortOrder/createdAt/updatedAt）は変更なし
  tags: TagResponse[]; // 追加。紐づくタグが無ければ空配列
}
```

既存スキーマの拡張（`src/shared/schemas.ts`。既存フィールドの制約は変更しない）:

```ts
// createTodoSchema / updateTodoSchema に追加
tagIds: z.array(z.number().int().positive()).optional();

// 新規
const createTagSchema = z.object({ name: z.string().min(1).max(50) });
const updateTagSchema = z.object({ name: z.string().min(1).max(50) });
```

| 操作 | 名前 / パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|------|------------|-----------------|-------------------|------|
| 追加 | `GET /api/tags` | 入力なし。出力: `200 TagResponse[]`（`id` 昇順） | Cloudflare Access | 一覧取得（AC-8） |
| 追加 | `POST /api/tags` | 入力: `{ name: string(1-50) }`。出力: `201 TagResponse` / `400` / `409`（名前重複） | 同上 | 作成（AC-1） |
| 追加 | `PATCH /api/tags/:id` | 入力: パス `id: number` + `{ name: string(1-50) }`。出力: `200 TagResponse` / `400` / `404` / `409`（名前重複。自分自身の現在の名前との一致は重複扱いしない） | 同上 | リネーム（AC-2, AC-8） |
| 追加 | `DELETE /api/tags/:id` | 入力: パス `id: number`。出力: `204` / `404` | 同上 | 削除（AC-3, AC-8） |
| 変更 | `POST /api/todos` | 入力に `tagIds?: number[]` 追加（既存フィールドは todo-crud-basic/service.md のまま）。存在しない `tagIds` を含む場合 `400`。出力の `TodoResponse` に `tags` 追加 | 同上 | 作成時タグ付与（AC-4, AC-7） |
| 変更 | `PATCH /api/todos/:id` | 入力に `tagIds?: number[]` 追加（指定時は関連付けを完全に置き換え。未指定なら既存のタグ付けを変更しない）。存在しない `tagIds` を含む場合 `400`。出力の `TodoResponse` に `tags` 追加 | 同上 | タグ付け変更（AC-5, AC-7） |
| 変更 | `GET /api/todos`・`GET /api/todos/:id` | 出力の各 `TodoResponse` に `tags` 追加（`todo_tags` を `id` 昇順で JOIN） | 同上 | タグ込み一覧・単体取得（AC-6） |

## このレイヤーが依存する下位の契約（呼び出す相手）

- 呼び出す相手: Cloudflare D1（`tags`/`todo_tags` テーブル。定義は `src/db/schema.ts`、変更なし）
- 受け渡し: Drizzle ORM（`drizzle-orm/d1`）経由。`tags.name` の `UNIQUE` 制約違反は D1 の constraint エラーとしてスローされるため捕捉して `409` に変換する。`todo_tags` の `ON DELETE CASCADE` はタグ削除時の関連付け解除をアプリケーションコード側の追加処理なしで担保する。

## 実装配置

- `src/shared/types.ts`（既存・拡張）: `TagResponse` 追加、`TodoResponse` に `tags` 追加
- `src/shared/schemas.ts`（既存・拡張）: `createTagSchema`/`updateTagSchema` 追加、`createTodoSchema`/`updateTodoSchema` に `tagIds` 追加
- `src/worker/routes/tags.ts`（新規）: `/api/tags` 系ルーティング + ハンドラ
- `src/worker/routes/todos.ts`（既存・拡張）: `tagIds` の検証・関連付け作成/更新、レスポンスへの `tags` 付与、一覧/単体取得時のタグ JOIN（N+1 を避ける）
- `src/worker/index.ts`（既存・拡張）: `app.route("/api/tags", tagsRoute)` を追加

## UI/UX 方針

該当なし（表示層は [ui.md](./ui.md) を参照）。

## 異常系挙動

| シナリオ | 本レイヤーの挙動（エラーコード・レスポンス） |
|---|---|
| タグ名が空文字・51文字以上 | `400 { error: "Validation failed", details: <zod issues> }` |
| タグ名が既存タグと重複（作成・自分以外へのリネーム） | `409 { error: "Tag name already exists" }` |
| 存在しない `id` へのタグ PATCH/DELETE | `404 { error: "Tag not found" }` |
| TODO 作成・更新の `tagIds` に存在しない ID を含む | `400 { error: "One or more tagIds do not exist" }` |
| D1 クエリ失敗（想定外） | `500 { error: "Internal server error" }` |

## テストケース（技法注記付き）

- [境界値] タグ名1文字で作成 → `201`
- [境界値] タグ名50文字で作成 → `201`
- [境界値] タグ名0文字（空文字）で作成 → `400`
- [境界値] タグ名51文字で作成 → `400`
- [代表値] 既存タグと同名で作成 → `409`
- [代表値] タグ名を変更（リネーム）→ `200`、変更後の名前が反映される
- [境界値] リネーム時、変更後の名前を自分自身の現在の名前と同じにする → `200`（自己重複はエラーにしない）
- [代表値] リネーム時、変更後の名前が別の既存タグと重複 → `409`
- [境界値] 存在しない `id` へのリネーム → `404`
- [代表値] タグ削除 → `204`、直後の `GET /api/tags` に含まれない
- [代表値] タグ削除後、そのタグを持っていた TODO の `tags` から当該タグが消える（`todo_tags` の CASCADE 確認）
- [境界値] 存在しない `id` のタグ削除 → `404`
- [代表値] `GET /api/tags` で全タグが `id` 昇順で返る
- [代表値] `tagIds` を指定して TODO 作成 → `201`、レスポンスの `tags` に指定した全タグが含まれる
- [代表値] `tagIds` を省略して TODO 作成 → `201`、`tags: []`
- [境界値] 存在しない `tagIds` を含めて TODO 作成 → `400`、TODO は作成されない
- [代表値] PATCH で `tagIds` を別の組み合わせに入れ替え → `200`、`tags` が新しい内容に更新される
- [代表値] PATCH で `tagIds` を省略 → 既存のタグ付けが変更されない
- [境界値] PATCH で `tagIds: []`（空配列を明示指定）→ 既存のタグ付けが全て解除される
- [代表値] 複数 TODO・複数タグが存在する状態で `GET /api/todos` を実行 → 各 TODO に正しいタグの組み合わせが紐づいて返る（N+1 でなく一括 JOIN で取得できていることの機能確認）
