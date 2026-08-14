# tag-management: ui 詳細設計

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: タグ名（1〜50文字必須・一意）を指定してタグを作成できる。既存タグと重複する名前では作成できずエラーになる
- **AC-2**: 既存タグの名前を変更（リネーム）できる。変更後の名前が自分以外の既存タグと重複する場合はエラーになり変更されない
- **AC-3**: タグを削除できる。削除には確認ダイアログを伴う。削除するとそのタグを持つ全 TODO から関連付けが解除されるが、TODO 本体・他のタグは削除されない
- **AC-4**: TODO 作成時に、既存タグの選択・新規タグ名の入力により複数タグを同時に付与できる
- **AC-5**: TODO 編集時に、付与するタグの追加・削除（タグ付けの変更）ができる
- **AC-6**: TODO 一覧の各行に、その TODO に付与された全タグがバッジ形式で並べて表示される（件数制限なし）
- **AC-7**: 存在しないタグ ID を TODO 作成・更新のリクエストに含めた場合はエラーになり、TODO は作成・更新されない
  （本レイヤーはエラー表示を担当。バリデーション自体は service.md）
- **AC-8**: タグ管理モーダルで全タグの一覧が表示され、各タグに編集（リネーム）・削除の操作がある

## このレイヤーが公開する契約（外部インターフェース）

画面パスはルーティングなし（todo-crud-basic と同じ単一ページ `/` の上に重ねるモーダル）。

| 操作 | 名前 / パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|------|------------|-----------------|-------------------|------|
| 追加 | タグ管理モーダル | 表示: 全タグ一覧・各行に編集/削除・新規作成フォーム | Cloudflare Access | AC-8 |

コンポーネント構成（`src/react-app/` 配下。todo-crud-basic の既存構成に追加・拡張）:

```
components/
  TagManagementModal.tsx（新規）   … タグ一覧・インライン編集・削除・新規作成
  TagBadge.tsx（新規）             … 個別タグの表示用バッジ（クリック不可・表示専用）
  TagMultiSelect.tsx（新規）       … TODO作成/編集モーダル内のタグ選択+新規作成コンポーネント
  TodoListItem.tsx（既存・拡張）   … タグバッジ一覧の表示を追加（AC-6）
  TodoFormModal.tsx（既存・拡張）  … TagMultiSelect を組み込み（AC-4, AC-5）
  TodoListPage.tsx（既存・拡張）   … 「タグ管理」ボタン + TagManagementModal の開閉状態を追加
  DeleteConfirmDialog.tsx（既存・汎用化）
                                    … props を `{ title, message, onConfirm, onClose }` に一般化し、
                                      TODO 削除（todo-crud-basic）とタグ削除の両方から呼べるようにする
hooks/
  useTags.ts（新規）                … TanStack Query（GET /api/tags）+ create/update/delete mutation
```

## このレイヤーが依存する下位の契約（呼び出す相手）

- 呼び出す相手: [service.md](./service.md) の `GET/POST /api/tags`・`PATCH/DELETE /api/tags/:id`、および拡張された `POST/PATCH /api/todos`（`tagIds` 付き）
- 受け渡し: `fetch()` + TanStack Query。認証は Cloudflare Access が Cookie で自動付与（todo-crud-basic と同様）。

## UI/UX 方針

- **画面フロー / 導線**:
  - タグ管理: ヘッダーの「タグ管理」ボタン → `TagManagementModal`。各タグ行の編集操作でインライン編集（クリックでテキスト入力に切り替え、Enter/フォーカスアウトで確定）。削除操作は確認ダイアログ（`DeleteConfirmDialog`）を経由。
  - タグ付与: `TodoFormModal` 内に `TagMultiSelect` を組み込み、既存タグをバッジクリックで選択/解除。新規タグ名を入力して追加すると即座に `POST /api/tags` を呼び、成功したタグを選択状態に加える。
- **主要操作とフィードバック**:
  - タグ作成・リネーム成功 → 一覧に即反映（`useTags` のキャッシュ invalidate）
  - タグ削除成功 → 一覧から消える。当該タグを表示していた TODO 一覧の表示も自動更新（`todos` クエリも invalidate）
  - バリデーションエラー（空/51文字以上）・重複エラー（409）→ 該当箇所にエラーメッセージ表示
