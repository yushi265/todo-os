# todo-crud-basic: service 詳細設計

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: タイトル（1〜200文字必須）・説明（任意）・優先度（HIGH/MEDIUM/LOW、任意）・期限（YYYY-MM-DD、任意）を指定して TODO を作成できる。ステータスは常に `TODO` で作成され、作成リクエストで指定することはできない
- **AC-2**: 作成された TODO は、既存の `sort_order` 最大値 + 1（既存 TODO が無い場合は 0）で一覧の末尾に追加される
- **AC-3**: TODO 一覧は `sort_order` 昇順で表示され、各行にタイトル・ステータス・優先度・期限を表示する
  （本レイヤーは並び順を保証したデータ提供までを担当。表示は ui.md）
- **AC-5**: 既存 TODO のタイトル・説明・ステータス・優先度・期限を編集できる。ステータスは `TODO`/`IN_PROGRESS`/`DONE`/`CANCELED` の 4 値間を遷移制約なく自由に変更できる
- **AC-6**: TODO を削除できる。削除操作には確認ダイアログを伴い、確認後に物理削除される。キャンセルした場合は削除されない
  （本レイヤーは物理削除の実行を担当。確認ダイアログは ui.md）
- **AC-8**: タイトル未入力（0文字）、または 201 文字以上での TODO 作成・更新はエラーとなり、TODO は作成・更新されない
- **AC-9**: 存在しない TODO ID に対する取得（GET）・更新（PATCH）・削除（DELETE）はエラー（404）になる

## このレイヤーが公開する契約（外部インターフェース）

共通レスポンス型:

```ts
interface TodoResponse {
  id: number;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  dueDate: string | null; // YYYY-MM-DD
  sortOrder: number;
  createdAt: string; // SQLite の current_timestamp 形式（"YYYY-MM-DD HH:MM:SS"・UTC・'T'区切りなし。ISO 8601 ではない）
  updatedAt: string;
}

interface ErrorResponse {
  error: string;
  details?: unknown; // Zod issues（バリデーションエラー時のみ）
}
```

| 操作 | 名前 / パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|------|------------|-----------------|-------------------|------|
| 追加 | `GET /api/todos` | 入力なし。出力: `200 TodoResponse[]`（`sort_order` 昇順） | Cloudflare Access（アプリコード側の追加チェックなし） | 一覧取得（AC-3） |
| 追加 | `POST /api/todos` | 入力: `{ title: string(1-200), description?: string \| null, priority?: "HIGH"\|"MEDIUM"\|"LOW"\|null, dueDate?: string(YYYY-MM-DD)\|null }`（`status` は受け付けない）。出力: `201 TodoResponse` / `400 ErrorResponse` | 同上 | 作成（AC-1, AC-2, AC-8） |
| 追加 | `GET /api/todos/:id` | 入力: パス `id: number`。出力: `200 TodoResponse` / `404 ErrorResponse` | 同上 | 単体取得（AC-9） |
| 追加 | `PATCH /api/todos/:id` | 入力: パス `id: number` + ボディ `{ title?: string(1-200), description?: string \| null, status?: "TODO"\|"IN_PROGRESS"\|"DONE"\|"CANCELED", priority?: "HIGH"\|"MEDIUM"\|"LOW"\|null, dueDate?: string(YYYY-MM-DD)\|null }`（全フィールド任意・指定されたもののみ更新）。出力: `200 TodoResponse` / `400 ErrorResponse` / `404 ErrorResponse` | 同上 | 更新（AC-5, AC-8, AC-9） |
| 追加 | `DELETE /api/todos/:id` | 入力: パス `id: number`。出力: `204`（本文なし） / `404 ErrorResponse` | 同上 | 削除（AC-6, AC-9） |

- `title` の文字数バリデーションは Zod の `.min(1).max(200)` で実施。
- `dueDate` のフォーマットは `YYYY-MM-DD` 固定（正規表現 `^\d{4}-\d{2}-\d{2}$` で検証。実在しない日付＝例: `2026-02-30` はDBには文字列としてそのまま保存され、日付としての実在性検証はしない。REQUIREMENTS.md に実在性検証の要求なし＝YAGNI）。
- `PATCH` は未指定フィールドを更新しない（`undefined` と `null` を区別する。`null` は「値をクリアする」の意）。ただし本ユニットでは `title` に `null` を許可しない（Zod で `title` は `string` のみ、省略可・null不可）。
- `updatedAt` は PATCH 時にサーバー側で現在時刻に更新する。`createdAt` は不変。

