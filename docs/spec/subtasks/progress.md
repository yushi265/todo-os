# subtasks 進行状態（progress）

## Stage 宣言（Gate 1 で承認）

リスクティア: Tier 1（DBスキーマ・API契約・複数レイヤーUIに触れるため）。Stage 2 は必須、TDD・静的解析・セルフレビュー・成果提示を実行する。

| Stage | 区分 | 実行/スキップ | 理由 |
|---|---|---|---|
| 0+1 Stage 宣言＋要件整理 | 必須 | 実行 | ユーザー確認済み |
| 2 spec 作成 | 条件付き | 実行 | 複数レイヤー・スキーマ/API変更 |
| 3+4 TDD | 必須 | 実行 | コード挙動を追加 |
| 5 静的解析・フォーマッター | 必須 | 実行 | 常時 |
| 6 セルフレビュー | 必須 | 実行 | 常時 |
| 8 成果提示＋コミットゲート | 必須 | 実行 | 常時 |

## ゲート承認状態

- [x] Gate 1 要件＋Stage 宣言 承認（2026-08-16）
- [x] Gate 2 spec 承認（2026-08-16、ユーザー確認により契約確定）
- [x] codekb 差分追記済み
- [ ] Gate 3 コミット対象 承認

## 現在位置

- 現 Stage: 6 セルフレビュー完了
- 次の一手: Gate 3 の成果提示（コミットはユーザー承認後）

## 実装タスク計画（順序付き）

- [x] T1 [service] AC-1,AC-2,AC-4,AC-5,AC-6,AC-7 依存:なし — 共有契約・subtasksテーブル・マイグレーション
- [x] T2 [service] AC-1,AC-2,AC-3,AC-4,AC-5,AC-6,AC-7 依存:T1 — ネストしたサブタスクAPIと結合テスト
- [x] T3 [ui] AC-1,AC-2,AC-3,AC-4,AC-5,AC-6,AC-7 依存:T2 — Query hooks・編集UI・一覧進捗とUIテスト
- [x] T4 [service] AC-7 依存:T1,T2 — lint・型・全テスト・ビルドの権威検証
- [x] T5 [ui] AC-1,AC-2,AC-3,AC-4,AC-5,AC-6,AC-7 依存:T3,T4 — 差分セルフレビューと関連文書整合確認

## worklog

- 2026-08-16 T1 RED: 実装前の現行テスト・型チェック・lint・ビルドを確認 / 触った: なし / next: 契約テストを追加
- 2026-08-16 T2 GREEN: serviceのサブタスクAPIとD1カスケードを実装し、service 169テスト通過 / 触った: src/db,src/shared,src/worker,drizzle / next: UI配線
- 2026-08-16 T3 REFACTOR: 編集モーダル・一覧進捗・Query hooksを実装し、UI 287テスト通過 / 触った: src/react-app / next: 全体品質ゲート
- 2026-08-16 T4 done: 全テスト456・typecheck・lint・format・build通過 / 触った: 全変更 / next: 成果提示

## リンク

- 契約: [index.md](./index.md)
- service: [service.md](./service.md)
- ui: [ui.md](./ui.md)
