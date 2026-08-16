# high-priority-backlog: CI/CD詳細設計

## CI

`.github/workflows/ci.yml`をPRおよび`main`へのpushで実行する。Node.js 24、pnpm 11.18.0、`pnpm-lock.yaml`固定インストールを使い、次の順で品質を確認する。

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:cli`
5. `pnpm exec eslint .`
6. `pnpm exec prettier --check .`
7. `pnpm build`

## CD

`.github/workflows/deploy.yml`を`main`の`workflow_dispatch`で実行する。production Environmentに登録した次のSecretsをWranglerへ渡す。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

デプロイは`pnpm deploy`だけを実行し、D1マイグレーションは含めない。スキーマ変更時のマイグレーション適用は既存の手順に従い、明示的に別実行する。

## セキュリティ・運用制約

- Secretsをworkflowファイルやログへ出力しない。
- CI/CDの権限は`contents: read`に限定する。
- 本番デプロイは自動pushではなく手動実行とし、GitHub Environmentの保護ルールを利用できるようにする。
