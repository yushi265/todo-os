# manual-reorder: TODOの手動並び替え（PC版ドラッグ&ドロップ）

> 薄い実装 spec の入口。読み手は人間（Gate 1/2/3 承認者）。AI 実装エージェント（Codex）は [service.md](./service.md) / [ui.md](./ui.md) を読む。

## 概要

REQUIREMENTS.md 6章・17章・18章に基づき、TODO一覧をPC上でドラッグ&ドロップにより手動で並び替えられるようにする。新規`PATCH /api/todos/reorder`APIと、`sortBy=manual`時のみ有効なドラッグ&ドロップUIを実装する。

## 対象範囲

- 対象レイヤー: service（[service.md](./service.md)）+ ui（[ui.md](./ui.md)）
- 対象ドメイン: TODO一覧の並び順（`sortOrder`カラム）の手動更新
- 対象外（やらないこと）:
  - モバイルの「長押し後のドラッグ」対応（HTML5 Drag and Drop APIはタッチデバイスで動作しないため、Unit6〔mobile-responsive-polish〕のモバイル専用パターンとまとめて実装する）
  - 完了・キャンセル済みTODO（DONE/CANCELED）のドラッグ対応（Unit3で「完了済みはドラッグハンドルを表示しない」と確定済み。本ユニットでもこの方針を継続する）
  - フィルター・ソート条件自体の変更（Unit4で実装済み。本ユニットは`sortBy=manual`時の並び替え操作のみを追加する）

## ユニット計画

単一ユニット（本 spec で完結）。

## 受け入れ基準（AC）

- [ ] **AC-1**: `PATCH /api/todos/reorder`は`todoIds: number[]`（リクエストボディ）を受け付け、配列の順序どおりに各TODOの`sortOrder`を`0`からの連番で一括更新する。
- [ ] **AC-2**: `todoIds`に重複する値が含まれる場合、`400`（Validation failed相当）を返す。
- [ ] **AC-3**: `todoIds`が、更新時点でDBに存在する全TODOのID集合と過不足なく一致しない場合（不足・過剰いずれも）、`400`を返す。
- [ ] **AC-4**: TODO一覧（PC画面）で、`sortBy=manual`の時のみ、未完了TODOのドラッグハンドルからドラッグ&ドロップで並び替えができる。ドロップ確定後、並び替え結果を反映した`todoIds`で`PATCH /api/todos/reorder`を呼び出す。
- [ ] **AC-5**: `sortBy`が`manual`以外の場合、ドラッグハンドルは非活性表示になり、ドラッグ操作は行えない。
- [ ] **AC-6**: フィルター（ステータス・優先度・タグ・期限）や検索が適用され一覧が絞り込まれている状態で並び替えた場合、フィルター対象外のTODO（非表示中のもの）の相対順序を維持したまま、フィルター対象のTODOのみ新しい順序で全体の`todoIds`を再構成してAPIへ送信する（REQUIREMENTS.md 6.3節・17章）。
- [ ] **AC-7**: 並び替えAPIが失敗した場合、一覧は元の順序のまま変化せず、エラー通知が表示される。

## アーキテクチャ / レイヤー間フロー

```
ui: ドラッグ&ドロップでTODOの表示順を変更
  → 現在表示中（フィルタ後）のTODO ID配列（新順序）と、フィルタ前の全TODO一覧（現在のsortOrder順）から
    全体のtodoIds配列を再構成（AC-6のマージロジック、ui.md参照）
  → PATCH /api/todos/reorder { todoIds: number[] }
  → service: バリデーション（重複チェック・全体集合一致チェック）→ sortOrderを一括更新
  → 成功: 204 No Content → ui側はキャッシュをinvalidateして再取得
```

## エラー・ログ方針（横断サマリ）

