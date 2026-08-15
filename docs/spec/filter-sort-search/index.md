# filter-sort-search: TODOのフィルター・ソート・検索

> 薄い実装 spec の入口。読み手は人間（Gate 1/2/3 承認者）。AI 実装エージェント（Codex）は [service.md](./service.md) / [ui.md](./ui.md) を読む。

## 概要

REQUIREMENTS.md 11-13章に基づき、TODO一覧をステータス・優先度・タグ・期限で絞り込み、5種類のキーでソートし、タイトル・説明のキーワード検索を行えるようにする。`GET /api/todos` にクエリパラメータを追加し、UIにフィルター/ソート/検索の操作UIを追加する。

## 対象範囲

- 対象レイヤー: service（[service.md](./service.md)）+ ui（[ui.md](./ui.md)）
- 対象ドメイン: TODO一覧の絞り込み・並び替え・検索
- 対象外（やらないこと）:
  - 手動並び替え（ドラッグ&ドロップ・`PATCH /api/todos/reorder`）は Unit5（manual-reorder）のスコープ
  - タグフィルターの複数選択（AND/OR）は対象外。単一タグ選択のみ（REQUIREMENTS.mdに複数選択の要求なし。デザイン〔`TodoOS v2.dc.html`〕とも一致）
  - フィルター条件の保存（URLパラメータ化・localStorage永続化等）は対象外。画面リロードでリセットされる

## ユニット計画

単一ユニット（本 spec で完結）。

## 受け入れ基準（AC）

- [ ] **AC-1**: `GET /api/todos` は `status`（`TODO`/`IN_PROGRESS`/`DONE`/`CANCELED`）・`priority`（`HIGH`/`MEDIUM`/`LOW`）・`tagId`（数値）・`due`（`TODAY`/`OVERDUE`/`NONE`）のクエリパラメータを受け付け、指定された条件をすべて満たす（AND）TODOのみを返す。パラメータ省略時はその条件を適用しない。
- [ ] **AC-2**: `due=TODAY`/`due=OVERDUE` の判定は Asia/Tokyo 基準の「本日」で行う。`due=OVERDUE` は未完了（`TODO`/`IN_PROGRESS`）かつ期限が本日より前の TODO のみ対象（`DONE`/`CANCELED`は対象外）。`due=NONE` は `dueDate` が `null` の TODO のみ。
- [ ] **AC-3**: `GET /api/todos` は `q` クエリパラメータを受け付け、タイトルまたは説明に部分一致するTODOのみを返す（大文字小文字を区別しない）。
- [ ] **AC-4**: `GET /api/todos` は `sortBy`（`manual`/`dueDate`/`priority`/`createdAt`/`updatedAt`。省略時 `manual`）と `sortOrder`（`asc`/`desc`。省略時 `asc`）を受け付ける。`sortBy=manual` の場合は `sortOrder` を無視し、常に `sortOrder` カラムの昇順で返す。`priority` ソートは優先度ランク（`HIGH`=3, `MEDIUM`=2, `LOW`=1, 未設定=0）を数値として`asc`/`desc`する。すなわち `asc`指定時は 未設定 → `LOW` → `MEDIUM` → `HIGH` の順、`desc`指定時は `HIGH` → `MEDIUM` → `LOW` → 未設定の順（Claude Designの`compareTodos`ロジックに準拠）。`dueDate` ソートは未設定（`null`）を常に末尾に置く（昇順・降順いずれでも）。
- [ ] **AC-5**: フィルター・検索・ソートのどの組み合わせを指定しても、TODOの `sortOrder` カラムの値自体は変更されない（表示順の計算のみに影響する）。
- [ ] **AC-6**: UI一覧画面に検索ボックスが表示され、入力するとタイトル・説明で絞り込まれた一覧が表示される。
- [ ] **AC-7**: UI一覧画面にフィルター操作UI（ステータス・優先度・タグ・期限の4属性、チップ形式）が表示され、選択中の条件がチップとして表示・削除できる。同時に選択できる属性は最大4つ（各属性1条件まで）。
- [ ] **AC-8**: UI一覧画面にソート選択UI（5種類）が表示される。`manual`以外を選択すると昇順・降順切り替えボタンが表示され、`manual`選択時は非表示になる。

## アーキテクチャ / レイヤー間フロー

