# manual-reorder: service 詳細設計

> [index.md](./index.md) の実装 spec。対象: `src/worker/` 配下。実装は Codex に委譲する。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: `PATCH /api/todos/reorder`は`todoIds: number[]`（リクエストボディ）を受け付け、配列の順序どおりに各TODOの`sortOrder`を`0`からの連番で一括更新する。
- **AC-2**: `todoIds`に重複する値が含まれる場合、`400`（Validation failed相当）を返す。
- **AC-3**: `todoIds`が、更新時点でDBに存在する全TODOのID集合と過不足なく一致しない場合（不足・過剰いずれも）、`400`を返す。
- **AC-7**: 並び替えAPIが失敗した場合、一覧は元の順序のまま変化せず、エラー通知が表示される。

## このレイヤーが公開する契約（外部インターフェース）

| 操作 | パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|------|------|-----------------|-------------------|------|
| 追加 | `PATCH /api/todos/reorder` | リクエスト: `{ todoIds: number[] }`（正の整数配列）。レスポンス: 成功時`204 No Content`（bodyなし）、失敗時`400`+`ErrorResponse` | Cloudflare Access（既存のまま） | TODO一覧の手動並び順を一括更新 |

### リクエストのZodスキーマ（`src/shared/schemas.ts` に追加）

```ts
export const reorderTodosSchema = z.object({
  todoIds: z.array(z.number().int().positive()),
});
export type ReorderTodosInput = z.infer<typeof reorderTodosSchema>;
```

## 実装ロジック（Hono + Drizzle ORM・具体式）

### ルーティング登録順序（最重要）

`src/worker/routes/todos.ts`の`todosRoute.patch("/reorder", ...)`は、**既存の`todosRoute.patch("/:id", ...)`より前に登録する**（Honoはルートを登録順で評価するため、後に登録すると`/reorder`が`:id="reorder"`にマッチしてしまう）。

### ハンドラ

```ts
todosRoute.patch("/reorder", async (c) => {
  const parsed = reorderTodosSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", details: parsed.error.issues } satisfies ErrorResponse,
      400,
    );
  }
  const { todoIds } = parsed.data;

  const uniqueIds = new Set(todoIds);
  if (uniqueIds.size !== todoIds.length) {
    return c.json(
      { error: "todoIds contains duplicate values" } satisfies ErrorResponse,
      400,
    );
  }

  const db = drizzle(c.env.DB);
  const existing = await db.select({ id: todos.id }).from(todos).all();
  const existingIds = new Set(existing.map((t) => t.id));

  const isExactMatch =
    uniqueIds.size === existingIds.size &&
    [...uniqueIds].every((id) => existingIds.has(id));
  if (!isExactMatch) {
    return c.json(
      {
        error: "todoIds must match the full set of existing todo ids",
      } satisfies ErrorResponse,
      400,
    );
  }

  await db.batch(
    todoIds.map((id, index) =>
      db.update(todos).set({ sortOrder: index }).where(eq(todos.id, id)),
    ) as [ReturnType<typeof db.update>, ...ReturnType<typeof db.update>[]],
  );

  return c.body(null, 204);
});
```

- `db.batch(...)`はDrizzle D1ドライバが提供する複数SQL文の一括実行API（内部的にD1の`batch()`を使い、部分失敗を防ぐ）。型シグネチャ（タプル要件等）は実際の`drizzle-orm/d1`のバージョンで確認してから実装すること。`todoIds`が空配列の場合（TODOが1件も無い）は`db.batch([])`の扱いを確認し、空配列なら何もせず`204`を返す分岐を入れる。
- 空配列ケース: `existingIds`も空集合なら`isExactMatch`は`true`になり、`db.batch([])`が呼ばれる。空配列を`batch`に渡した時の挙動（エラーになるか無害か）を確認し、必要なら早期return（`if (todoIds.length === 0) return c.body(null, 204);`）を追加する。

## 実装配置

- `src/shared/schemas.ts`（変更） — `reorderTodosSchema`追加
- `src/worker/routes/todos.ts`（変更） — `PATCH /reorder`ハンドラ追加（`/:id`より前に登録）
- `src/worker/index.test.ts`（変更） — レイヤー内結合テスト追加（Unit4のパターンを踏襲し、`GET /api/todos`と同じファイルに追加する）

## 異常系挙動

| シナリオ | 本レイヤーの挙動 |
|---|---|
| `todoIds`が配列でない・要素が正の整数でない | `400`（Validation failed、zodのissuesを含む） |
| `todoIds`に重複あり | `400`（`error: "todoIds contains duplicate values"`） |
| `todoIds`が既存の全TODO ID集合より不足（一部しか含まない） | `400`（`error: "todoIds must match the full set of existing todo ids"`） |
| `todoIds`が既存の全TODO ID集合を超過（存在しないIDを含む） | 同上 `400` |
| TODOが1件も無い状態で`todoIds: []` | `204`（正常。空集合同士の一致） |

## テストケース（技法注記付き）

- [代表値] `todoIds: [3, 1, 2]`（既存の全TODO ID）→ `204`、DBの`sortOrder`が`3→0, 1→1, 2→2`に更新される
- [境界値] `todoIds`に重複ID（例: `[1, 1, 2]`）→ `400`
- [境界値] `todoIds`が既存集合より1件少ない（不足）→ `400`
- [境界値] `todoIds`が既存集合に無いIDを含む（過剰）→ `400`
- [代表値] TODOが0件の状態で`todoIds: []` → `204`
- [境界値] `todoIds`の要素が正の整数でない（例: `0`, `-1`, 文字列）→ `400`
- [代表値] 並び替え後、`GET /api/todos?sortBy=manual`で新しい順序が反映されていることを確認
