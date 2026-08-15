# filter-sort-search: service 詳細設計

> [index.md](./index.md) の実装 spec。対象: `src/worker/` 配下。実装は Codex に委譲する。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: `GET /api/todos` は `status`（`TODO`/`IN_PROGRESS`/`DONE`/`CANCELED`）・`priority`（`HIGH`/`MEDIUM`/`LOW`）・`tagId`（数値）・`due`（`TODAY`/`OVERDUE`/`NONE`）のクエリパラメータを受け付け、指定された条件をすべて満たす（AND）TODOのみを返す。パラメータ省略時はその条件を適用しない。
- **AC-2**: `due=TODAY`/`due=OVERDUE` の判定は Asia/Tokyo 基準の「本日」で行う。`due=OVERDUE` は未完了（`TODO`/`IN_PROGRESS`）かつ期限が本日より前の TODO のみ対象（`DONE`/`CANCELED`は対象外）。`due=NONE` は `dueDate` が `null` の TODO のみ。
- **AC-3**: `GET /api/todos` は `q` クエリパラメータを受け付け、タイトルまたは説明に部分一致するTODOのみを返す（大文字小文字を区別しない）。
- **AC-4**: `GET /api/todos` は `sortBy`（`manual`/`dueDate`/`priority`/`createdAt`/`updatedAt`。省略時 `manual`）と `sortOrder`（`asc`/`desc`。省略時 `asc`）を受け付ける。`sortBy=manual` の場合は `sortOrder` を無視し、常に `sortOrder` カラムの昇順で返す。`priority` ソートは優先度ランク（`HIGH`=3, `MEDIUM`=2, `LOW`=1, 未設定=0）を数値として`asc`/`desc`する。すなわち `asc`指定時は 未設定 → `LOW` → `MEDIUM` → `HIGH` の順、`desc`指定時は `HIGH` → `MEDIUM` → `LOW` → 未設定の順（Claude Designの`compareTodos`ロジックに準拠）。`dueDate` ソートは未設定（`null`）を常に末尾に置く（昇順・降順いずれでも）。
- **AC-5**: フィルター・検索・ソートのどの組み合わせを指定しても、TODOの `sortOrder` カラムの値自体は変更されない（表示順の計算のみに影響する）。

## このレイヤーが公開する契約（外部インターフェース）

| 操作 | パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|------|------|-----------------|-------------------|------|
| 変更 | `GET /api/todos` | クエリパラメータ（すべて任意・型は下記スキーマ）。レスポンスは既存の`TodoResponse[]`と同一型（変更なし） | Cloudflare Access（既存のまま） | フィルター・ソート・検索済み一覧取得 |

### クエリパラメータのZodスキーマ（`src/shared/schemas.ts` に追加）

```ts
export const listTodosQuerySchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  tagId: z.coerce.number().int().positive().optional(),
  due: z.enum(["TODAY", "OVERDUE", "NONE"]).optional(),
  q: z.string().optional(),
  sortBy: z
    .enum(["manual", "dueDate", "priority", "createdAt", "updatedAt"])
    .optional()
    .default("manual"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});
export type ListTodosQuery = z.infer<typeof listTodosQuerySchema>;
```

- `c.req.query()`（Hono、クエリパラメータをオブジェクトで返す）を`listTodosQuerySchema.safeParse()`に渡す。失敗時は既存パターンと同じ`400`（`{error: "Validation failed", details: parsed.error.issues}`）。
- `tagId`が存在しないタグIDでも400にはしない（該当0件の`200`を返す。index.mdのエラー方針表参照）。

## 実装ロジック（Drizzle ORM・具体式）

既存の`todosRoute.get("/", ...)`（`src/worker/routes/todos.ts:72-81`）を以下の方針で拡張する。

### 期限判定（Asia/Tokyo基準、service側に独立実装）

```ts
function todayInTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}
```

（`src/react-app/lib/isOverdue.ts`と同じロジックだが、Workers runtime用に`src/worker/`配下へ独立実装する。理由はindex.md判断根拠を参照）

### フィルター条件（AND結合）

```ts
const conditions = [];
if (status) conditions.push(eq(todos.status, status));
if (priority) conditions.push(eq(todos.priority, priority));
if (due === "TODAY") conditions.push(eq(todos.dueDate, today));
if (due === "OVERDUE") {
  conditions.push(lt(todos.dueDate, today));
  conditions.push(notInArray(todos.status, ["DONE", "CANCELED"]));
}
if (due === "NONE") conditions.push(isNull(todos.dueDate));
if (q) {
  const pattern = `%${q.toLowerCase()}%`;
  conditions.push(
    or(
      like(sql`lower(${todos.title})`, pattern),
      like(sql`lower(${todos.description})`, pattern),
    ),
  );
}
```

`tagId`指定時は、`todoTags`テーブルへのサブクエリで絞り込む（`innerJoin`は列名衝突・重複行のリスクがあるため避ける）:

```ts
if (tagId) {
  conditions.push(
    inArray(
      todos.id,
      db.select({ id: todoTags.todoId }).from(todoTags).where(eq(todoTags.tagId, tagId)),
    ),
  );
}
```

