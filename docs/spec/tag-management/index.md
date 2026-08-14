# tag-management: タグ管理

> 薄い実装 spec の入口。読み手は人間（Gate 1/2/3 承認者）。AI 実装エージェントはレイヤー別 `.md`（`service.md` / `ui.md`）を読む。
> 本プロジェクトはチケットレスのため `<TICKET>` は機能スラッグ `tag-management` を使う。

## 概要

タグの CRUD（作成・編集・削除）と、TODO への複数タグ付与・一覧でのタグ表示を実装する。
DB スキーマ（`tags` / `todo_tags`）は technical skeleton で確定済みのため変更しない。

## 対象範囲

- 対象レイヤー: service（Hono API + Drizzle/D1）、ui（React）
  - [service.md](./service.md)
  - [ui.md](./ui.md)
- 対象ドメイン: タグ（`tags` テーブル）・TODO とタグの関連付け（`todo_tags` テーブル）
- 対象外（やらないこと）:
  - タグによる TODO の絞り込み（フィルター機能。REQUIREMENTS.md 11章「フィルター」は後続ユニット）
  - タグの表示順序のカスタマイズ（作成順・ID 昇順のデフォルトのみ）
  - タグの色分け・アイコン等の装飾（REQUIREMENTS.md に記載なし）

## ユニット計画

単一ユニット（AC-1〜AC-8 を本ユニットで完結させる）。

## 受け入れ基準（AC）

- [ ] **AC-1**: タグ名（1〜50文字必須・一意）を指定してタグを作成できる。既存タグと重複する名前では作成できずエラーになる
- [ ] **AC-2**: 既存タグの名前を変更（リネーム）できる。変更後の名前が自分以外の既存タグと重複する場合はエラーになり変更されない
- [ ] **AC-3**: タグを削除できる。削除には確認ダイアログを伴う。削除するとそのタグを持つ全 TODO から関連付けが解除されるが、TODO 本体・他のタグは削除されない
- [ ] **AC-4**: TODO 作成時に、既存タグの選択・新規タグ名の入力により複数タグを同時に付与できる
- [ ] **AC-5**: TODO 編集時に、付与するタグの追加・削除（タグ付けの変更）ができる
- [ ] **AC-6**: TODO 一覧の各行に、その TODO に付与された全タグがバッジ形式で並べて表示される（件数制限なし）
- [ ] **AC-7**: 存在しないタグ ID を TODO 作成・更新のリクエストに含めた場合はエラーになり、TODO は作成・更新されない
- [ ] **AC-8**: タグ管理モーダルで全タグの一覧が表示され、各タグに編集（リネーム）・削除の操作がある

## アーキテクチャ / レイヤー間フロー

```
ui（React, TanStack Query）
  │ fetch("/api/tags", ...) / fetch("/api/todos", { tagIds }, ...)
  ▼
service（Hono API）
  │ Drizzle ORM
  ▼
D1（tags / todo_tags テーブル。既存スキーマ src/db/schema.ts をそのまま使用・変更なし）
```

- レイヤー間 IF（API パス・入出力の具体値）は [service.md](./service.md) が正本。
- **契約拡張**: Unit 1（todo-crud-basic）で確定した `TodoResponse` 型・`createTodoSchema`/`updateTodoSchema`（`src/shared/`）を本ユニットで拡張する（`tags` フィールド追加・`tagIds` 入力追加）。既存フィールドの削除・型変更は行わない（後方互換）。

## エラー・ログ方針（横断サマリ）

| シナリオ | service の挙動 | ui の挙動 |
|---|---|---|
| タグ名バリデーションエラー（空文字/51文字以上） | 400 + `{ error, details }` | フォーム内にエラーメッセージ表示 |
| タグ名重複（作成・リネーム時） | 409 + `{ error }` | フォーム内にエラーメッセージ表示 |
| 存在しないタグ ID（TODO 作成・更新時） | 400 + `{ error }` | フォーム内にエラーメッセージ表示 |
| 存在しないタグ ID（タグの PATCH/DELETE） | 404 + `{ error }` | エラーメッセージ表示 |
| サーバー内部エラー | 500 + `{ error }` | 汎用エラーメッセージ表示 |

詳細（メッセージ文言・ログ）は [service.md](./service.md) / [ui.md](./ui.md) の「異常系挙動」節。

## テスト戦略

