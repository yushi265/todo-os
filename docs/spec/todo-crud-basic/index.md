# todo-crud-basic: TODO基本CRUD

> 薄い実装 spec の入口。読み手は人間（Gate 1/2/3 承認者）。AI 実装エージェントはレイヤー別 `.md`（`service.md` / `ui.md`）を読む。
> 本プロジェクトはチケットレスのため `<TICKET>` は機能スラッグ `todo-crud-basic` を使う。

## 概要

TODO のタイトル・説明・ステータス・優先度・期限を対象とした基本的な CRUD（作成・一覧・編集・削除）と、
終了済み（DONE/CANCELED）TODO の表示切り替えトグルを実装する。タグ・手動並び替え・フィルター/検索は対象外（後続ユニット）。

## 対象範囲

- 対象レイヤー: service（Hono API + Drizzle/D1）、ui（React）
  - [service.md](./service.md)
  - [ui.md](./ui.md)
- 対象ドメイン: TODO（`todos` テーブル）
- 対象外（やらないこと）:
  - タグ管理・TODO へのタグ付け（`tags` / `todo_tags` は対象外。テーブル自体は既存スキーマのまま未使用）
  - 手動並び替え UI（drag & drop）・`PATCH /api/todos/reorder`
  - フィルター・検索・手動以外のソート切り替え
  - レスポンシブの詳細最適化（基本対応のみ本ユニットで行う）

## ユニット計画

単一ユニット（AC-1〜AC-9 を本ユニットで完結させる）。

## 受け入れ基準（AC）

- [ ] **AC-1**: タイトル（1〜200文字必須）・説明（任意）・優先度（HIGH/MEDIUM/LOW、任意）・期限（YYYY-MM-DD、任意）を指定して TODO を作成できる。ステータスは常に `TODO` で作成され、作成リクエストで指定することはできない
- [ ] **AC-2**: 作成された TODO は、既存の `sort_order` 最大値 + 1（既存 TODO が無い場合は 0）で一覧の末尾に追加される
- [ ] **AC-3**: TODO 一覧は `sort_order` 昇順で表示され、各行にタイトル・ステータス・優先度・期限を表示する
- [ ] **AC-4**: 期限が本日（Asia/Tokyo 基準）より前で、かつステータスが `TODO` または `IN_PROGRESS`（未完了）の TODO は、一覧上で視覚的に判別できる（期限切れ表示）
- [ ] **AC-5**: 既存 TODO のタイトル・説明・ステータス・優先度・期限を編集できる。ステータスは `TODO`/`IN_PROGRESS`/`DONE`/`CANCELED` の 4 値間を遷移制約なく自由に変更できる
- [ ] **AC-6**: TODO を削除できる。削除操作には確認ダイアログを伴い、確認後に物理削除される。キャンセルした場合は削除されない
- [ ] **AC-7**: 終了済み（`DONE`/`CANCELED`）TODO は一覧でデフォルト非表示。表示トグルを ON にすると表示され、OFF にすると再度非表示になる。トグルの状態は `localStorage` に保持され、再読み込み後も維持される
- [ ] **AC-8**: タイトル未入力（0文字）、または 201 文字以上での TODO 作成・更新はエラーとなり、TODO は作成・更新されない
- [ ] **AC-9**: 存在しない TODO ID に対する取得（GET）・更新（PATCH）・削除（DELETE）はエラー（404）になる

## アーキテクチャ / レイヤー間フロー

```
ui（React, TanStack Query）
  │ fetch("/api/todos", ...)
  ▼
service（Hono API）
  │ Drizzle ORM
  ▼
D1（todos テーブル。既存スキーマ src/db/schema.ts をそのまま使用・変更なし）
```

- レイヤー間 IF（API パス・入出力の具体値）は [service.md](./service.md) が正本。
- `tags` / `todo_tags` テーブルは既存スキーマに存在するが本ユニットでは未使用（対象外）。

## エラー・ログ方針（横断サマリ）

| シナリオ | service の挙動 | ui の挙動 |
|---|---|---|
| バリデーションエラー（タイトル空/201文字以上、不正な enum 値、不正な日付形式） | 400 + `{ error, details }`（Zod issues） | フォーム内にエラーメッセージ表示、送信させない・送信済みなら再表示 |
| 存在しない ID（GET/PATCH/DELETE） | 404 + `{ error }` | 「TODO が見つかりません」等を表示 |
| サーバー内部エラー（D1 障害等） | 500 + `{ error }` | 汎用エラーメッセージ表示 + 再試行を促す |