### ソート順（`sortBy`→`orderBy`配列への変換）

```ts
function buildOrderBy(sortBy: ListTodosQuery["sortBy"], sortOrder: "asc" | "desc") {
  const dir = sortOrder === "asc" ? asc : desc;
  switch (sortBy) {
    case "dueDate":
      // NULL は常に末尾（IS NULL の 0/1 判定を asc 固定で先に評価し、実値の比較にだけ dir を適用）
      return [asc(sql`${todos.dueDate} IS NULL`), dir(todos.dueDate)];
    case "priority": {
      const rank = sql`CASE ${todos.priority} WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END`;
      return [dir(rank)];
    }
    case "createdAt":
      return [dir(todos.createdAt)];
    case "updatedAt":
      return [dir(todos.updatedAt)];
    default: // "manual"
      return [asc(todos.sortOrder)];
  }
}
```

### 組み立て

```ts
todosRoute.get("/", async (c) => {
  const parsed = listTodosQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.issues } satisfies ErrorResponse, 400);
  }
  const { status, priority, tagId, due, q, sortBy, sortOrder } = parsed.data;
  const db = drizzle(c.env.DB);
  const conditions = [...]; // 上記
  let query = db.select().from(todos).$dynamic();
  if (conditions.length > 0) query = query.where(and(...conditions));
  query = query.orderBy(...buildOrderBy(sortBy, sortOrder));
  const result = await query.all();
  const withTags = await attachTags(db, result);
  return c.json(withTags satisfies TodoResponse[]);
});
```

（`.$dynamic()`はDrizzleで条件付きに`.where()`を後付けするための builder。実際のAPIバージョンに応じて`node_modules/drizzle-orm`の型定義を確認してから実装すること）

## 実装配置

- `src/shared/schemas.ts`（変更） — `listTodosQuerySchema`追加
- `src/worker/routes/todos.ts`（変更） — `GET /`ハンドラをクエリパラメータ対応に拡張、`todayInTokyo()`/`buildOrderBy()`等のヘルパー追加
- `src/worker/index.test.ts`（変更） — API のレイヤー内結合テスト追加
- `src/worker/routes/todos.test.ts`（変更） — `buildOrderBy` 単体テストのみ追加

## 異常系挙動

| シナリオ | 本レイヤーの挙動 |
|---|---|
| 不正な`status`/`priority`/`due`/`sortBy`/`sortOrder`値 | `400`（`Validation failed`、zodのissuesを含む） |
| `tagId`が数値でない | `400`（`Validation failed`） |
| `tagId`が存在しないタグID | `200`（該当0件） |
| クエリパラメータ省略 | 全件・デフォルトソート（`manual`昇順）で返す（既存挙動と同一） |

## テストケース（技法注記付き）

- [代表値] `status=TODO` → `TODO`のTODOのみ返る
- [代表値] `priority=HIGH` → 優先度HIGHのTODOのみ返る
- [代表値] `tagId=<存在するID>` → そのタグを持つTODOのみ返る
- [境界値] `tagId=<存在しないID>` → 0件（400にならない）
- [代表値] `due=TODAY` → 期限が本日（Asia/Tokyo基準）のTODOのみ
- [デシジョンテーブル] `due=OVERDUE` × ステータス（TODO/IN_PROGRESS=対象、DONE/CANCELED=対象外）の4通り
- [代表値] `due=NONE` → `dueDate`が`null`のTODOのみ
- [代表値] `q=<部分文字列>` → タイトルまたは説明に部分一致するTODOのみ（大文字小文字区別なし。例: `q=CLOUD`が`cloudflareを調べる`にヒット）
- [デシジョンテーブル] `status`+`priority`同時指定 → 両方を満たすTODOのみ（AND）
- [代表値] `sortBy=dueDate&sortOrder=asc` → 期限昇順、`null`は末尾
- [代表値] `sortBy=dueDate&sortOrder=desc` → 期限降順、`null`は末尾（先頭ではない）
- [代表値] `sortBy=priority&sortOrder=asc` → 未設定→`LOW`→`MEDIUM`→`HIGH`の順
- [代表値] `sortBy=priority&sortOrder=desc` → `HIGH`→`MEDIUM`→`LOW`→未設定の順
- [代表値] `sortBy=createdAt`/`updatedAt`各`asc`/`desc` → 日時順
- [代表値] `sortBy=manual`（デフォルト） → `sortOrder`カラム昇順。`sortOrder=desc`を付けても無視される
- [代表値] `status=TODO&sortBy=dueDate` → フィルタ後、期限順にソートされる（フィルタとソートの併用）
- [代表値] フィルタ・ソートを指定してAPI呼び出し後も、DB上の`sortOrder`カラムの値が呼び出し前と一致する（AC-5、副作用が無いことの確認）
- [境界値] `status=INVALID`（enumにない値） → `400`
- [代表値] クエリパラメータ省略（既存動作） → 全件、`sortOrder`昇順（既存テストの回帰確認）
