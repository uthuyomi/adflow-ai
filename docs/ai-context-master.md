ｂ# AdFlow-AI AI向けマスターコンテキスト

最終更新: 2026年6月20日

## この文書の用途

この文書は、ChatGPT、Claude、Codexなど、AdFlow-AIを初めて扱うAIが、この1ファイルだけで技術的現状と事業戦略上の文脈を把握するための自己完結した要約です。

`CLAUDE.md`を置き換えるものではありません。`CLAUDE.md`はリポジトリ内で実装作業を行う際の入口です。本書は、実装、レビュー、事業判断、優先順位付けを行う前に、プロダクト全体の前提を共有するための文書です。

---

# Part A: 技術的現状

## A-1. プロダクト概要

AdFlow-AIは、広告とランディングページを同じ改善単位として管理し、需要証拠の収集、広告・LP分析、AI改善提案、人間による承認、CodexまたはGitHub PRによる実装、X Ads公開、Outcome測定、A/B Experiment、Learningまでを追跡する広告改善ワークスペースです。単発のAI分析や文章生成で終わらず、「何を根拠に変更し、誰が承認し、どのように実装され、結果がどうだったか」を保存して次回改善へ利用する閉ループを目指しています。

主要ワークフロー:

```text
Demand Discovery
  -> Evidence / Competitor Research
  -> Ad-LP Pair Analysis
  -> Improvement
  -> Human Approval
  -> Codex Task / GitHub PR / X Ads Publish
  -> Outcome
  -> Experiment / Measurement
  -> Learning
  -> Next Improvement
```

現在の正しいポジショニングは「Ad Optimization Workspace / 広告改善ワークスペース」です。需要、売上、成功を保証する予測サービスではありません。

## A-2. 実装完了の判定基準

本書では、UIが存在するだけでは実装済みとみなしません。少なくとも次を追跡して判定しています。

- UIから処理を開始できる
- APIまたはSupabase経路へ接続される
- DBへ保存される
- 保存後に再取得できる
- ページ再読込後も状態が維持される
- 状態遷移や所有権がBackendまたはDBで保護される
- 外部処理が必要な場合、実APIを呼ぶかUnavailableとして明示される
- MOCKをREAL、SYNTHETICを実測値として表示しない
- 固定成功レスポンスやTODOコメントだけで完了扱いしない

状態の読み方:

| 状態 | 意味 |
| --- | --- |
| 完成 | UI、API、DB、再取得、主要制御が接続済み |
| 部分実装 | 主経路はあるが外部設定、運用要件、一部機能が不足 |
| 未実装 | 必要な処理経路が存在しない |

## A-3. 技術スタック

| 領域 | 技術 |
| --- | --- |
| Frontend | Next.js 15 App Router、React 19、TypeScript、Tailwind CSS |
| UI / State | TanStack Query、Zustand、React Hook Form、Recharts、shadcn/ui系コンポーネント |
| Backend | FastAPI、Pydantic、Python 3.12 |
| DB / Auth | Supabase PostgreSQL、Supabase Auth、RLS |
| Realtime | Supabase Realtime、ポーリングフォールバック |
| Billing | Stripe Checkout、Billing Portal、Webhook |
| AI | OpenAI、xAI Grok、Google Gemini、Mock Provider |
| Codex | Codex CLIによるREAL_EXECUTION、またはMANUAL_EXECUTION |
| Demand Data | Google Custom Search、Firecrawl、Reddit、X、Review検索 |
| Ad Platform | X / X Ads API |
| Development Integration | GitHub OAuth / REST API |
| Deployment | Vercel Frontend、Fly.io Backend、Supabase DB |

Production URL:

- Frontend: `https://adflow-ai-wine.vercel.app`
- Backend: `https://adflow-ai-api.fly.dev`

2026年6月20日時点で両URLはHTTP 200、Backend `/ready`もHTTP 200です。ただし、直近のFeature Gating Backend / FrontendコードはまだFly.io / Vercelへ再デプロイされていません。DB migrationは適用済みです。

## A-4. 主要ドメインと実装状況

