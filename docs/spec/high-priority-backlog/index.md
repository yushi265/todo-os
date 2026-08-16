# high-priority-backlog: 高優先度バックログ実装

> `TODO.md` の高優先度項目を、既存のUI/API契約を保ったまま順番に実装するためのspec。

## 概要

既存タグ付きのクイック追加、タグ選択のコントラスト、モバイルヘッダー、一覧上部のレスポンシブな操作配置を改善する。あわせて、品質検証と手動デプロイをGitHub Actionsから再現できるようにする。

## 対象範囲

- 表示層: `src/react-app/`
- 開発運用: `.github/workflows/`、`docs/deploy.md`
- バックログ: `TODO.md` の高優先度6項目
- 対象外: APIルート、DBスキーマ、認証・認可、Cloudflare Access設定、D1マイグレーションの自動適用

## 受け入れ基準

- [x] AC-1: PRと`main`へのpushで依存導入、typecheck、全テスト、lint、format、buildが自動実行される。
- [x] AC-2: `main`から手動実行したGitHub Actionsで、必要なSecretsを使って`pnpm deploy`を実行できる。D1マイグレーションは自動適用しない。
- [x] AC-3: クイック追加フォームは画面の既存タグを選択状態として表示し、選択したタグIDをTODO作成リクエストの`tagIds`へ渡す。タグ未選択時の既存タイトル専用リクエストは維持する。
- [x] AC-4: 選択中のタグボタンは、テーマに依存せず背景と文字のコントラストが明確な選択状態で表示される。
- [x] AC-5: モバイル幅ではヘッダーのタグ管理操作を短い表示へ整理し、`aria-label`で操作名を保持する。TODO追加の主要操作を圧迫しない。
- [x] AC-6: TODO一覧ヘッダーに残り件数を表示しない。
- [x] AC-7: 一覧上部は検索をモバイルで独立した全幅行、フィルターと並び順を次の行以降に配置し、`sm`以上では既存の横並びを保つ。タグ切替とクイック追加を含む上下間隔を一貫させる。

## ユニット計画

| # | ユニット | 含むAC | 依存 |
|---|---|---|---|
| 1 | ヘッダー・一覧上部のレスポンシブ整理 | AC-5, AC-6, AC-7 | — |
| 2 | タグ選択コントラスト | AC-4 | — |
| 3 | クイック追加への既存タグ付与 | AC-3 | 2 |
| 4 | GitHub Actions CI/CD | AC-1, AC-2 | — |

## 検証方針

- UIユニット: コンポーネントテストで表示、ARIA状態、送信payload、レスポンシブ用クラスを確認する。
- 回帰: `pnpm test:ui`、`pnpm typecheck`、`pnpm exec eslint .`、`pnpm exec prettier --check .`、`pnpm build`。
- service: `pnpm test:service`を実行し、Wrangler実行環境の制約がある場合は未実測として記録する。
- Workflow: YAMLをPrettierで検証し、CIはリポジトリの既存package scriptsを呼び出す構成にする。
