# TODO一覧アクセシビリティ検証

TODO一覧のWCAG 2.1 AAに関する実装仕様は [todo-list-wcag-aa](./spec/todo-list-wcag-aa/index.md) にあります。

## 再検証コマンド

```sh
pnpm exec vitest run --project ui src/react-app/index.css.test.ts
pnpm exec vitest run --project ui src/react-app/components/TodoList.test.tsx src/react-app/components/TodoListPage.test.tsx
pnpm typecheck
pnpm lint
```

`index.css.test.ts`は全テーマの通常文字コントラスト、状態・優先度・タグ・チップ、フォーカスアウトラインを測定します。UIテストはスキップリンク、mainランドマーク、操作名称、エラー/ステータス通知、キーボード並び替えを検証します。