- **状態設計（出し分け）**:
  - タグ管理モーダルの初期/ローディング: タグ取得中はスピナー表示
  - タグ0件: 「タグはまだありません」+ 新規作成導線
  - `TagMultiSelect` のタグ0件時も同様
- **既存デザインシステムとの整合**: todo-crud-basic で確立した Tailwind CSS のパターン（モーダル・ボタン・バッジ的要素）を踏襲する。新規に別のスタイル基盤を導入しない。

### レスポンシブ / アクセシビリティ（表示層は必須・空通過不可）

- **対象端末**: PC / タブレット / スマートフォン（todo-crud-basic と同方針）
- **主対象ブレークポイント**: Tailwind CSS 既定値（`sm`/`md`/`lg`）。`TagManagementModal` は `TodoFormModal` と同様のモーダルレイアウト規約に従う。
- **タブレット崩れ許容度**: 基本レイアウトの破綻がない範囲まで対応（todo-crud-basic と同方針）。
- **スマホ方針**: タグバッジ・削除ボタン等のタップ領域は 44px 相当を確保。`TagMultiSelect` のバッジ群はスマホ幅で折り返し表示。
- **a11y 最低限**: `TagManagementModal`/`DeleteConfirmDialog`（汎用化後）は `role="dialog"` + `aria-modal="true"` + 開いた時にフォーカスを先頭要素へ移動。タグ削除ボタンに `aria-label`（例: `「開発」を削除`）。`TagMultiSelect` の選択バッジは `aria-pressed` で選択状態を示す。

## 異常系挙動

| シナリオ | 本レイヤーの挙動（表示・ログ） |
|---|---|
| タグ一覧取得失敗 | `TagManagementModal`/`TagMultiSelect` にエラーメッセージ表示 + 再試行 |
| タグ作成・リネームのバリデーションエラー（空/51文字以上・`400`） | 該当入力欄の直下にエラーメッセージ表示 |
| タグ名重複（`409`） | 「同じ名前のタグが既に存在します」を該当入力欄の直下に表示 |
| タグ PATCH/DELETE 対象が存在しない（`404`） | トースト通知 + タグ一覧を再取得 |
| TODO 作成・更新時の `tagIds` エラー（`400`） | `TodoFormModal` のタグ選択欄にエラーメッセージ表示（クライアント側では発生しない防御的分岐。タグ削除と TODO 編集が同時に行われた場合の競合等） |
| サーバー内部エラー（`500`） | 汎用エラーメッセージ表示 |

## テストケース（技法注記付き）

- [代表値] `TagManagementModal`: タグ一覧が表示される
- [代表値] `TagManagementModal`: 新規タグ名を入力して追加 → create mutation が呼ばれる
- [境界値] `TagManagementModal`: 新規タグ名が空文字 → バリデーションエラー表示、mutation は呼ばれない
- [代表値] `TagManagementModal`: インライン編集でタグ名を変更 → update mutation が呼ばれる
- [代表値] `TagManagementModal`: 削除ボタン → 確認ダイアログ表示 → 確認で delete mutation が呼ばれる
- [代表値] `DeleteConfirmDialog`（汎用化後）: `title`/`message` props がそのまま表示される（TODO 削除・タグ削除どちらの呼び出しでも同じコンポーネントで正しく表示されることを確認）
- [代表値] `TagMultiSelect`: 既存タグバッジをクリックで選択状態がトグルする
- [代表値] `TagMultiSelect`: 新規タグ名を入力して追加ボタン → タグが作成され選択状態に加わる
- [代表値] `TodoFormModal`: `TagMultiSelect` で選択したタグが送信時に `tagIds` として渡る
- [代表値] `TodoFormModal`: 編集モードで開くと、TODO に既に付与されているタグが選択済み状態で初期表示される
- [代表値] `TodoListItem`: 付与されたタグがバッジで表示される（複数タグでも全件表示）
- [境界値] `TodoListItem`: タグが1件も無い TODO はタグバッジ領域が表示されない