詳細（メッセージ文言・ログ）は [service.md](./service.md) / [ui.md](./ui.md) の「異常系挙動」節。

## テスト戦略

基準は [testing.md](../../../.claude/rules/testing.md) の「テスト種別の分担」。ケース詳細は各レイヤー `.md` の「テストケース」節を参照。

| AC | 単体 | レイヤー内結合 |
|----|------|--------------|
| AC-1 | Zod スキーマ（作成） | POST /api/todos |
| AC-2 | sort_order 採番ロジック | POST /api/todos |
| AC-3 | — | GET /api/todos |
| AC-4 | 期限切れ判定関数 | ui コンポーネント表示 |
| AC-5 | Zod スキーマ（更新） | PATCH /api/todos/:id |
| AC-6 | — | DELETE /api/todos/:id・削除確認ダイアログ |
| AC-7 | localStorage 読み書きラッパー | ui トグルコンポーネント |
| AC-8 | Zod スキーマ境界値（0/1/200/201文字） | POST・PATCH のバリデーションエラー応答 |
| AC-9 | — | GET/PATCH/DELETE の 404 応答 |

## 既存実装との関係（再利用 / 差分 / 衝突）

technical skeleton セットアップ（`chore: Cloudflare Workers技術骨格をセットアップ...` コミット）で作成済みの以下を再利用する:

- **再利用**: `src/db/schema.ts` の `todos` テーブル定義（AC の要件と完全一致・変更不要）。`@cloudflare/vitest-pool-workers` のテスト基盤（`vitest.config.ts` / `test/apply-migrations.ts`）。`src/worker/index.ts` の `Hono<{ Bindings: Env }>` 骨格。
- **差分（置き換え対象）**: `src/worker/index.ts` の仮実装（`GET /api/health`・仮の `GET /api/todos`）は本ユニットの正式な CRUD 実装に置き換える。`src/react-app/App.tsx` の動作確認用コンポーネントは本ユニットの一覧+モーダル UI に置き換える。`src/worker/index.test.ts` の仮テストは正式なテストスイートに置き換える。
- **新規追加**: Tailwind CSS v4（`tailwindcss` / `@tailwindcss/vite`、npm 確認済み最新 v4.3.3）を UI レイヤーの CSS 基盤として導入する。
- **衝突**: なし。

## 実装に効く制約

- ステータス遷移に API 側のバリデーションを設けない（REQUIREMENTS.md 5章「遷移を強制するステートマシンではない」）。
- `due_date` は日付のみ（時刻を持たない）。DB 上は `text` 型で `YYYY-MM-DD` 文字列として扱う（既存スキーマ通り）。
- 「今日」「期限切れ」の判定は Asia/Tokyo 基準（REQUIREMENTS.md 11章）。
- 終了済み表示トグルの状態は D1 に保存しない（`localStorage` のみ。REQUIREMENTS.md 10.3章）。

## 判断根拠 / 未決事項

- **ステータスは作成時に受け付けない（常に `TODO` 固定）**: REQUIREMENTS.md 4.1章の入力項目表は「必須」と記載するが、新規作成時に毎回ステータスを選ばせるのは一般的な TODO アプリの UX に反するため、作成時は固定値とし作成フォームにも選択欄を出さない。変更は編集操作（AC-5）で行う。（Gate 1 で人間確認済み）
- **`GET /api/todos` はクエリパラメータなしで常に全件返す**: 終了済み表示トグルは `localStorage` 制御のクライアント側機能であり、サーバーが絞り込みロジックを持つ必要がない。個人利用規模で全件取得のコストは問題にならない。将来フィルター/検索ユニットで必要になった時点でクエリパラメータを追加する（YAGNI）。（Gate 1 で人間確認済み）
- **CSS は Tailwind CSS v4（`@tailwindcss/vite`）を採用**: REQUIREMENTS.md に指定がなかったため確認。ユーティリティクラスで実装速度を優先し、レスポンシブ対応（`sm:`/`md:` 等）も組み込みで扱える。（Gate 1 で人間確認済み）
- **未決事項**: なし。
