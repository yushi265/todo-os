# due-date-indicators 進行状態（progress）

## Stage 宣言（Gate 1）

> リスクティア: Tier 2（Tier 1のAPI・DB・認証・データ境界を変更しないUI機能追加）。Gate 2は、ユーザーの「自律的に行い、途中で止まらない」という明示指示により委任して進行する。

| Stage | 区分 | 実行/スキップ | 理由 |
|---|---|---|---|
| 0+1 Stage 宣言＋要件整理 | 必須 | 実行 | 期限閾値と表示方針を確定 |
| 2 spec 作成 | 条件付き | 実行 | 既存期限表示の拡張であり、近日の観測可能な契約を明文化する必要がある |
| 3+4 TDD | 必須 | 実行 | コード挙動を変更するため |
| 5 静的解析・フォーマッター | 必須 | 実行 | 常時 |
| 6 セルフレビュー | 必須 | 実行 | 常時 |
| 8 成果提示＋コミットゲート | 必須 | 実行 | 常時 |

## ゲート承認状態

- [x] Gate 1 要件＋Stage 宣言（自律実装指示により進行）
- [x] Gate 2 spec（要点提示済み・自律実装指示により進行）
- [x] codekb 差分追記（既存共有契約の変更なし。N/A）
- [ ] Gate 3 コミット対象承認

## 現在位置

- 現Stage: 6 セルフレビュー
- 次の一手: Gate 3（コミット対象承認）で成果を提示する

## 実装タスク計画

- [x] T1 [ui] AC-1,AC-2,AC-3,AC-4,AC-5 依存:なし — 期限状態判定の単体テストと実装
- [x] T2 [ui] AC-1,AC-2,AC-3,AC-4 依存:T1 — TodoListItemのラベル・マーカー表示とテスト

## worklog

- 2026-08-15 T1 RED: 期限状態の境界値テストを先に追加 / 触った: `src/react-app/lib/dueDateStatus.test.ts` / next: 判定実装
- 2026-08-15 T1 GREEN: Asia/Tokyo基準の期限状態判定を実装 / 触った: `src/react-app/lib/dueDateStatus.ts`, `src/react-app/lib/isOverdue.ts` / next: 表示実装
- 2026-08-15 T2 REFACTOR: TodoListItemへ状態ラベルとマーカーを追加、38テスト通過 / 触った: `src/react-app/components/TodoListItem.tsx`, `src/react-app/components/TodoListItem.test.tsx` / next: クイック追加へ進む
- 2026-08-15 T2 done: 全テスト327件、型チェック、Lint、Prettier、ビルド通過。API/DB変更なしをセルフレビューで確認 / 触った: 期限表示関連一式 / next: Gate 3
- 2026-08-15 T2 REFACTOR: 可視状態ラベルを⚠️/📅/⏰の絵文字へ変更し、aria-labelで意味を補完 / 触った: `src/react-app/components/TodoListItem.tsx`, `src/react-app/components/TodoListItem.test.tsx` / next: Gate 3

## リンク

- 契約: [index.md](./index.md)
- レイヤー: [ui.md](./ui.md)
