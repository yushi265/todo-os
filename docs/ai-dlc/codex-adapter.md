# AI-DLC Codex 実行アダプタ

この文書は、AI-DLC の正本である [`ai-dlc-flow`](../../.claude/skills/ai-dlc-flow/SKILL.md) と
横断ルール（[`../../.claude/rules/`](../../.claude/rules/)）を Codex で実行するためのホスト差分を定義する。
Stage / Tier / Gate / spec / TDD の意味を再定義しない。Claude Code の `.claude/settings.json`、
`.claude/agents/`、`.claude/hooks/` を Codex が自動読込することは前提にしない。

## 適用範囲

- AI-DLC の正本は `.claude/skills/` と `.claude/rules/` のまま維持する。
- Codex はルートの `AGENTS.md` と本書を入口にする。
- 人間ゲート（Gate 1 / Gate 2 / Gate 3）は省略しない。Codex は承認を自分で済ませない。
- engine と Git hooks は補助・品質ゲートとして使うが、Claude Code のイベント hooks が発火することは仮定しない。
- Codex のサブエージェントを使えない場合も、役割・証跡・独立レビューを省略しない。メインループが代替実行し、別コンテキストで検証する。

## 開始前

1. ルートの `AGENTS.md`、`docs/index.md`、`docs/architecture.md`、`docs/ai-dlc/glossary.md` を読む。
2. 対象タスクに応じて `.claude/rules/` の risk-tiers / spec-driven / simplicity / testing / task-and-pr を読む。
3. 既存の作業ツリーを汚さない必要がある場合は、専用 worktree を作成してから進める。
4. engine を使う場合、依存導入が必要なら人間に明示してから実行する。

```bash
pnpm -C .claude/aidlc install --ignore-workspace
pnpm -C .claude/aidlc run doctor -- --fast
```

`doctor` は pnpm の組み込みコマンド名と衝突するため、必ず `run doctor --` 形式で呼ぶ。
環境制約で engine 自体を実行できない場合は、結果を GREEN と扱わず `未実測（環境制約）` と記録する。

## Stage と担当

| Stage | Codexでの担当 | 完了条件 |
|---|---|---|
| 0+1 | メインループ | 要件、Tier、Stage宣言、未決事項、Gate 1承認を確定 |
| 2 | メインループ。調査のみCodex workerへ委譲可 | 既存実装調査、レイヤー間契約、spec、テストケース一覧を確定。Gate 2承認または明示委任 |
| 3+4 | レイヤー別Codex worker | specのテストケースを起点にRED → GREEN → REFACTOR。担当範囲外を変更しない |
| 5 | メインループ | workerの自己申告ではなく、検証コマンドを独立再実行 |
| 6 | Codex worker 3体を並列起動 | code / spec-conformance / test-quality の各観点を独立レビューし、メインループが裏取り・裁定 |
| 8 | メインループ + 人間 | ACと証跡、未確認範囲、Gate 3、コミット対象を提示。承認前にcommitしない |

Stage 2 の既存実装調査は、`docs/ai-dlc/codekb/` を仮説として読み、参照パスの実在を確認する。
契約の確定はメインループが行い、workerの提案をそのまま契約にしない。

## Codex worker の役割マッピング

`.claude/agents/*.md` は役割仕様として参照できるが、Codexのspawn機構へ自動登録されるとは限らない。
起動時に、対象のagent定義パスと次の共通契約をプロンプトへ明示する。

### 共通委譲契約

```text
あなたの役割は <role>。
必読: AGENTS.md / docs/spec/<TICKET>-*/ の該当ファイル / .claude/rules/*.md / <role定義>
担当範囲: <レイヤーまたはレビュー観点>
書込範囲: <許可するファイルまたは読み取り専用>
spec外の設計判断、不明点の推測、担当外ファイルの変更は禁止。
完了時は変更ファイル、実行コマンド、結果、未確認範囲、次の一手を返す。
```

役割ごとの追加契約は次のとおり。

- `implementer`: `.claude/agents/implementer.md`。`## RED 証跡`、`## GREEN 証跡`、`## 変更ファイル一覧`、`## 申し送り`を必須見出しにする。REDを確認できない環境では、未実測と理由を明記する。
- `code-reviewer`: `.claude/agents/code-reviewer.md`。読み取り専用。設計準拠と既存実装整合だけを判定する。
- `spec-conformance-reviewer`: `.claude/agents/spec-conformance-reviewer.md`。読み取り専用。AC、スコープ、契約値だけを判定する。
- `test-quality-reviewer`: `.claude/agents/test-quality-reviewer.md`。読み取り専用。テストケース、境界値、逃げ道、削減説明を判定する。
- `impl-auditor`: `.claude/agents/impl-auditor.md`。読み取り専用。実装全体の4軸監査を行う。

