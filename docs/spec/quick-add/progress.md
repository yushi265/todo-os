# quick-add 進行状態（progress）

## Stage 宣言（Gate 1）

> リスクティア: Tier 2（既存APIを再利用するUI機能追加で、Tier 1のAPI契約・DB・認証を変更しない）。Gate 2は、ユーザーの「自律的に行い、途中で止まらない」という明示指示により委任して進行する。

| Stage | 区分 | 実行/スキップ | 理由 |
|---|---|---|---|
| 0+1 Stage 宣言＋要件整理 | 必須 | 実行 | クイック追加の入力範囲とエラー挙動を確定 |
| 2 spec 作成 | 条件付き | 実行 | 新規UI部品と既存mutationの接続契約を明文化する必要がある |
| 3+4 TDD | 必須 | 実行 | コード挙動を変更するため |
| 5 静的解析・フォーマッター | 必須 | 実行 | 常時 |
| 6 セルフレビュー | 必須 | 実行 | 常時 |
| 8 成果提示＋コミットゲート | 必須 | 実行 | 常時 |

## ゲート承認状態

- [x] Gate 1 要件＋Stage 宣言（自律実装指示により進行）
- [x] Gate 2 spec（要点提示済み・自律実装指示により進行）
- [ ] codekb 差分追記（既存共有契約の変更なし。N/A）
- [ ] Gate 3 コミット対象承認

## 現在位置

- 現Stage: 6 セルフレビュー
- 次の一手: Gate 3（コミット対象承認）で成果を提示する

## 実装タスク計画

- [x] T1 [ui] AC-1,AC-2,AC-3,AC-4,AC-5,AC-6 依存:なし — クイック追加フォームのテストと実装
- [x] T2 [ui] AC-1,AC-3,AC-6 依存:T1 — TodoListPageへの配置と回帰テスト

## worklog

- 2026-08-15 T1 RED: クイック追加の代表値・境界値・異常系テストを先に追加 / 触った: `src/react-app/components/QuickTodoInput.test.tsx` / next: フォーム実装
- 2026-08-15 T1 GREEN: 既存create mutationと共有スキーマを使うタイトル専用フォームを実装 / 触った: `src/react-app/components/QuickTodoInput.tsx` / next: 一覧画面へ配置
- 2026-08-15 T2 REFACTOR: TodoListPageへ配置、8テスト通過 / 触った: `src/react-app/components/TodoListPage.tsx` / next: 全体品質ゲート
- 2026-08-15 T2 done: 全テスト327件、型チェック、Lint、Prettier、ビルド通過。既存create mutation再利用と入力保持をセルフレビューで確認 / 触った: クイック追加関連一式 / next: Gate 3

## リンク

- 契約: [index.md](./index.md)
- レイヤー: [ui.md](./ui.md)