```
ui: 検索/フィルター/ソートの状態変更
  → GET /api/todos?status=...&priority=...&tagId=...&due=...&q=...&sortBy=...&sortOrder=...
  → service: クエリパラメータをZodで検証 → Drizzleのwhere/orderByへ変換 → D1へクエリ
  → レスポンス: 絞り込み・ソート済み TodoResponse[]（既存と同一の型。sortOrderフィールドの値自体は不変）
```

## エラー・ログ方針（横断サマリ）

| シナリオ | service の挙動 | ui の挙動 |
|---|---|---|
| クエリパラメータが不正な値（例: `status=INVALID`） | `400`（`Validation failed`、既存の`ErrorResponse`形式） | 通常起こり得ない（UIが不正な値を送らない設計のため）。念のため既存の一覧取得エラー分岐（`isError`→再試行ボタン）に合流させる |
| `tagId` が存在しないタグID | `200`（該当0件として返す。タグ削除直後の一時的な不整合を許容し、404にはしない） | 0件表示（既存の空状態パターン） |

## テスト戦略

| AC | 単体 | レイヤー内結合 |
|----|------|--------------|
| AC-1, AC-2, AC-3 | フィルター条件→SQL条件への変換ロジック（独立関数化する場合） | 対象（クエリパラメータ→絞り込み結果） |
| AC-4 | ソートキー→SQL順序への変換ロジック（優先度マッピング・NULL処理） | 対象（クエリパラメータ→並び順） |
| AC-5 | — | 対象（フィルター/ソート適用後も`sortOrder`カラムの値がAPI呼び出し前後で不変） |
| AC-6, AC-7, AC-8 | コンポーネント表示（チップ生成・トグル表示） | 対象（操作→APIクエリパラメータ→一覧反映） |

ケース詳細は [service.md](./service.md) / [ui.md](./ui.md) の「テストケース」節を参照。

## 既存実装との関係（再利用 / 差分 / 衝突）

- **再利用**: `TodoResponse`/`attachTags`/`findTodoById`等の既存部品はそのまま。`useTodos()`フックはクエリパラメータを受け取れるよう拡張するが、返り値の型・キャッシュ機構（TanStack Query）は変更しない。UIの配色トークン・チップ/メニューのレイアウトパターンはUnit3で確立したもの（`ui-visual-refresh`）を再利用する。
- **差分**: `GET /api/todos` のクエリパラメータ対応（新規）。`TODOS_QUERY_KEY`はクエリパラメータを含めた形（例: `["todos", params]`）に変更が必要（TanStack Queryのキャッシュ分離のため）。
- **衝突**: 無し。DBスキーマ変更は不要（既存カラムのみで絞り込み・ソートが可能）。

## 実装に効く制約

- 期限のtoday/overdue判定は既存UI側の`lib/isOverdue.ts`と同じAsia/Tokyo基準だが、service側（Workers runtime）とui側（ブラウザ）は別バンドルのため、ロジックはservice側に独立して実装する（コード重複は許容。共有モジュール化はYAGNI）。
- Drizzle ORMでのCASE式・NULL処理は`sql`テンプレートリテラルで実装する（`service.md`に具体式を明記）。
- タグフィルターは単一選択（`tagId`は単一の数値のみ受け付ける）。

## 判断根拠 / 未決事項

- **優先度フィルターの実装**: REQUIREMENTS.md 11章に明記されているためスコープに含める（デザインには無いが、要件定義書が正）。人間に確認済み（2026-08-15）。
- **タグフィルターの単一選択**: REQUIREMENTS.mdに複数選択の要求が無く、デザインも単一選択のため、複雑さを追加しない（YAGNI・Rule of Three）。
- **期限ロジックの重複実装**: service/ui間で共有モジュール化するより、実行環境の分離を優先し重複を許容する（trivialな判断）。
- **フィルター条件の非永続化**: REQUIREMENTS.mdに永続化の要求が無い（10章の完了トグルのみlocalStorage永続化が明記されている）。フィルター条件は都度リセットされる設計とする。
- **実装委譲**: Stage3+4のTDD実装はCodex（gpt-5.6-luna max）に委譲する（人間からの指示）。spec確定・受領検査・静的解析の権威再実行・セルフレビュー監査は引き続きメインループが行う。
