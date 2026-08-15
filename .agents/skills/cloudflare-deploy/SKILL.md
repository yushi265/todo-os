---
name: cloudflare-deploy
description: todo-osをCloudflare Workersにデプロイする手順スキル。初回セットアップ（wrangler login・本番D1データベース作成・マイグレーション適用）、ビルド＆デプロイ、Cloudflare Access設定、独自ドメイン（AWS等で管理中のサブドメイン）の紐付け、2回目以降の更新デプロイまでを扱う。「デプロイして」「Cloudflareにデプロイ」「本番に反映して」と言われた時に使用する。
---

# Cloudflareへのデプロイ（cloudflare-deploy）

> 人間向けの参照ドキュメントは [`docs/deploy.md`](../../../docs/deploy.md) が正本（手順の詳細・背景説明はそちら）。
> 本スキルは**AIエージェントが対話的にデプロイを実行する際の手順・判断ポイント・確認事項**を扱う。

## 前提

このアプリは React SPA（`ui`）+ Hono API（`service`）を単一の Cloudflare Worker として `@cloudflare/vite-plugin` でビルド・デプロイする一体型構成。データは Cloudflare D1、認証は Cloudflare Access（ダッシュボード側の設定のみ・アプリコードは関与しない）。

## 0. 実行前の確認事項（重要）

デプロイは実インフラへの変更・外部公開を伴う操作。以下を必ず守る:

- **`wrangler login`（ブラウザでのOAuth認証）・D1データベースの新規作成・`pnpm deploy`（実際の公開）は、ユーザーの明示的な依頼が無い限り実行しない**。「デプロイまでやって」「公開して」等の明示指示を受けてから進める。
- 初回セットアップ（手順1〜4）は不可逆ではないが、**本番D1データベースの作成は課金対象リソースの新規作成**にあたるため、実行前に一言断ってから進める。
- **Cloudflare Access の設定（許可するメールアドレスの登録）はダッシュボードでの手動操作**。認証・アクセス制御という重要なセキュリティ設定のため、AIが自動操作するのではなく、ユーザー自身に手順を案内するか、許可したいメールアドレスを確認した上で進める。

## 1. 現状確認

```sh
npx wrangler whoami                 # 認証状態
cat wrangler.jsonc | grep database_id  # database_id がプレースホルダーのままか確認
```

`database_id` が `"local-placeholder-replace-on-deploy"` のままなら初回セットアップ（手順2）から、既に実IDが入っていれば手順5（デプロイ）から始めてよい。

## 2. 初回セットアップ

```sh
npx wrangler login                              # ブラウザでCloudflare認証
npx wrangler d1 create todo-os-db               # 本番D1データベース作成（database_idが出力される）
```

出力された `database_id` で `wrangler.jsonc` の `d1_databases[0].database_id` を書き換える（`binding`/`database_name`/`migrations_dir` は変更しない）。

```sh
pnpm db:migrate:remote                          # リモートD1へマイグレーション適用
```

### 重要な罠: `database_id` 変更でローカル開発が壊れる

`wrangler dev`（ローカル開発）が参照するD1エミュレーションのストレージは `database_id` ごとに分離されている。プレースホルダーから実IDへ書き換えた直後、ローカルの`pnpm dev`で `no such table` エラーが発生する（新IDに対応する空のローカルDBを見るようになるため）。**`wrangler.jsonc` の `database_id` を変更したら、必ず以下も実行する**:

```sh
pnpm db:migrate:local                           # ローカルD1にもマイグレーションを再適用
```

ローカルの既存テストデータはこの切り替えで失われる（新規に作り直しになる旨をユーザーに伝える）。

## 3. デプロイ

```sh
pnpm typecheck && pnpm build                    # 事前にビルドが通るか確認（デプロイ前の健全性チェック）
pnpm deploy                                     # vite build && wrangler deploy
```

成功すると `https://<worker名>.<アカウント名>.workers.dev` が発行される。デプロイ後は疎通確認する:

```sh
curl -sD - <デプロイURL>/          -o /dev/null   # 200 が返るか
curl -sD - <デプロイURL>/api/todos -o /dev/null   # API側も200か
```

## 4. デプロイ後: Cloudflare Access

アプリ側は独自認証を持たないため、**デプロイ直後は誰でもアクセスできる無防備な状態**になる。ユーザーに以下を案内する（AIが自動操作しない。理由は「0. 実行前の確認事項」参照）:

1. Cloudflareダッシュボード → **Zero Trust** → **Access** → **Applications**
2. 「Add an application」→「Self-hosted」、対象URLを設定
3. 認証方式 **One-time PIN**、許可メールアドレスをポリシーに追加
4. `/api/*` パスも同じApplicationの保護対象に含める

設定完了後、疎通確認で「未認証だと302でログインページにリダイレクトされる」ことを確認できる:

```sh
curl -s -o /dev/null -w "%{http_code}\n" <デプロイURL>/
curl -s -o /dev/null -w "%{http_code}\n" <デプロイURL>/api/todos
```

## 5. オプション: 独自ドメイン（AWS等で管理中のサブドメイン）

ルートドメイン全体をCloudflareへ移管する必要はない。**サブドメインだけを新しいCloudflareゾーンとして切り出し、AWS側（Route 53等）からはそのサブドメインのNSレコードだけをCloudflareへ委任する**。詳細手順は [`docs/deploy.md`](../../../docs/deploy.md) の「オプション: 独自ドメイン」節を参照（Cloudflareでのゾーン追加 → AWS側のNSレコード追加 → ゾーンActive化待ち → `wrangler.jsonc`の`routes`に`{ pattern, custom_domain: true }`を追加してデプロイ、の順）。

## 6. 2回目以降の更新デプロイ

```sh
# スキーマ変更が無い場合
pnpm deploy

# Drizzleスキーマ（src/db/schema.ts）を変更した場合
pnpm db:generate       # マイグレーションファイル生成
pnpm db:migrate:remote # 本番D1に適用
pnpm deploy
```

## トラブルシューティング

`docs/deploy.md` の「トラブルシューティング」節（認証エラー・マイグレーション未反映・Access設定後のアクセス不可・DNS浸透待ち・証明書エラー）を参照。
