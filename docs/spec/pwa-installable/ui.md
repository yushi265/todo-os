# pwa-installable: ui 詳細設計

> [index.md](./index.md) の実装spec。対象はブラウザ側のHTMLメタデータ、Manifest、Service Worker登録、静的アセット。

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: `index.html`がWeb App Manifest、テーマカラー、iOS/モバイル向けアプリメタ情報、アプリアイコンを参照し、ブラウザがPWAメタデータを取得できる。
- **AC-2**: `manifest.webmanifest`が`todo-os`のアプリ名、`/`の`start_url`と`scope`、`standalone`表示、テーマ/背景色、192pxと512pxのPNGアイコンを定義する。
- **AC-3**: 本番ビルド成果物にManifest・Service Worker・PWA用アイコンが含まれ、本番環境だけが`/sw.js`を登録する。開発環境ではService Workerを登録しない。
- **AC-4**: Service Workerが静的なアプリシェルをインストール時にキャッシュし、同一オリジンのGET静的アセットを実行時にキャッシュする。ナビゲーションはネットワーク優先、オフライン時はキャッシュ済み`/index.html`へフォールバックし、`/api/`とGET以外のリクエストはキャッシュしない。
- **AC-5**: Service Workerの登録・キャッシュに失敗しても、ユーザー向けの新しいエラー画面や壊れたTODOデータを表示せず、既存のオンライン時UI/APIエラー処理を維持する。

## このレイヤーが公開する契約（外部インターフェース）

| 操作 | 名前 / パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|------|------------|-------------------|-------------------|------|
| 参照 | `/manifest.webmanifest` | UTF-8 JSON。`name`/`short_name`=`todo-os`、`start_url`/`scope`=`/`、`display`=`standalone`、192/512 PNGアイコン | 既存のCloudflare Access経路に従う | PWAのインストール情報 |
| 参照 | `/sw.js` | Service Worker JavaScript。scopeは登録URLの`/` | 既存のCloudflare Access経路に従う | 静的アセットのキャッシュ |
| 登録 | `registerServiceWorker(isProduction: boolean)` | `isProduction=true`かつ`navigator.serviceWorker`対応時だけ`/sw.js`を登録。登録失敗はrejectさせない | ブラウザAPI | 本番起動時のService Worker登録 |

## 実装配置

- `index.html` — Manifest、theme-color、iOS/モバイルメタ情報、apple-touch-iconの参照
- `public/manifest.webmanifest` — PWAのアプリ名、表示モード、起動URL、アイコン契約
- `public/sw.js` — app shellのprecache、静的GETのruntime cache、ナビゲーションfallback
- `public/pwa-192.png` / `public/pwa-512.png` — `public/favicon.svg`から生成するPWAアイコン
- `src/react-app/registerServiceWorker.ts` — 本番環境・ブラウザ対応時の登録関数
- `src/react-app/main.tsx` — Reactアプリ起動時の登録関数呼び出し
- `src/react-app/indexHtml.test.ts` — HTMLメタデータ契約
- `src/react-app/pwa.test.ts` — Manifest、Service Worker、登録関数の契約

## UI/UX 方針

- **画面フロー / 導線**: 通常のブラウザ起動とインストール済みアプリ起動のどちらも既存のTODO一覧を初期画面にする。アプリ内にインストールボタンやPWA専用画面は追加しない。
- **主要操作とフィードバック**: インストール後もTODOの作成・編集・削除・並び替え・テーマ変更の操作は既存のまま。Service Workerの登録成否をトーストやダイアログで知らせない。
- **状態設計（出し分け）**: 初期・ローディング・空・APIエラー・成功の状態は既存コンポーネントのまま。オフラインでAPIが失敗した場合も既存のTanStack Queryエラー表示を使い、Service Workerがデータを代替表示しない。
- **既存デザインシステムとの整合**: 画面要素・テーマトークン・既存faviconは変更しない。Manifestの`theme_color`は既存のデフォルトテーマのprimary `#52525b`、`background_color`はsurface `#f4f4f5`に合わせる。

### レスポンシブ / アクセシビリティ

- **対象端末**: PC、タブレット、スマートフォンの全画面幅。PWA化によるレイアウト変更は行わない。
- **主対象ブレークポイント**: 既存の`sm`（640px）以下/以上のレスポンシブ実装をそのまま維持する。PWA専用のブレークポイントは追加しない。
- **タブレット方針**: 既存のタブレット表示を維持し、インストール済み表示でも同じUIを使う。
- **スマホ方針**: スタンドアロン表示でも既存のモバイルヘッダー・ボトムシート・FABを維持する。
- **a11y最低限**: Manifestのアプリ名とアイコンをOSへ提供する。画面内の操作は既存のラベル、フォーカスリング、44px以上のタッチ領域を変更しない。Service Workerの状態を画面内のライブリージョンで通知しない。

## 異常系挙動

| シナリオ | 本レイヤーの挙動（エラーコード・レスポンス／表示・ログ） |
|---|---|
| Service Worker API非対応 | `registerServiceWorker`は何もせず戻り、Reactアプリは通常起動する。 |
| 開発環境 | `isProduction=false`なら登録を呼び出さない。開発中のキャッシュ汚染を防ぐ。 |
| `/sw.js`登録失敗 | 登録Promiseのrejectを処理してアプリ起動を継続する。画面内のエラー表示・ログ出力は追加しない。 |
| install時のprecache失敗 | Service Workerはactivateされず、現在のページ表示や既存Workerを壊さない。APIデータはキャッシュしない。 |
| オフラインでナビゲーション | キャッシュ済み`/index.html`を返す。APIクエリは既存の失敗状態になる。 |
| オフラインでAPIリクエスト | `/api/`配下はService Workerが介入せず、既存の`ApiError`/TanStack Query処理へ委ねる。 |

## テストケース（技法注記付き）

- [代表値] `index.html`がManifest、theme-color、apple-mobile-web-app-capable、apple-mobile-web-app-title、apple-touch-iconを参照する。
- [代表値] Manifestの`name`/`short_name`、`start_url`、`scope`、`display`、色、192/512 PNGアイコンが契約値と一致する。
- [代表値] 本番ビルド後に`manifest.webmanifest`、`sw.js`、`pwa-192.png`、`pwa-512.png`が成果物に存在する。
- [デシジョンテーブル] 本番=true × Service Worker対応=true → `/sw.js`登録、本番=false × 対応=true → 未登録、本番=true × 対応=false → 未登録。
- [代表値] Service Worker登録Promiseがrejectしても呼び出し元のPromiseがrejectせず、アプリ起動を妨げない。
- [代表値] Service Workerソースがapp shellのprecache、旧cache削除、`/index.html` fallback、静的GETのruntime cacheを定義する。
- [デシジョンテーブル] 同一origin × GET × `/api/`以外 → cache対象、同一origin × GET × `/api/` → cache対象外、同一origin × POST → cache対象外、外部origin × GET → cache対象外。
- [状態遷移] shell cache v1が有る状態でv2がactivateされると、v1が削除されv2が残る。