| シナリオ | service の挙動 | ui の挙動 |
|---|---|---|
| `todoIds`が配列でない・要素が正の整数でない | `400`（Validation failed） | 通常起こり得ない（UIが不正な値を送らない設計）。念のため汎用エラートースト |
| `todoIds`に重複あり | `400`（`error: "todoIds contains duplicate values"`） | 汎用エラートースト、一覧は元の順序のまま |
| `todoIds`が全TODO集合と不一致 | `400`（`error: "todoIds must match the full set of existing todo ids"`） | 汎用エラートースト、一覧は元の順序のまま |
| その他エラー（500等） | 既存の`app.onError`に準拠 | 汎用エラートースト |

## テスト戦略

| AC | 単体 | レイヤー内結合 |
|----|------|--------------|
| AC-1, AC-2, AC-3 | — | 対象（`PATCH /api/todos/reorder`への入出力） |
| AC-4, AC-5 | — | 対象（ドラッグ操作→API呼び出し確認、`sortBy`による活性/非活性） |
| AC-6 | 対象（フィルタ対象外を維持したマージロジックの独立関数） | 対象（実際のドラッグ操作でのマージ結果確認） |
| AC-7 | — | 対象（APIエラー時の一覧不変・トースト表示） |

ケース詳細は [service.md](./service.md) / [ui.md](./ui.md) の「テストケース」節を参照。

## 既存実装との関係（再利用 / 差分 / 衝突）

- **再利用**: 既存の`todosRoute`（`src/worker/routes/todos.ts`）に新規ハンドラを追加。`TODOS_QUERY_KEY`のinvalidateパターン（`useDeleteTodo`等と同じ）をそのまま使う。UIのカード型レイアウト・配色トークンはUnit3のものを踏襲。
- **差分**: `TodoListItem`にドラッグハンドル（Unit3で意図的に省略していた要素）を追加。`TodoList`にドラッグイベントハンドラを追加。
- **衝突・重要な実装上の注意**: Honoのルーティングは登録順で評価されるため、**`todosRoute.patch("/reorder", ...)`は既存の`todosRoute.patch("/:id", ...)`より前に登録しないと、`/reorder`へのリクエストが`:id="reorder"`として`/:id`ハンドラに誤ってマッチする**（`Number("reorder")`は`NaN`になり、既存の`findTodoById`が0件扱いで404を返す不具合になる）。

## 実装に効く制約

- `sortOrder`の一括更新は、可能な範囲で一括更新またはトランザクション相当の処理を利用する（REQUIREMENTS.md 17章）。D1 + Drizzle ORMでは`db.batch([...])`（複数のSQL文をバッチ実行、部分失敗を防ぐ）の利用を検討する（具体式は[service.md](./service.md)参照）。
- ドラッグ&ドロップはHTML5 Drag and Drop API（`draggable`/`onDragStart`/`onDragOver`/`onDrop`/`onDragEnd`）を使う。新規ライブラリは追加しない（YAGNI）。
- レスポンスは`204 No Content`（既存の`DELETE /api/todos/:id`と同じパターン）。ui側は成功後にクエリキャッシュをinvalidateして再取得する。

## 判断根拠 / 未決事項

- **モバイル対応の切り出し**: HTML5 D&D APIがタッチデバイス非対応のため、モバイルの長押しドラッグはUnit6（レスポンシブ仕上げ）に送る。人間に確認済み（2026-08-15）。
- **レスポンス形式**: 一覧全体を返さず`204`にする。理由: 複数件更新の結果を都度シリアライズするコストを避け、既存の削除APIパターンと一貫させる。ui側は既存のinvalidate+再取得パターンで十分。
- **フィルタ対象外の順序維持ロジック**: REQUIREMENTS.md 6.3節の例（A,B,C,Dのうちタグ「仕事」でA,Cのみ表示、並び替え後も全体順序でB,Dの相対位置を維持）に基づき、「全体リスト内でフィルタ対象の出現位置はそのまま、そこに入るIDだけを新順序から順番に埋める」というマージアルゴリズムを採用する（詳細は[ui.md](./ui.md)）。
- **実装委譲**: Stage3+4のTDD実装はCodexに委譲する。Unit4の教訓（サンドボックスがWorkers runtimeテストを実行できない）を踏まえ、メインループが必ず`referee-check`で権威検証する前提で進める。
