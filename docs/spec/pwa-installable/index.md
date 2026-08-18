# pwa-installable: インストール可能PWA対応

## 概要

todo-osをスマートフォン・PCのホーム画面やアプリランチャーから起動できる、インストール可能なPWAにする。既存のTODO操作はオンライン前提のまま、アプリシェルと静的アセットだけをService Workerで扱う。

## 対象範囲

- 対象レイヤー: ui（[ui.md](./ui.md)）
- 対象ドメイン: ブラウザのインストールメタデータ、静的アセット配信、Service Worker
- 対象外:
  - TODO・タグ・サブタスクのオフライン閲覧、作成、編集、削除、同期
  - APIレスポンス、D1データ、認証情報のキャッシュ
  - Push通知、期限通知、通知権限の導入
  - アプリ内のカスタムインストールバナーやインストール導線UI
  - `wrangler.jsonc`、Honoルート、DBスキーマ、認証・認可の変更

## ユニット計画

単一ユニット（本specで完結）。

## 受け入れ基準（AC）

- [ ] **AC-1**: `index.html`がWeb App Manifest、テーマカラー、iOS/モバイル向けアプリメタ情報、アプリアイコンを参照し、ブラウザがPWAメタデータを取得できる。
- [ ] **AC-2**: `manifest.webmanifest`が`todo-os`のアプリ名、`/`の`start_url`と`scope`、`standalone`表示、テーマ/背景色、192pxと512pxのPNGアイコンを定義する。
- [ ] **AC-3**: 本番ビルド成果物にManifest・Service Worker・PWA用アイコンが含まれ、本番環境だけが`/sw.js`を登録する。開発環境ではService Workerを登録しない。
- [ ] **AC-4**: Service Workerが静的なアプリシェルをインストール時にキャッシュし、同一オリジンのGET静的アセットを実行時にキャッシュする。ナビゲーションはネットワーク優先、オフライン時はキャッシュ済み`/index.html`へフォールバックし、`/api/`とGET以外のリクエストはキャッシュしない。
- [ ] **AC-5**: Service Workerの登録・キャッシュに失敗しても、ユーザー向けの新しいエラー画面や壊れたTODOデータを表示せず、既存のオンライン時UI/APIエラー処理を維持する。

## アーキテクチャ / レイヤー間フロー

```text
ブラウザ
  ├─ index.html
  │    ├─ manifest.webmanifest / pwa-192.png / pwa-512.png を参照
  │    └─ 本番ビルドの main.tsx → navigator.serviceWorker.register("/sw.js")
  └─ sw.js
       ├─ install: /、/index.html、Manifest、アイコン等をshell cacheへ保存
       ├─ activate: 旧バージョンのshell cacheを削除
       └─ fetch: 静的GETのみcache-first、画面遷移はnetwork-first
                    /api/* と非GETは介入しない
```

Service Workerは`/api/`を除外するため、TODOデータの取得・更新は従来どおり`fetch("/api/...")`とTanStack Queryの既存エラー処理に委ねる。

## エラー・ログ方針（横断サマリ）

| シナリオ | Service Worker | 表示層の挙動 |
|---|---|---|
| Service Worker非対応または開発環境 | 登録しない | 既存UIをそのまま表示 |
| Service Worker登録失敗 | Promiseを握りつぶし、アプリ本体の起動を妨げない | 新規通知は表示しない |
| 静的アセットの取得失敗（オンライン） | 通常のブラウザエラーとして返す | 既存のブラウザ/API挙動を維持 |
| オフラインのナビゲーション | `/index.html`のshell cacheを返す | SPAを表示し、API由来の既存エラー状態を維持 |
| オフラインのAPI GET/非GET | Service Workerは介入しない | 既存のTanStack Queryエラー処理に委ねる |

## テスト戦略

| AC | 単体 | レイヤー内結合 |
|----|------|--------------|
| AC-1 | `index.html`のメタデータ・リンク検査 | — |
| AC-2 | Manifest JSONの契約検査 | — |
| AC-3 | 登録関数の本番/開発・非対応分岐、ビルド成果物 | — |
| AC-4 | Service Workerソースの契約検査 | ブラウザ実機またはPreviewでの手動確認 |
| AC-5 | 登録失敗時の起動継続、API除外契約 | — |

## 既存実装との関係（再利用 / 差分 / 衝突）

- 再利用: `public/favicon.svg`をPWA用アイコンの元データとして使い、既存の`index.html`のfavicon参照とtodo-osの配色を維持する。既存の`src/react-app/main.tsx`を起動入口としてService Worker登録を追加する。
- 差分: `index.html`にManifest/モバイルメタ情報を追加し、`public/manifest.webmanifest`、`public/sw.js`、192/512pxのPNGアイコンを追加する。UIコンポーネント、API、TanStack Queryの契約は変更しない。
- 衝突・依存: `wrangler.jsonc`のSPAフォールバックにより`/index.html`が静的アセットとして取得できることに依存する。`public/`配下のファイルは既存Vite設定でビルド成果物へコピーされるため、Viteプラグイン追加は不要。

## 実装に効く制約

- Service Workerは本番環境でのみ登録し、開発サーバーのService Workerがブラウザに残る問題を避ける。
- Service Workerのキャッシュ名は`todo-os-shell-v1`を初期値とし、仕様変更時はバージョンを更新して旧キャッシュをactivate時に削除する。
- `/api`および`/api/`配下は、パスの後続部分にかかわらずService Workerのキャッシュ対象外とする。
- APIレスポンスをキャッシュしないため、オフライン時に古いTODOデータを成功表示しない。
- Manifestのアイコンは既存faviconと同じ意匠から生成し、アプリ内デザインを変更しない。
- 新規依存パッケージは追加しない。

## 判断根拠 / 未決事項

- 手書きService Workerを採用する。今回の対象は静的アセットと画面フォールバックに限定されており、WorkboxやPWA用Viteプラグインを追加するより、キャッシュ対象とAPI除外を明示でき、依存とビルド設定を増やさずに済む。
- ManifestとService Workerを`public/`に配置する。既存のVite/Cloudflare Assetsのコピー経路を再利用でき、`wrangler.jsonc`を変更せずにルート配信できる。
- 静的アセットはcache-first、ナビゲーションはnetwork-firstを採用する。ハッシュ付きJS/CSSは一度取得した後のオフライン起動を優先し、HTMLは更新を取り込みやすくする。
- 192/512px PNGは既存faviconから生成する。Chromium系のインストール条件とOSごとのアイコン選択に対応し、SVG faviconだけに依存しない。
- 未決事項はない。オフラインデータ操作とPush通知を対象外としてGate 1で確定済み。
