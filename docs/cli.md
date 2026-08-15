# CLIからのTODO追加

`pnpm todo:add` は、Cloudflare Access が保護する既存の `POST /api/todos` を呼び出す入力経路です。Worker に管理用の裏口を追加せず、Access Service Token をHTTPヘッダーへ付けて認証境界を通過します。

## 設定

CLIを使うには、次の3つを設定します。

1. 対象WorkerをCloudflare Accessで保護する
2. そのAccess ApplicationでService Tokenを許可する
3. Client ID・Client Secret・アプリURLをCLIの実行環境へ渡す

### 1. Cloudflare Access側の設定

デプロイ直後のAccess Application作成手順は [deploy.md](./deploy.md#デプロイ後-cloudflare-access-の設定初回のみ) を参照してください。画面と`/api/*`が同じAccess Applicationで保護されていることを確認します。

次にCloudflareダッシュボードで以下を設定します。

1. **Zero Trust → Access controls → Service credentials → Service Tokens** を開く
2. **Create Service Token** を選び、用途が分かる名前（例: `todo-os-codex`）と有効期間を設定する
3. **Generate token** を押し、表示されたClient IDとClient Secretを安全な場所へコピーする
4. 対象Access Applicationの **Policies** でポリシーを追加する
5. **Action: Service Auth / Rule type: Include / Selector: Service Token** を選び、手順3のトークンを指定する
6. 保存する

Client Secretは発行時に一度だけ表示されます。紛失した場合は値を再表示できないため、新しいService Tokenを発行して設定を更新します。CLIはリクエストごとにService Tokenの2つのヘッダーを送信するため、Service Authだけで構成したApplicationでも利用できます。

### 2. CLI実行環境の設定

CLIはリポジトリ内の`.env`や`.dev.vars`を自動で読み込みません。シェル、direnv、CIのSecret管理、またはCodex / Claude Codeを起動する環境で、次の環境変数を設定してください。

```sh
export TODO_OS_URL="https://todo.example.com"
export TODO_OS_ACCESS_CLIENT_ID="<Client ID>"
export TODO_OS_ACCESS_CLIENT_SECRET="<Client Secret>"
```

確認時にSecretの値を画面へ表示しないよう、値そのものを`echo`したり、リポジトリへ保存したりしないでください。シェルを閉じると設定を破棄したい場合は、`export`を一時的なターミナルセッションで実行します。

設定値は次の対応です。

| 環境変数 | 設定内容 |
|---|---|
| `TODO_OS_URL` | Cloudflare Accessで保護したWorkerのURL。例: `https://todo.example.com` |
| `TODO_OS_ACCESS_CLIENT_ID` | Service Token発行時に表示されたClient ID |
| `TODO_OS_ACCESS_CLIENT_SECRET` | Service Token発行時に一度だけ表示されるClient Secret |

### 3. 設定確認

まずヘルプ表示でCLI自体が実行できることを確認します。

```sh
pnpm todo:add --help
```

次にテスト用TODOを1件追加します。成功すると作成されたTODOがJSONで表示されます。

```sh
pnpm todo:add --title "CLI接続確認"
```

不要なテストTODOはWeb画面から削除してください。認証情報が不足している場合、CLIは`fetch`を実行せずエラー終了します。

## 使い方

```sh
pnpm todo:add --title "Cloudflareの資料を読む"
pnpm todo:add \
  --title "リリース準備" \
  --description "本番確認項目を整理する" \
  --priority HIGH \
  --due-date 2026-08-20 \
  --tag-id 3
```

成功すると、既存APIが返した作成済みTODOをJSONで出力します。タイトル、優先度、期限、タグIDは既存のAPIスキーマで検証されます。認証情報が不足している場合、CLIは未認証リクエストを送信せず終了します。

CLIの引数・認証ヘッダー・API応答のテストは `pnpm test:cli` で確認できます。

## トークンの更新・失効

Service Tokenには発行時に設定した有効期限があります。期限を延長する場合は、Cloudflareダッシュボードの **Zero Trust → Access controls → Service credentials → Service Tokens** から対象トークンを更新し、必要なら実行環境のSecretも差し替えます。

利用を止める場合は同じ画面からトークンを削除し、CLI実行環境から3つの環境変数を削除します。Client Secretが漏えいした可能性がある場合も、対象トークンを失効させて新しいトークンを発行してください。

## 関連ドキュメント

- [Cloudflareへのデプロイ手順](./deploy.md)
- [認証済みCLIの実装仕様](./spec/access-authenticated-cli/index.md)