モデル指定は、利用可能性を確認しないまま行わない。通常はCodexの親モデルを継承し、worker間の品質差はモデル名ではなく、役割・入力・出力契約で管理する。
複数workerを並列起動する場合も、同じファイルを編集するworkerを同時に起動しない。

## Claude hooks のCodex代替

| Claude Codeの仕組み | Codexでの扱い |
|---|---|
| `SessionStart` bootstrap | 初回のみ `pnpm -C .claude/aidlc install --ignore-workspace` を明示実行。依存導入は人間確認を取る |
| `PostToolUse(Edit\|Write)` formatter | Stage 5で `pnpm exec prettier --check .` を独立実行。必要なら対象ファイルだけ `pnpm exec prettier --write <files>` |
| `PostToolUse` sensor | 高リスク変更・spec・codekb・learningsを編集した後、必要なファイルに `pnpm -C .claude/aidlc run sensor -- <file>` を手動実行 |
| spec編集時のengine nudge | Stage 0でstateを明示初期化し、Stage/Gate完了ごとに `report` を手動実行 |
| `PreToolUse(Task\|Agent)` context guard | Claudeのtranscript形式は前提にしない。`progress.md` のworklogを委譲前に確定する。Codex transcriptを検証できる場合のみ `contextguard` を使う |
| `Stop` stop guard | 意図的な中断は `report <state> park`、再開は `unpark`。ターン終了時の自動検査は期待しない |

engine stateを使う場合の例:

```bash
pnpm -C .claude/aidlc run report -- state/<TICKET>.md init scope=feature
pnpm -C .claude/aidlc run report -- state/<TICKET>.md stage-done 0+1
pnpm -C .claude/aidlc run report -- state/<TICKET>.md gate-approve gate1
```

stateはadvisoryであり、Gate承認の代替ではない。

## Stage 5 の権威検証

workerの「green」という報告だけでは完了にしない。Codex側では次を独立に実行する。

```bash
pnpm typecheck
pnpm test:ui
pnpm exec eslint .
pnpm exec prettier --check .
pnpm -C .claude/aidlc run referee-check -- --layer all
```

`referee-check` の `pre-commit` は staged 差分だけを対象にするため、unstaged変更がある状態ではlint等を検査しないことがある。
そのため、上記のリポジトリ全体コマンドを省略しない。Gate 3でコミット対象が承認された後は、対象をstageしてpre-commitも実行する。

Cloudflare Workers runtimeを起動する `pnpm test:service` がCodexサンドボックスで `EPERM` になる場合がある。
その場合は失敗をGREENに読み替えず、`未実測（Codex環境制約）`としてprogress.mdへ記録し、メイン環境またはCIで同じコマンドを再実行する。service結果が確認できるまでGate 3を完了扱いにしない。

## 返答検査とレビュー

Codex workerの返答をファイルまたはstdinに収束できる場合は、次で形式検査する。

```bash
printf '%s' '<worker返答>' | pnpm -C .claude/aidlc run checkreturn -- implementer-v1
```

形式検査は内容の正しさを保証しない。メインループは必ず、返答をdiff・実行結果・spec・正本ルールと突き合わせる。
レビューの「問題なし」も抜き取り確認し、Mustが残る間は修正 → ゲート再実行 → 再レビューを繰り返す。

## Gate 3 の最低提示項目

- ACごとの達成状況とテスト証跡
- 実行できた検証コマンドと、未実測コマンド・理由
- Codex workerの変更ファイル一覧と担当範囲外変更の有無
- 3体レビューの指摘、メインループの裏取り・棄却・未確認範囲
- `progress.md` / `questions.md` の除去状況
- コミット対象ファイル一覧
- 人間の明示承認

## Codex適用の完了条件

Codex対応済みと判定するには、少なくともUI単層タスクとserviceを含むタスクで、次を確認する。

1. Codexの新規セッションが `AGENTS.md` から本書へ到達できる。
2. Stage宣言、Gate、spec、progress、TDD証跡がClaude Codeと同じ意味で残る。
3. worker役割を明示プロンプトで再現できる。
4. Claude hooksが無くても、Stage 5・Stage 6・Gate 3の必須証跡が欠落しない。
5. serviceテストをCodex環境外で再検証でき、未実測をGREENと誤認しない。
6. Codex経路にClaude固有のMCP名・hook入力・モデル名を必須条件として残さない。