### 認証・Project・Operations

状態: **完成**

実装済み:

- Supabase Auth
- Bearer tokenによるFastAPI認証
- 認証後画面のRoute Guard
- Project作成、編集、複製、一時停止、アーカイブ、復元、論理削除
- Global Search
- Notification Center
- Background Jobs
- Activity Timeline
- Saved Views
- Workspace Settings
- Supabase Realtimeとポーリングフォールバック

不足:

- Team / Organization / Role単位の権限管理は未実装
- 現在のデータ所有権はユーザー単位

### Demand Discovery / Demand Intelligence

状態: **主要経路は完成、外部Connectorは環境依存**

実装済み:

- Discovery Session作成、履歴、再開、検索、お気に入り、削除
- Demand Intelligence Run
- Signal、Embedding、Cluster、Validation、Solution Fit、Monitoring
- Evidence、Competitor、Demand Score、Learning ContextのDB保存と再取得
- Connector status、ログ、キャッシュ
- REAL / SYNTHETIC識別
- URLと引用元を持つREAL SignalだけをEvidenceとして扱う制御
- 外部データ0件時に実測値を捏造しない処理

外部設定が必要:

- Google Custom Search
- Firecrawl
- Reddit
- X Search

部分実装・未実装:

- Review Connectorは検索由来取得が中心で、各レビューサービスの正式専用APIではない
- Google Suggest、Related Search、PAA専用取得は未実装
- YouTubeコメント専用Connectorは未実装
- RedditはAPI審査とClient ID / Secretが必要

Productionでは`DEMAND_SYNTHETIC_FALLBACK=false`が必須です。

### 広告・LP・Ad-LP Pair

状態: **完成**

実装済み:

- 広告CRUD
- LP CRUD
- Ad-LP Pair CRUD
- CSV広告取込
- URLからのLP取込
- LP version履歴
- X Ads同期からの広告保存
- Pair Analysis
- Analysis履歴
- Improvement生成

部分実装:

- LP Runtime Event計測はあるが、Core Web Vitalsや実ブラウザレンダリング監査は限定的

### AI Orchestration / Improvement

状態: **完成**

実装済み:

- 複数AI Provider
- ProposalとRisk Reviewの分離
- REAL / MOCK結果の識別
- `provider_type`, `source_provider`, `failure_reason`保存
- MOCK結果のScorecard、Codex、Outcome Learning除外
- Improvement一覧、詳細、検索、統計
- Approve、Reject、Apply Ready、Applied、Failed
- Reject理由、更新者、更新時刻、監査履歴
- BackendとDBによる不正状態遷移拒否

状態モデル:

```text
GENERATED -> APPROVED -> APPLY_READY -> APPLIED
GENERATED -> REJECTED
APPROVED -> REJECTED
APPLY_READY -> FAILED
FAILED -> APPLY_READY
```

### Codex Task

状態: **Task管理とManual実行は完成、Production REAL_EXECUTIONは部分実装**

実装済み:

- Apply ReadyかつREAL ImprovementからTask作成
- 一覧、詳細、検索、Filter、Pagination
- 状態履歴、実行ログ
- QUEUED、RUNNING、SUCCEEDED、FAILED、CANCELLED、PR_CREATED、OUTCOME_CREATED
- MANUAL_EXECUTION結果登録
- REAL_EXECUTIONサービス
- Credit消費、idempotency、失敗時補償
- GitHub PR / Outcome接続
- MOCK execution無効化

Production上の制限:

- Backend DockerfileはCodex CLIをインストールしていない
- REAL_EXECUTIONはGitHub Appで選択されたRepositoryをタスクごとの一時領域へcloneする。共有`CODEX_WORKSPACE`は使用しない
- git credentialsと実行sandbox方針が必要
- したがって現状Productionで確実に提供できるのはMANUAL_EXECUTION

### GitHub

状態: **コード上の主経路は完成、Production設定確認が必要**

実装済み:

