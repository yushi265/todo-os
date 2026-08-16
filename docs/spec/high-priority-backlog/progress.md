# high-priority-backlog 進行状態

## Stage宣言

**リスクティア**: Tier 2。UI変更とGitHub Actions追加であり、DB・API・認証・データ境界は変更しない。

**Gate 2委任**: あり。ユーザーの「一つずつ実装は自律的に進めて、途中で止まったりしないでください」という明示指示により、spec要点提示後も実装を継続する。

| Stage | 区分 | 実行/スキップ | 理由 |
|---|---|---|---|
| 0+1 要件整理 | 必須 | 実行 | 高優先度6項目を4ユニットへ分割 |
| 2 spec | 条件付き | 実行 | UIとworkflowの複数対象にまたがるため |
| 3+4 TDD | 必須 | 実行 | UI挙動を追加・変更するため |
| 5 静的解析 | 必須 | 実行 | 常時 |
| 6 セルフレビュー | 必須 | 実行 | 常時 |
| 8 成果提示 | 必須 | 実行 | 常時 |

## 進捗

- [x] Gate 1 要件＋Stage宣言（自律実装指示により進行）
- [x] Gate 2 spec要点提示・委任（自律実装指示により進行）
- [ ] Gate 3 コミット対象承認
- [x] U1 ヘッダー・一覧上部整理
- [x] U2 タグ選択コントラスト
- [x] U3 クイック追加タグ付与
- [x] U4 CI/CD

## worklog

- 2026-08-16 U1 RED→GREEN: ヘッダーの残り件数削除、タグ管理のモバイル短縮表示、完了トグルのモバイル短縮表示、検索・フィルター・並び順の縦配置を実装 / 触った: `TodoListPage.tsx`, `TodoFilterBar.tsx`, `CompletedToggle.tsx` とテスト / next: U2
- 2026-08-16 U2 RED→GREEN: クイック切替・フォーム内タグ選択の選択中をprimary背景・白文字へ統一 / 触った: `TagSwitcher.tsx`, `TagMultiSelect.tsx` とテスト / next: U3
- 2026-08-16 U3 RED→GREEN: 既存タグ一覧を`QuickTodoInput`へ渡し、選択タグID付きPOSTと成功時クリアを追加 / 触った: `QuickTodoInput.tsx`, `TodoListPage.tsx` とテスト / next: U4
- 2026-08-16 U4 done: PR/main pushのCIと、mainから手動実行するCloudflareデプロイworkflowを追加。D1マイグレーションは自動適用しない / 触った: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `docs/deploy.md` / next: 品質ゲート・セルフレビュー
- 2026-08-16 UI refinement: クイック追加を「追加時のタグ」、一覧切替を「一覧を絞り込む」と表示し、2つの操作目的を明示 / 触った: `QuickTodoInput.tsx`, `TagSwitcher.tsx` と各テスト / next: 完了
- 2026-08-16 UI refinement: クイック追加のタグ選択を追加ボタン直前のセレクトへ変更し、TodoOSのブランドヘッダーを削除。設定・完了表示・タグ管理は一覧上部の操作欄へ移動 / 触った: `QuickTodoInput.tsx`, `TodoListPage.tsx` と各テスト / next: 完了
- 2026-08-16 UI refinement: 設定・完了表示・タグ管理を一覧上部のメニュー画面へ集約 / 触った: `TodoMenu.tsx`, `TodoListPage.tsx` とテスト / next: 完了
- 2026-08-16 UI refinement: 一覧絞り込み用のタグ切替をクイック追加より上へ移動し、メニューを右側からスライドイン表示 / 触った: `TagSwitcher.tsx`, `TodoMenu.tsx`, `TodoListPage.tsx`, `index.css` とテスト / next: 完了
- 2026-08-16 UI refinement: メニューをアイコン化し、タグ切替と同じ上段へ配置。検索・フィルター・並び順を初期折りたたみに変更し、クイック追加との間隔を拡大 / 触った: `TodoListPage.tsx`, `TodoListPage.test.tsx`, `TodoFilterBar.test.tsx` と仕様書 / next: 完了
- 2026-08-16 UI refinement: タグ絞り込みの選択状態を`localStorage`へ保存し、再マウント後に復元。「すべて」で保存値を削除 / 触った: `TodoListPage.tsx`, `TodoListPage.test.tsx` と仕様書 / next: 完了
- 2026-08-16 UI refinement: クイック追加成功時にタイトルだけをクリアし、選択中タグを維持 / 触った: `QuickTodoInput.tsx`, `QuickTodoInput.test.tsx` と仕様書 / next: 完了
- 2026-08-16 UI refinement: 検索・フィルター表示を完了表示と同じスイッチ型に変更し、メニュー画面へ配置 / 触った: `TodoMenu.tsx`, `TodoListPage.tsx` と各テスト・仕様書 / next: 完了
- 2026-08-16 UI refinement: PC向けの通常追加ボタンを一覧上部へ復元し、詳細入力モーダルを開けるように変更 / 触った: `TodoListPage.tsx`, `TodoListPage.test.tsx` と仕様書 / next: 完了
