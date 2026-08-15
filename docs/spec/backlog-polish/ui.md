# backlog-polish: 表示層詳細設計

## 実装配置

- favicon: `public/favicon.svg`, `index.html`
- Button適用: `src/react-app/components/**/*.tsx`
- ステータス表示: `src/react-app/lib/statusStyles.ts`, `TodoListItem.tsx`, `CompletedTodoListItem.tsx`
- 取り消しトースト: `TodoFormModal.tsx`, `TodoListPage.tsx`

## 表示契約

| status | label | icon | icon class |
|---|---|---|---|
| `TODO` | 未着手 | `○` | `status-todo` |
| `IN_PROGRESS` | 進行中 | `→` | `status-inprogress` |
| `DONE` | 完了 | `✓` | `status-done` |
| `CANCELED` | 中止 | `×` | `status-canceled` |

一覧カードではステータス文字を表示せず、未完了行の左側アイコンをクリックして次のステータスへ進める。完了済み行のアイコンは表示専用とし、既存の取り消し線表示を維持する。

## 取り消し契約

編集成功時は編集前の `TodoResponse` を、ステータス進行成功時は進行前の `TodoResponse` を取り消し用入力へ変換する。取り消し入力は全編集可能フィールドとタグIDを含むため、タイトルだけでなく同時に変更された値も一括で復元する。

トーストは同時に1件だけ保持し、新しい変更が発生した場合は最新の取り消し操作へ置き換える。取り消し成功後は再度取り消しボタンを表示せず、「元に戻しました」の通知だけを表示する。404は既存の対象不存在処理、その他の失敗は既存の汎用エラー通知に従う。

## テスト観点

- favicon link の参照先とSVGの存在
- 全ボタンの `data-slot="button"`、および特殊属性の引き継ぎ
- 4ステータスのアイコン・配色、未完了アイコンの進行イベント、一覧カードにステータス文字が表示されないこと
- 編集成功後のトースト、ステータス変更成功後のトースト、取り消しPATCHの全フィールド、取り消し成功通知
- 既存のUI回帰テスト
