# due-date-indicators: ui 詳細設計

## 担保 AC（[index.md](./index.md) の AC からの引用）

- **AC-1**: 未完了TODOの期限がAsia/Tokyo基準で本日より前の場合、期限日と期限切れを表す絵文字マーカーが危険色付きで表示される。
- **AC-2**: 未完了TODOの期限がAsia/Tokyo基準の本日の場合、期限日と本日期限を表す絵文字マーカーが表示される。
- **AC-3**: 未完了TODOの期限が本日より後かつ3日以内の場合、期限日と近日を表す絵文字マーカーが表示される。
- **AC-4**: 期限なし、期限が4日以上先、または完了済みTODO（`DONE`/`CANCELED`）には期限の緊急度マーカーを表示せず、既存の期限日表示を維持する。
- **AC-5**: 期限判定ロジックは現在時刻を引数で差し替えてテストでき、日付境界とステータス条件を再現性のあるテストで検証できる。

## 公開する契約

| 操作 | 名前 / パス | 入出力・型・制約 | 用途 |
|---|---|---|---|
| 追加 | `src/react-app/lib/dueDateStatus.ts` | `dueDateStatus(dueDate: string \| null, status: TodoStatus, now?: Date): DueDateStatus` | 期限状態をUI表示用に判定 |

```ts
type DueDateStatus = "overdue" | "today" | "soon" | null;
```

## 実装配置

- `src/react-app/lib/dueDateStatus.ts` — 期限状態判定
- `src/react-app/lib/dueDateStatus.test.ts` — 判定ロジックの単体テスト
- `src/react-app/components/TodoListItem.tsx` — 期限状態ラベル・マーカーの表示
- `src/react-app/components/TodoListItem.test.tsx` — 表示のレイヤー内テスト

## UI/UX 方針

- **画面フロー / 導線**: 既存のTODO行内の期限表示を拡張し、期限日と状態ラベルを同じ情報群として表示する。
- **主要操作とフィードバック**: 操作は発生しない。期限切れは⚠️、本日は📅、近日は⏰を使い、危険色・主色・優先度中の色も併用する。
- **状態設計（出し分け）**: 期限なしは「-」、状態なしの期限日は日付のみ、状態ありは日付に状態ラベルとマーカーを付加する。
- **既存デザインシステムとの整合**: 既存の`text-danger`、`text-primary`、`text-priority-medium`と`font-semibold`を再利用する。

### レスポンシブ / アクセシビリティ

- PC・タブレット・スマートフォンで同じ情報構造を使い、既存の`flex-wrap`を維持する。
- マーカーは`aria-hidden="true"`とし、状態ラベルをテキストで必ず併記する。
- 色だけに依存せず、状態を表す絵文字にスクリーンリーダー向けの`aria-label`を付けて判別できるようにする。

## 異常系挙動

| シナリオ | UIの挙動 |
|---|---|
| `dueDate`が`null` | 既存どおり「-」を表示する |
| `status`が`DONE`/`CANCELED` | 期限日を表示するが状態ラベル・マーカーは表示しない |

## テストケース（技法注記付き）

- [代表値] 昨日期限の未完了TODO → `overdue`
- [境界値] 本日期限 → `today`、3日後期限 → `soon`、4日後期限 → 状態なし
- [デシジョンテーブル] 期限あり×未完了×過去/本日/近日/先 → 各状態、期限あり×完了済み → 状態なし、期限なし → 状態なし
- [代表値] `TodoListItem`で期限切れ・本日・近日の絵文字マーカーを表示する