- OAuth / Token接続
- ユーザーごとの接続保存
- Repository一覧、Branch一覧
- Repository選択と権限確認
- Branch作成
- Commit作成
- Pull Request作成
- PR URL、番号、状態、監査イベント保存
- 手動・定期状態同期
- 切断と再接続

注意:

- `backend/fly.toml`の既定値は`ADFLOW_GITHUB_PROVIDER=github_app`
- Productionで実GitHubを提供する場合は`github` providerと実認証情報の確認が必要
- Productionで実Repositoryを使った最終受入試験が必要

### X Ads

状態: **コード上の主経路は完成、実アカウント受入試験が必要**

実装済み:

- OAuth / Manual token接続
- Account取得
- 広告・指標同期
- Publish Request
- 人間による承認・却下
- 公開処理
- Event、失敗理由、監査情報保存
- Outcome / Experimentへの接続

部分実装・外部依存:

- X Developer権限と広告アカウントが必要
- Rate Limit、長時間障害、本番公開の最終受入試験が必要
- 接続解除時のX側token失効は実アカウントでの確認が必要

### Outcome / Learning

状態: **完成**

実装済み:

- Improvement、Codex Task、GitHub PRからOutcome作成
- Before / After
- 測定期間、測定方法、Evidence
- SUCCESS、PARTIAL_SUCCESS、NO_IMPACT、FAILED判定
- Learning Data保存
- confidence、measurement quality、改善率保存
- Project / Market / Improvement type別集計
- Outcome Learningの次回分析利用
- MOCK由来データのLearning除外

### Experiment / Measurement

状態: **主要経路は完成**

実装済み:

- Experiment CRUD
- DRAFT、READY、RUNNING、PAUSED、COMPLETED、FAILED、ARCHIVED
- Variant A/B/C以上
- Traffic allocation
- session hashによる安定割当
- LP Runtime Event
- X Ads measurement集計
- Winner Detection
- sample size、confidence、Evidence
- Learning、Insight、Revenue Impact
- Alert
- Outcome接続
- Public Eventのvariant改ざん防止
- Public EventからのConversion / Revenue直接登録拒否

部分実装:

- 高度な連続値統計は未実装
- 複数Backend instance向け分散lockは未実装
- LP tracking tokenの失効・再発行UIは未実装
- 現在Fly.ioは1 machineで運用している

### Billing / Credits

状態: **Test Modeでは完成、有料Productionは未完了**

実装済み:

- Stripe Checkout
- Billing Portal
- Checkout Session完了検証
- Webhook署名
- Webhook冪等性
- Subscription更新・キャンセル
- Payment failure
- Credit purchase
- Refund時のCredit調整
- Credit消費と台帳
- 外部処理失敗時の補償
- idempotency

現行価格:

| Plan | 月額 | 月間Credit |
| --- | ---: | ---: |
| Free | ¥0 / $0 | 500 |
| Starter | ¥2,980 / $24 | 2,500 |
| Growth | ¥6,980 / $55 | 8,000 |
| Business | 個別見積 | 個別 |

現在のStripeはTest Modeです。Stripe Live Secret Key、Live Price、Live Portal Configuration、Live Webhookを設定するまで、有料一般公開はできません。

### Public LP / Contact

状態: **主要経路は完成**

実装済み:

- 広告改善ワークスペースとしてのLP
- 日本語 / 英語切替
- 問い合わせvalidation
- Honeypot、Rate Limit、IP hash
- 問い合わせDB保存
- Weekly LP Report Snapshot保存・公開Route

部分実装:

- Vercel Cron設定は現在外しているため、週次自動更新には外部Schedulerが必要
- アプリ全体のi18n auditでは、visible hard-coded UI stringが114件残っている

## A-5. 直近の変更点: プラン別Feature Gating

状態: **実装・DB適用・実証済み。最新Frontend / Backendの再デプロイ待ち**

実装内容:

| 機能 | Free | Starter | Growth | Business |
| --- | --- | --- | --- | --- |
| 保存アイテム | 合計10件 | 無制限 | 無制限 | 個別 |
| Ad-LP Pair Analysis | 不可 | 可 | 可 | 可 |
| Experiment作成 | 不可 | 不可 | 可 | 可 |