## このレイヤーが依存する下位の契約（呼び出す相手）

- 呼び出す相手: Cloudflare D1（`todos` テーブル。定義は `src/db/schema.ts`、変更なし）
- 受け渡し: Drizzle ORM（`drizzle-orm/d1`）経由。`env.DB` バインディング（`wrangler.jsonc` 定義済み・変更なし）

## 実装配置

- `src/shared/schemas.ts`（新規）: Zod スキーマ（`createTodoSchema` / `updateTodoSchema`）+ 型 export（`CreateTodoInput` / `UpdateTodoInput`）。**service と ui の両方から参照する共有契約**（ui は作成/編集フォームのクライアント側バリデーションに同じスキーマを再利用する）
- `src/shared/types.ts`（新規）: `TodoResponse` / `ErrorResponse` 型（service と ui の共有契約）
- `src/worker/routes/todos.ts`（新規）: `/api/todos` 系ルーティング + ハンドラ（Hono の `Hono<{ Bindings: Env }>` インスタンスをサブルーターとして export）
- `src/worker/index.ts`（既存・改修）: `app.route("/api/todos", todosRoute)` でマウント。動作確認用の仮 `GET /api/health` と仮 `GET /api/todos` は削除する
- `src/db/schema.ts`（既存・変更なし）: `todos` テーブル定義を再利用

## UI/UX 方針

該当なし（表示層は [ui.md](./ui.md) を参照）。

## 異常系挙動

| シナリオ | 本レイヤーの挙動（エラーコード・レスポンス・ログ） |
|---|---|
| タイトル空文字（`""`） | `400 { error: "Validation failed", details: <zod issues> }` |
| タイトル201文字以上 | 同上 |
| `priority` が enum 外の値 | 同上 |
| `dueDate` が `YYYY-MM-DD` 形式でない | 同上 |
| PATCH で `status` が enum 外の値 | 同上 |
| 存在しない `id` への GET | `404 { error: "Todo not found" }` |
| 存在しない `id` への PATCH | 同上 |
| 存在しない `id` への DELETE | 同上 |
| D1 クエリ失敗（想定外の DB エラー） | `500 { error: "Internal server error" }`（詳細はレスポンスに含めない） |

## テストケース（技法注記付き）

- [境界値] タイトル1文字で作成 → `201`、`status: "TODO"`、`sortOrder` 採番済み
- [境界値] タイトル200文字で作成 → `201`
- [境界値] タイトル0文字（空文字）で作成 → `400`
- [境界値] タイトル201文字で作成 → `400`
- [代表値] タイトルのみ（description/priority/dueDate 省略）で作成 → `201`、省略フィールドは `null`
- [代表値] `priority` に `"HIGH"`/`"MEDIUM"`/`"LOW"` それぞれを指定して作成 → 各 `201`
- [境界値] `priority` に enum 外の値（例: `"URGENT"`）を指定 → `400`
- [代表値] `dueDate` に `"2026-08-20"` を指定して作成 → `201`
- [境界値] `dueDate` に不正形式（例: `"2026/08/20"`）を指定 → `400`
- [代表値] リクエストボディに `status` を含めて POST しても無視され `"TODO"` で作成される
- [代表値] 既存 TODO が0件の状態で作成 → `sortOrder: 0`
- [代表値] 既存 TODO の `sortOrder` 最大値が5の状態で作成 → `sortOrder: 6`
- [代表値] 複数 TODO 作成後に `GET /api/todos` → `sortOrder` 昇順で返る
- [境界値] TODO が0件の状態で `GET /api/todos` → `200 []`
- [状態遷移] `TODO→IN_PROGRESS→DONE→TODO`（差し戻し）と `CANCELED→IN_PROGRESS`（再開）を含む代表的な遷移が全て `200` で成功する
- [代表値] `title` のみ指定した PATCH → 他フィールドは変更されず、`updatedAt` のみ更新される
- [代表値] 存在する `id` を DELETE → `204`、直後の `GET /api/todos/:id` が `404`
- [境界値] 存在しない `id` を GET/PATCH/DELETE → いずれも `404`
