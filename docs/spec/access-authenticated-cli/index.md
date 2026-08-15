# access-authenticated-cli: 認証済みCLIからのTODO追加

## 目的

CodexやClaude CodeからTODOを追加できる入力経路を用意する。ただしWorkerに認証を迂回する裏口は作らず、既存のCloudflare Access境界と`POST /api/todos`を利用する。

## 受け入れ基準

- [x] `pnpm todo:add --title "..."`で既存の`POST /api/todos`へTODOを追加できる。
- [x] `TODO_OS_URL`、`TODO_OS_ACCESS_CLIENT_ID`、`TODO_OS_ACCESS_CLIENT_SECRET`を使い、Access Service Tokenのヘッダーを付ける。
- [x] 認証情報が不足している場合はリクエストを送信せず終了する。
- [x] タイトル・優先度・期限・タグIDをCLI側でも検証し、APIの応答またはエラーをJSON/標準エラーへ返す。
- [x] 引数、認証ヘッダー、認証情報不足、API応答を`pnpm test:cli`で検証できる。

## 契約

CLIの詳細な設定・利用例は [docs/cli.md](../../cli.md) を正本とする。認証ヘッダーはCloudflare Access Service Tokenの仕様に合わせ、`CF-Access-Client-Id`と`CF-Access-Client-Secret`を使用する。

## 対象外

- Worker APIの認証ミドルウェア変更
- Client Secretの保存、発行、ローテーションの自動化
- 未認証の管理用エンドポイント追加