Freeの保存件数に含むもの:

- Project
- 広告
- LP
- Ad-LP Pair
- Demand Discovery Session

強制箇所:

- FastAPIのPlan Entitlement Service
- 構造化403エラー
  - `PLAN_UPGRADE_REQUIRED`
  - `PLAN_LIMIT_REACHED`
- FrontendのUpgrade導線
- Supabase function / trigger
- Supabase RESTへの直接insertでも回避不可

実DB・実API確認:

| Plan | 11件目保存 | Pair Analysis | Experiment作成 |
| --- | --- | --- | --- |
| Free | 拒否 | 拒否 | 拒否 |
| Starter | 許可 | 許可 | 拒否 |
| Growth | 許可 | 許可 | 許可 |

境界動作:

- 10件到達時の既存データ編集: 成功
- 論理削除: 成功
- 削除後の新規保存: 成功
- 上限到達中の削除済みProject復元: 拒否

主要ファイル:

- `backend/services/billing/entitlements.py`
- `backend/api/main.py`
- `frontend/lib/api/errors.ts`
- `frontend/lib/billing/plans.ts`
- `supabase/migrations/202606190001_plan_feature_gating.sql`
- `backend/tests/test_plan_feature_gating.py`
- `frontend/e2e/plan-feature-gating.spec.ts`

## A-6. リリース前監査の要点

`docs/release-readiness-report.md`は、2026年6月20日時点では存在しません。

代わりに現在の実装・Production・リリース差分は、コード調査と`docs/adflow-ai-release-source-of-truth-ja.md`へ集約されています。その要点は次のとおりです。

### 現在の判定

| リリース形態 | 判定 |
| --- | --- |
| ローカル開発・社内検証 | READY |
| 限定ベータ | 最新コード再デプロイ後にCONDITIONAL READY |
| 有料一般公開 | NOT READY |

### 確認済み

- Backend全テスト: 101 passed
- Frontend typecheck: 成功
- Frontend production build: 成功
- Feature Gate対象テスト: 成功
- Feature Gate実DB / 実API: 成功
- Supabase migration `202606190001`: 適用済み
- Production Frontend: HTTP 200
- Production Backend `/ready`: HTTP 200
- npm audit: 0 vulnerabilities確認済み

### リリース前の優先作業

1. dirty worktreeをレビューし、リリース対象をcommitする
2. 最新BackendをFly.ioへ再デプロイする
3. 最新FrontendをVercelへ再デプロイする
4. ProductionでFree / Starter / GrowthのFeature Gate smoke testを行う
5. 無料限定ベータか有料公開かを決定する
6. 有料公開する場合はStripe Live Modeを構成する
7. LPで強く訴求するGitHub、Codex、X AdsのProduction提供範囲を確定する
8. エラー監視、Uptime監視、Webhook監視、Backup / Restore手順を整備する

## A-7. 既知の技術的制限事項

- StripeはTest Mode
- 最新Feature GateのFrontend / BackendはProductionへ未再デプロイ
- Production artifactとGit commitの対応が固定されていない
- dirty worktreeに多数の未コミット変更がある
- Reddit ConnectorはAPI審査待ち
- GitHub Production providerの最終確認が必要
- Production DockerにCodex CLIが入っていない
- Codex REAL_EXECUTIONにはgit workspaceとcredentialsが必要
- X Adsの実アカウントによる長時間受入試験が必要
- Team / Organization / Role管理は未実装
- Google Suggest、Related Search、PAA、YouTubeコメント専用取得は未実装
- Review Connectorは専用正式APIではなく検索由来が中心
- Experimentの高度な連続値統計は未実装
- 複数Backend instance向け分散lockは未実装
- LP tracking tokenのrotation / revoke UIは未実装
- Core Web Vitalsを含む実ブラウザLP監査は限定的
- Vercel CronによるWeekly LP Snapshot自動更新は未設定
- i18n auditでhard-coded visible stringが114件残っている
- FastAPI `on_event`にdeprecated warningがある
- Production外部ConnectorのRate Limit・長時間障害試験は未完了
- 集中エラー監視、Backup / Restore訓練、Secret Rotation手順は未整備

