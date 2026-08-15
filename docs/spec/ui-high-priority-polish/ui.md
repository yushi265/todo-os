# ui-high-priority-polish: 表示層詳細設計

## 担保AC（[index.md](./index.md)のACからの引用）

- **AC-1**: TODO一覧行、TODO作成/編集モーダル、削除確認ダイアログ、タグ管理モーダル、状態変更ボタンに控えめな表示・操作モーションが適用され、`prefers-reduced-motion: reduce`ではアニメーションと遷移が抑制される。
- **AC-2**: 再利用効果を確認したうえで、主要なCTA・境界付きボタン・破壊的ボタンの一部が、プロジェクト内で所有するshadcn/ui方式のButtonコンポーネントを通じて表示される。既存のaria属性、disabled、クリック処理、44px以上のタッチ領域は維持される。
- **AC-3**: 設定画面から複数のテーマを選択でき、選択したテーマが即時反映され、ページ再読み込み後もlocalStorageから復元される。未対応値やlocalStorage障害時は既定テーマへ安全にフォールバックする。

## このレイヤーが公開する契約（外部インターフェース）

UI内部の表示契約のみ。外部APIは追加しない。

| 操作 | 名前 / パス | 入出力・型・制約 | 認証・アクセス制御 | 用途 |
|---|---|---|---|---|
| テーマ選択 | `useTheme` | `ThemeName = "default" | "ocean" | "forest" | "sunset" | "lavender" | "monochrome"` | — | DOM属性とlocalStorageを更新 |
| Button表示 | `Button` | `variant`, `size`, `className`, 標準button属性 | — | 共通ボタン表示 |

## 実装配置

- `src/react-app/index.css`: モーション、reduced-motion、テーマ別色トークン
- `src/react-app/components/ui/button.tsx`: 所有するButtonプリミティブ
- `src/react-app/hooks/useTheme.ts`: テーマ選択・復元・永続化
- `src/react-app/components/ThemeSettingsModal.tsx`: テーマ設定UI
- 既存の`TodoListPage.tsx`、`TodoList.tsx`、`TodoListItem.tsx`、`CompletedTodoListItem.tsx`、`TodoFormModal.tsx`、`DeleteConfirmDialog.tsx`、`TagManagementModal.tsx`: モーションとButtonの適用

## UI/UX方針

- **画面フロー / 導線**: ヘッダーの「設定」から設定モーダルを開き、テーマ選択後はモーダルを閉じずに画面全体へ即時反映する。
- **主要操作とフィードバック**: モーダル・行は短いフェード/スライド、ボタンは色変化と押下時の微細な縮小で反応を示す。テーマ選択は選択状態をラジオボタン相当の`aria-checked`で示す。
- **状態設計（出し分け）**: テーマ設定は既定テーマを初期値とし、保存値が有効なら復元する。未知値・保存失敗は既定テーマで継続する。
- **既存デザインシステムとの整合**: 既存の`@theme`トークンとTailwindクラスを再利用し、テーマ差分はCSS変数に限定する。

### レスポンシブ / アクセシビリティ

- 設定モーダルは既存モーダルと同じモバイル下部シート / `sm`以上中央表示を維持する。
- すべての操作ボタンは既存の`min-h-11`/`min-w-11`を維持する。
- `prefers-reduced-motion`を尊重し、モーションを抑制する。
- テーマ選択はキーボード操作可能な標準`input type="radio"`を使用する。

## 異常系挙動

| シナリオ | 本レイヤーの挙動 |
|---|---|
| localStorageの読み書き失敗 | try/catchで握りつぶさず、既定テーマまたは現在のメモリ値で表示を継続する |
| 未知のテーマ値 | `default`へフォールバックし、設定UIでは有効な選択肢だけを表示する |

## テストケース（技法注記付き）

- [代表値] 各モーダルとTODO行に所定のモーション用クラスが付き、状態変更ボタンにtransition/activeクラスがある。
- [境界値] `prefers-reduced-motion: reduce`相当のCSSルールが存在し、全アニメーションを抑制する。
- [代表値] Buttonのvariant/sizeが対応するクラスへ変換され、`disabled`と標準propsが保持される。
- [代表値] 設定モーダルで6種類のテーマを選択すると`data-theme`が更新され、localStorageへ保存される。`default`はニュートラルグレー、`ocean`は青系、`forest`は緑系、`monochrome`は高コントラストの無彩色として視覚的に区別できる。
- [境界値] 未知のlocalStorage値、読み書き例外は`default`で安全に継続する。
