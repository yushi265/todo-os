# todo-os

個人用の TODO 管理 Web アプリです。TODO、タグ、期限、優先度、検索・絞り込み、手動並び替え、サブタスクをまとめて管理できます。

本番環境は Cloudflare Workers 上で稼働し、Cloudflare Access でアクセスを保護しています。

本番URL: [https://todo-os.ae265-1108.workers.dev](https://todo-os.ae265-1108.workers.dev)

## 主な機能

- TODO の作成・編集・削除・ステータス変更
- サブタスクの追加・完了切替・削除、親TODOカードへの進捗表示
- 複数タグの作成・編集・削除・付与
- キーワード検索、ステータス・優先度・期限・タグによる絞り込み
- 手動ドラッグ＆ドロップ並び替え
- 複数カラーテーマ、レスポンシブUI、キーボード操作対応
- Cloudflare Access Service Tokenを使ったCLIからのTODO追加

## 技術スタック

- UI: React、Vite、Tailwind CSS、TanStack Query
- API: Hono（Cloudflare Workers）
- DB: Drizzle ORM、Cloudflare D1（SQLite）
- 入力検証: Zod
- テスト: Vitest、Testing Library、Cloudflare Workers pool

## ローカル開発

前提として、Node.jsとpnpmをインストールしてください。

```sh
pnpm install
pnpm db:migrate:local
pnpm dev
```

開発サーバー起動後、表示されたローカルURLをブラウザで開きます。ローカルD1のデータは`.wrangler/`配下に保存されます。

## 検証コマンド

```sh
pnpm test              # 全テスト
pnpm test:ui           # UIテスト
pnpm test:service      # Worker/APIテスト
pnpm test:cli          # CLIテスト
pnpm typecheck        # TypeScript型チェック
pnpm lint              # ESLint
pnpm format:check      # Prettier確認
pnpm build             # 本番ビルド
```

## CLIからTODOを追加する

CLIはCloudflare Access Service Tokenを使って、既存の`POST /api/todos`へリクエストします。

```sh
export TODO_OS_URL="https://todo-os.ae265-1108.workers.dev"
export TODO_OS_ACCESS_CLIENT_ID="<Client ID>"
export TODO_OS_ACCESS_CLIENT_SECRET="<Client Secret>"

pnpm todo:add --title "リリース準備"
```

Client ID・Client Secretはリポジトリへ保存せず、環境変数やSecret管理機能で管理してください。詳細は[CLI利用手順](./docs/cli.md)を参照してください。

## デプロイ

Cloudflareへの初回セットアップ、Access設定、D1マイグレーション、更新デプロイの手順は[デプロイ手順](./docs/deploy.md)にまとめています。

スキーマ変更を含む更新では、先に本番D1へマイグレーションを適用します。

```sh
pnpm db:migrate:remote
pnpm deploy
```

## プロジェクト構成

```text
src/react-app/  React SPA（画面・入力・サーバー状態管理）
src/worker/     Hono API（ルーティング・ドメインロジック）
src/db/         Drizzleスキーマ
src/shared/     UIとAPIで共有する型・Zodスキーマ
drizzle/        D1マイグレーション
docs/           要件・アーキテクチャ・実装仕様・運用手順
```

詳細な要件は[REQUIREMENTS.md](./REQUIREMENTS.md)、開発タスクは[TODO.md](./TODO.md)、ドキュメント一覧は[docs/index.md](./docs/index.md)を参照してください。

## AI開発者向け

AIエージェントが作業する場合は、まず[AGENTS.md](./AGENTS.md)または[CLAUDE.md](./CLAUDE.md)を読み、関連する`.claude/rules/`と`docs/`を確認してください。
