# アーキテクチャ概要

個人用 TODO 管理アプリ。React SPA（`ui`）と Hono API（`service`。Drizzle ORM + D1 によるデータ永続化を含む）を、
単一の Cloudflare Worker として `@cloudflare/vite-plugin` でビルド・デプロイする一体型構成。詳細な機能要件は
[REQUIREMENTS.md](../REQUIREMENTS.md) を参照。

## 全体像

```
利用者（ブラウザ・PC / スマートフォン）
  │
  ▼
Cloudflare Access（認証。指定メールアドレス + One-time PIN。ダッシュボード側で完結・アプリコードは関与しない）
  │
  ▼
Cloudflare Worker（単一プロセス）
  ├─ src/react-app/   ui      … React SPA（画面・入力受付）
  │       │  fetch("/api/...")
  │       │  ← src/shared/ … service/ui 共有契約（Zod スキーマ・型）を両側から import
  ├─ src/worker/       service … Hono API（ルーティング・ドメインロジック）
  └─ src/db/           service（data を統合） … Drizzle ORM スキーマ定義
          │
          ▼
      Cloudflare D1（SQLite）
```

- ビルド成果物は `dist/client/`（静的アセット・SPA）と `dist/todo_os/`（Worker 本体）の 2 系統（`@cloudflare/vite-plugin` の既定出力）。
- ローカル検証は `pnpm dev`（Vite dev server、フロント + API 一体で起動）と `wrangler d1 migrations apply --local`（ローカル D1、Cloudflare アカウント接続不要）で完結する。

## レイヤー責務

| レイヤー | 配置 | 責務 |
|--------|------|------|
| ui（表示層） | `src/react-app/` | 画面描画・入力受付・TanStack Query によるサーバー状態管理。ドメインロジックを持たない |
| service（サービス層・data 統合） | `src/worker/`（API）＋ `src/db/`（Drizzle スキーマ） | Hono ルーティング・入力検証（Zod）・ドメインロジック・D1 へのデータアクセス |

- `data` 層は独立させず `service` に統合している（Hono と Drizzle/D1 が同一 Workers プロセス・同一 `@cloudflare/vitest-pool-workers` テストで検証されるため。検証コマンドの単位は [referee.config.json](../.claude/aidlc/referee.config.json)）。
- `src/shared/`（Zod スキーマ・レスポンス型）は service と ui の両方から import される共有契約。どちらのレイヤーにも属さず、依存方向の起点にはならない（`src/shared/` 自体は他レイヤーに依存しない）。
- レイヤー別 spec は `service.md` / `ui.md` の 2 ファイル構成（[_layer.md](./spec/_TEMPLATE/_layer.md)）。

## 依存方向

```
ui（src/react-app）  →  service（src/worker, src/db）  →  D1
```

- `ui` は HTTP（`fetch("/api/...")`）経由でのみ `service` を呼ぶ。Worker のモジュールを直接 import しない。
- `service` 内部でも `src/worker/`（API）→ `src/db/`（スキーマ）の一方向。`src/db/` は Hono に依存しない。

## モジュール構造

該当なし（単一 Bounded Context。ドメイン別モジュール分割は行わない）。

## サブツリー / モジュールの入口

該当なし（単一パッケージ構成。サブツリー分割なし）。
