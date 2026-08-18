# AGENTS.md

このファイルはこのプロジェクト向けの Codex 等（Claude Code 以外の AI）の入口です。

## プロジェクト概要

todo-osは、React SPAとHono APIを単一のCloudflare Workerとして動かす個人用TODO管理アプリです。データはDrizzle ORM経由でCloudflare D1へ保存し、UIとAPIの共有契約は`src/shared/`で管理します。

- UI: `src/react-app/`
- API: `src/worker/`
- DBスキーマ: `src/db/`
- 共有型・Zodスキーマ: `src/shared/`
- D1マイグレーション: `drizzle/`
- 人間向け入口: [`README.md`](./README.md)

基本コマンドは`pnpm dev`（ローカル開発）、`pnpm test`（全テスト）、`pnpm typecheck`（型チェック）、`pnpm lint`（lint）です。詳細はREADMEと[`docs/index.md`](./docs/index.md)を参照してください。

共通遵守事項は Claude Code 向けの [`CLAUDE.md`](./CLAUDE.md) と同一です。あわせて次を参照してください。

- ハーネスの全体像・使い方: [`.claude/README.md`](./.claude/README.md)
- AI-DLC フロー（実装の進め方）: [`.claude/skills/ai-dlc-flow/SKILL.md`](./.claude/skills/ai-dlc-flow/SKILL.md)
- Codex 実行アダプタ（Claude hooks / agents の代替手順）: [`docs/ai-dlc/codex-adapter.md`](./docs/ai-dlc/codex-adapter.md)
- 横断ルール（実装着手前に必読・`.claude/rules/` が正）: [`risk-tiers`](./.claude/rules/risk-tiers.md) / [`spec-driven`](./.claude/rules/spec-driven.md) / [`simplicity`](./.claude/rules/simplicity.md) / [`testing`](./.claude/rules/testing.md) / [`task-and-pr`](./.claude/rules/task-and-pr.md) の 5 本
- 用語の正本: [`docs/ai-dlc/glossary.md`](./docs/ai-dlc/glossary.md)

> 設計規約（レイヤー境界・セキュリティ・エラー/ログ・非同期など）はプロジェクト固有。必要なら各プロジェクトが `.claude/rules/` に追加する（このハーネスは AI-DLC のフロー機構のみを同梱する）。

## 基本姿勢

- 仕様が不足・曖昧な場合は、実装前に必ず人間へ確認する。推測で埋めない。
- 変更コストが高い判断（スキーマ・API 仕様・認証フロー・ロール体系・データ境界）は、実装前に人間と合意する。
- 人間ゲート（Gate 1 / Gate 2 / Gate 3）の承認とレビューは人間が担う。