---

# Part B: 事業・戦略コンテキスト

## プロダクトポジショニング

AdFlow-AIは「広告改善ワークスペース」として位置づける。差別化の核は、分析結果を提示して終わるのではなく、承認されたImprovementを実際のコード変更(GitHub PR)、または手動実行記録まで一気通貫で繋げている点にある。LPOツールやAI市場調査ツールは市場にすでに多数存在するが、分析から実行まで閉じたループを提供するツールは少ない。

## ターゲットセグメントの現状の考え方

差別化機能(GitHub PR自動生成)が最も刺さるのは、自社のLPをコードで管理している技術寄りの個人開発者・小規模SaaSチーム。ただしこの層は予算が薄く、継続課金の定着率も読みにくい。一方、複数クライアントの広告アカウントを運用する代理店は支払い能力が高く、コード管理されていないLPでも`MANUAL_EXECUTION`モードで価値提供できる。現状の方針は、初期訴求とLPコピーは技術寄りの個人開発者・小規模チーム(「グロース担当を雇う代わり」という訴求軸)に向けつつ、代理店層への展開余地は手動実行モードで残しておく、というもの。

## 価格戦略

現行価格(Free ¥0、Starter ¥2,980、Growth ¥6,980)は、実績ゼロの状態で高い価格を提示しても誰も払わないという判断から、意図的に「ファウンダー価格」として位置づけている。この価格で契約した最初期のユーザーには、将来価格を見直した後もこの金額を継続する特典を約束する想定。

価格見直しのトリガーは「具体的な成果事例(Before/After含む)が3件たまる」「ローンチから90日が経過する」のいずれか早い方とする。見直し後の目安となる価格帯はStarter ¥9,800前後、Growth ¥24,800前後、Business個別見積(¥49,800〜、アカウント数に応じた従量)だが、これは確定値ではなく、実際の見込み客の反応を見て調整する前提の仮説である。

## リリース方針

全機能を完成させてから出すのではなく、最低限動く状態(70%程度)でリリースし、実際の反応を見ることを優先する。残作業の中で最優先度が高いのはLPのポジショニングとコピーであり、機能の完成度より優先する。

リリース前の必須修正事項として、Freeプランで本来Starter以上限定のはずの機能(ペア分析等)がクレジット残高さえあれば実行できてしまう問題があり、これはプラン別Feature Gatingの実装(別タスクで対応指示済み)で解消する。

## 収益目標

短期: 月10万円、中期: 月30万円、長期: 月50万円以上の安定化。

## 開発体制

個人開発。開発の主担当はCodex CLI、設計レビュー・完了判定チェック・事業戦略の壁打ちはClaudeが担当する役割分担で進めている。

## 開発者の傾向に関する留意事項

このプロダクトの開発者は、抽象化能力・システム全体を見渡す力が強い一方、検討期間が長引きやすく、実装前の検討や作り込みを続けてしまう傾向がある。このドキュメントを読んだAIがアドバイスを行う際は、慰めや一般論での励ましより、率直な評価と具体的な次の一歩を優先することが望ましい。特に「もっと検討する」「もっと作り込む」という方向の提案をする前に、それが本当に必要な検証なのか、先延ばしの一種になっていないかを一度疑うことが推奨される。

---

# AIへの判断指針

この文書を読んだAIは、次の原則で助言・実装判断を行うこと。

1. 新機能追加より、実ユーザーへ出して反応を得るための最短経路を優先する。
2. コード上の実装とProductionで利用可能な状態を混同しない。
3. UIだけ、固定レスポンスだけ、保存だけの実装を完成扱いしない。
4. 外部サービス未設定時に成功したように見せない。
5. MOCKとREAL、SYNTHETICと実測値を混同しない。
6. 有料公開と無料限定ベータを分けて考える。
7. 追加検討を提案する前に、実ユーザー検証を遅らせるだけではないか確認する。
8. 助言は率直な現状評価、優先順位、次の具体的行動を含める。
