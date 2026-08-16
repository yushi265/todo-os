# subtasks: service 詳細設計

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: 既存 TODO の編集画面で、タイトル（1〜200文字必須）を指定してサブタスクを追加できる。追加したサブタスクは親 TODO に紐づいて保存され、通常の TODO 一覧には独立した行として表示されない
- **AC-2**: 親 TODO の取得レスポンスには、紐づくサブタスクが作成順で含まれる。TODO 一覧カードにはサブタスクの完了数/総数を表示する
- **AC-3**: 編集画面でサブタスクの完了状態を切り替えられ、変更が保存される。完了数/総数の表示も更新される
- **AC-4**: 編集画面でサブタスクを削除できる。親 TODO を削除した場合は、紐づくサブタスクも削除される
- **AC-5**: サブタスクのタイトルが空文字または201文字以上の場合、追加は400エラーとなり、既存データは変更されない。完了状態以外の不正な更新値も400エラーとなる
- **AC-6**: 存在しない親 TODO、存在しないサブタスク、または別の親に属するサブタスクへの操作は404エラーとなる
- **AC-7**: 既存 TODO の作成・取得・更新・削除・タグ・並び替えの挙動は、サブタスク未使用時も従来どおり維持される

## このレイヤーが公開する契約（外部インターフェース）

### レスポンス型

```ts
interface SubtaskResponse {
  id: number;
  todoId: number;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

既存の `TodoResponse` に次のフィールドを追加する。

```ts
subtasks: SubtaskResponse[];
```

### API

| 操作 | パス | 入出力・制約 | 成功 |
|---|---|---|---|
| 一覧 | `GET /api/todos/:todoId/subtasks` | 親IDは正の整数 | `200 SubtaskResponse[]`（id昇順） |
| 追加 | `POST /api/todos/:todoId/subtasks` | `{ title: string(1-200) }` | `201 SubtaskResponse` |
| 更新 | `PATCH /api/todos/:todoId/subtasks/:subtaskId` | `{ completed: boolean }` | `200 SubtaskResponse` |
| 削除 | `DELETE /api/todos/:todoId/subtasks/:subtaskId` | 親子が一致する対象のみ | `204`（本文なし） |

親 TODO の `GET /api/todos` と `GET /api/todos/:id` のレスポンスにも `subtasks` を付与する。既存フィールドと既存ステータスコードは変更しない。

### エラー

- JSON不正: `400 { error: "Invalid JSON" }`
- 入力不正: `400 { error: "Validation failed", details: ZodIssue[] }`
- 親が存在しない: `404 { error: "Todo not found" }`
- サブタスクが存在しない、または親子が不一致: `404 { error: "Subtask not found" }`

## このレイヤーが依存する下位の契約

- D1 の `subtasks` テーブル。`todo_id` は `todos.id` を参照し、`ON DELETE CASCADE` とする。
- `src/shared/schemas.ts` の `createSubtaskSchema` / `updateSubtaskSchema` を service と ui で共有する。

## 実装配置

- `src/db/schema.ts`: `subtasks` テーブル定義
- `drizzle/0001_aspiring_lady_deathstrike.sql`: D1 マイグレーション
- `src/shared/types.ts`: `SubtaskResponse` と `TodoResponse.subtasks`
- `src/shared/schemas.ts`: サブタスク作成/更新スキーマと入力型
- `src/worker/routes/todos.ts`: ネストしたサブタスク CRUD と親レスポンスへの一括付与
- `src/worker/index.test.ts`: API・外部キー・親子境界の結合テスト
- `src/shared/schemas.test.ts`: 入力境界値テスト

## 異常系挙動

| シナリオ | 本レイヤーの挙動（エラーコード・レスポンス・ログ） |
|---|---|
| 空タイトル/201文字タイトル | Zod で拒否し `400 Validation failed`。D1 は変更しない |
| `completed` がboolean以外 | Zod で拒否し `400 Validation failed` |
| 親 TODO が存在しない | `404 Todo not found` |
| サブタスクが存在しない/別親 | `404 Subtask not found` |
| D1障害 | `app.onError` がエラーをログ出力し `500 Internal server error` |

## テストケース（技法注記付き）

- [境界値] タイトル1文字のサブタスク追加 → `201`、`completed: false`
- [境界値] タイトル200文字のサブタスク追加 → `201`
- [境界値] 空タイトルの追加 → `400`、サブタスク未作成
- [境界値] 201文字タイトルの追加 → `400`、サブタスク未作成
- [代表値] 親に複数サブタスクを追加して一覧取得 → id昇順で返り、親TODOだけが一覧に含まれる
- [代表値] `completed: false → true → false` の更新 → いずれも `200`、状態が保存される
- [境界値] 更新の空body/非boolean completed → `400`、既存値不変
- [代表値] 正しい親のサブタスク削除 → `204`、再取得で404
- [境界値] 存在しない親・子、別親の子へのGET/POST/PATCH/DELETE → `404`
- [状態遷移] 親TODO削除 → `ON DELETE CASCADE` で子も削除
- [代表値] サブタスクなしの既存TODOレスポンス → `subtasks: []`、既存フィールドの挙動不変
