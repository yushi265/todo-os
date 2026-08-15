# Cloudflareへのデプロイ手順

このアプリは React SPA（`ui`）+ Hono API（`service`）を単一の Cloudflare Worker として `@cloudflare/vite-plugin` でビルド・デプロイする一体型構成（詳細は [architecture.md](./architecture.md)）。データは Cloudflare D1、認証は Cloudflare Access（ダッシュボード側の設定のみ・アプリコードは関与しない。[REQUIREMENTS.md](../REQUIREMENTS.md) 3.2章）。

## 前提条件

- Cloudflareアカウント（無料プランで運用可能な規模。個人用TODOアプリ想定）
- pnpm（`pnpm install`済みであること）
- Wrangler CLI は `devDependencies` に含まれるため、追加インストール不要（`npx wrangler` で使う）

## 初回セットアップ（最初の1回だけ）

### 1. Cloudflareにログイン

```sh
npx wrangler login
```

ブラウザが開くのでCloudflareアカウントで認証する。

### 2. 本番用D1データベースを作成

```sh
npx wrangler d1 create todo-os-db
```

実行結果に `database_id`（UUID）が表示されるのでコピーしておく。

### 3. `wrangler.jsonc` の `database_id` を差し替える

`wrangler.jsonc` の `d1_databases[0].database_id` は現在プレースホルダー（`"local-placeholder-replace-on-deploy"`）が入っている。手順2で取得したUUIDに書き換える。

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "todo-os-db",
    "database_id": "<手順2で取得したUUID>",
    "migrations_dir": "drizzle",
  },
],
```

### 4. リモートD1にマイグレーションを適用

```sh
pnpm db:migrate:remote
```

（`wrangler d1 migrations apply todo-os-db --remote` を実行する。`drizzle/` 配下の未適用マイグレーションが本番D1に反映される）

## デプロイ

### 5. ビルド＆デプロイ

```sh
pnpm deploy
```

（`vite build && wrangler deploy` を実行する。ビルド成果物 `dist/client/`（静的アセット）と `dist/todo_os/`（Worker本体）がまとめてアップロードされる）

成功すると `https://todo-os.<アカウント名>.workers.dev` のようなURLが発行される。

## オプション: 独自ドメイン（AWSで管理中のサブドメイン）を使う

ルートドメイン全体をCloudflareに移管する必要はない。**サブドメインだけをCloudflareのゾーンとして切り出し、AWS側（Route 53等）からはそのサブドメインのNSレコードだけをCloudflareに委任する**方式が最小の変更で済む（例: ルートドメイン `example.com` はAWSで管理を継続しつつ、`todo.example.com` だけをCloudflareに委任する）。

### 6. Cloudflareでサブドメインを新しいサイト（ゾーン）として追加

1. Cloudflareダッシュボード → **Websites** → **Add a site**
2. ドメイン名の入力欄に、使いたいサブドメイン全体を入力（例: `todo.example.com`。ルートドメインではなくサブドメインをそのまま1つのゾーンとして追加する）
3. プランは無料（Free）でよい
4. 既存DNSレコードのスキャン画面が出るが、新規サブドメインのため通常は空でよい（スキップ可）
5. 案内画面で提示される2つのCloudflareネームサーバー（例: `xxx.ns.cloudflare.com` / `yyy.ns.cloudflare.com`）をメモする

### 7. AWS側（Route 53等）でNSレコードを追加

1. ルートドメイン（例: `example.com`）のホストゾーンを開く
2. 新しいレコードを作成:
   - レコード名: サブドメイン部分のみ（例: `todo`）
   - レコードタイプ: `NS`
   - 値: 手順6でメモした2つのCloudflareネームサーバー
3. 保存する

（Route 53以外のDNSサービスでAWSのドメインを管理している場合も、「該当サブドメインのNSレコードをCloudflareのネームサーバーに向ける」という考え方は同じ）

### 8. Cloudflare側でゾーンがアクティブになるのを待つ

NS委任が反映されると、Cloudflareダッシュボードの当該サイトのステータスが「Pending Nameserver Update」から「Active」に変わる（数分〜数時間、DNS浸透次第）。アクティブ化するとCloudflareからメール通知が届く。

### 9. Workerにカスタムドメインを紐付ける

ダッシュボードで設定する方法と、`wrangler.jsonc` にコードとして残す方法のどちらでもよい（後者は再デプロイ時に自動で紐付けられるため推奨）。

**方法A: ダッシュボードで設定**

1. Cloudflareダッシュボード → **Workers & Pages** → 対象Worker（`todo-os`）→ **Settings** → **Domains & Routes**
2. 「+ Add」→「Custom Domain」を選択し、サブドメイン（例: `todo.example.com`）を入力

**方法B: `wrangler.jsonc` に記述**

```jsonc
"routes": [
  { "pattern": "todo.example.com", "custom_domain": true },
],
```

`pnpm deploy` を実行すると、このカスタムドメインの紐付けとSSL証明書（Universal SSL）の発行が自動で行われる。

## デプロイ後: Cloudflare Access の設定（初回のみ）

アプリ側は独自の認証機構を持たないため、公開直後は誰でもアクセスできる状態になる。デプロイ直後に必ず設定すること（[REQUIREMENTS.md](../REQUIREMENTS.md) 19.1〜19.2章）。

1. Cloudflareダッシュボード → **Zero Trust** → **Access** → **Applications**
2. 「Add an application」→「Self-hosted」を選択
3. 対象ドメインに、実際に公開しているURL（独自ドメインを設定した場合はそのサブドメイン、していなければ手順5で発行された `*.workers.dev` のURL）を設定
4. 認証方法に **One-time PIN**（メール認証）を選択
5. アクセスを許可するメールアドレスをポリシーに追加
6. `/api/*` パスもこのApplicationの保護対象に含める（画面とAPIを別Applicationにする場合は両方に設定すること）

## 2回目以降の更新デプロイ

**スキーマ変更が無い場合**:

```sh
pnpm deploy
```

**Drizzleスキーマ（`src/db/schema.ts`）を変更した場合**:

```sh
pnpm db:generate       # マイグレーションファイルを生成（drizzle/ 配下）
pnpm db:migrate:remote # 本番D1に適用
pnpm deploy             # デプロイ
```

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| `wrangler deploy` が認証エラーになる | `npx wrangler login` を再実行 |
| マイグレーションが反映されているか不安 | `npx wrangler d1 migrations list todo-os-db --remote` で適用状況を確認 |
| デプロイ前にビルドが通るか確認したい | `pnpm typecheck` / `pnpm build` をローカルで先に実行 |
| Cloudflare Access設定後にログインできない | 許可メールアドレスのポリシーと、`/api/*` の保護設定を確認 |
| サブドメインのゾーンがいつまでも「Pending Nameserver Update」のまま | AWS側のNSレコードの値（ネームサーバー名）にタイポが無いか確認。DNS浸透に数時間かかることもある |
| カスタムドメインでアクセスすると証明書エラーになる | Universal SSLの発行に数分かかることがある。ゾーンがActiveになった直後は少し待ってから再試行 |

## 参考

- [architecture.md](./architecture.md) — 全体構成・レイヤー責務
- [REQUIREMENTS.md](../REQUIREMENTS.md) 2.1章（技術スタック）・3.2章（認証）・19章（セキュリティ）