基準は [testing.md](../../../.claude/rules/testing.md) の「テスト種別の分担」。ケース詳細は各レイヤー `.md` の「テストケース」節を参照。

| AC | 単体 | レイヤー内結合 |
|----|------|--------------|
| AC-1 | Zod スキーマ（タグ作成） | POST /api/tags |
| AC-2 | Zod スキーマ（タグ更新） | PATCH /api/tags/:id |
| AC-3 | — | DELETE /api/tags/:id・削除確認ダイアログ |
| AC-4 | Zod スキーマ（tagIds 拡張） | POST /api/todos（tagIds 付き） |
| AC-5 | — | PATCH /api/todos/:id（tagIds 付き） |
| AC-6 | タグバッジ表示ロジック | ui コンポーネント（TodoListItem） |
| AC-7 | — | POST/PATCH /api/todos の tagIds バリデーション |
| AC-8 | — | GET /api/tags・タグ管理モーダル |

## 既存実装との関係（再利用 / 差分 / 衝突）

- **再利用**: `src/db/schema.ts` の `tags`/`todo_tags` テーブル定義（変更不要。`tags.name` の `UNIQUE` 制約・`todo_tags` の `ON DELETE CASCADE` は既に確定済み）。`src/worker/routes/todos.ts` の `findTodoById`（拡張して使う）。テスト基盤・Tailwind CSS・Vitest projects 設定（変更不要）。
- **差分（拡張対象）**: `src/shared/types.ts` の `TodoResponse` に `tags: TagResponse[]` を追加。`src/shared/schemas.ts` の `createTodoSchema`/`updateTodoSchema` に `tagIds?: number[]` を追加。`src/worker/routes/todos.ts` の各エンドポイントをタグ紐付けに対応させる。`TodoListItem.tsx`（タグバッジ表示）・`TodoFormModal.tsx`（タグ入力欄）・`TodoListPage.tsx`（タグ管理モーダルの開閉）を拡張する。
- **新規追加**: `src/worker/routes/tags.ts`（タグ API）、`src/react-app/components/TagManagementModal.tsx` 等（ui.md 参照）。
- **衝突**: なし（既存 AC-1〜9・既存テストの契約値は変更しない。`TodoResponse` へのフィールド追加は後方互換）。

## 実装に効く制約

- タグ名は 1〜50 文字（REQUIREMENTS.md に文字数上限の明記なし。TODO タイトルとの一貫性を考慮しつつ、タグという性質上短めの上限を設定）。
- タグ名の重複チェックは DB の `UNIQUE` 制約に委ね、制約違反（SQLite の constraint エラー）を捕捉して `409` に変換する（事前 SELECT による重複チェックは競合状態のリスクがあるため採用しない）。
- `todo_tags` の `ON DELETE CASCADE` により、タグ削除時の関連付け解除は DB 側で自動的に行われる（アプリケーションコード側で明示的な削除処理は不要）。
- TODO 一覧・単体取得のレスポンスでタグを含める際、N+1 クエリを避ける（TODO 群を取得後、該当する `todo_tags`/`tags` を一括 JOIN または `IN` 句でまとめて取得しアプリケーション側でグルーピングする）。

## 判断根拠 / 未決事項

- **タグの作成・付与は TODO 作成/編集モーダル内、リネーム・削除は専用「タグ管理」モーダルで行う**: REQUIREMENTS.md にタグ管理 UI の具体的な記載がなかったため確認。TODO 単位でのタグ選択・新規作成と、タグ自体の管理（他 TODO への影響を伴うリネーム・削除）を UI 上で分離する。（Gate 1 で人間確認済み）
- **TODO 一覧では複数タグを全件バッジ表示（省略なし）**: REQUIREMENTS.md のワイヤーフレームは1タグの例のみだったため確認。（Gate 1 で人間確認済み）
- **タグ付与は `POST/PATCH /api/todos` のボディに `tagIds` を含める形で統合し、専用のタグ付け API は設けない**: TODO 作成とタグ付与を1回の API 呼び出しで完結させ、UI 実装をシンプルにするため。却下案: `PUT /api/todos/:id/tags` のような専用エンドポイント。理由: 本ユニットの規模でエンドポイントを分ける効果が薄い（YAGNI）。
- **タグ名重複は 409 Conflict、存在しないタグ ID の指定は 400 Bad Request**: REST の慣習（重複＝競合、無効な参照＝不正リクエスト）に従う。（trivial な判断）
- **未決事項**: なし。
