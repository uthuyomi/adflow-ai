# AdFlow-AI LP制作ソース・オブ・トゥルース

最終更新: 2026年6月16日

この文書は、AdFlow-AIのトップページLPを第三者AIまたは外部制作者に作らせるための制作資料です。コード、現行仕様、Phase監査、画面実装を根拠に、実際に存在する機能だけをLP素材として整理しています。

LP制作時は、この文書を一次資料として扱ってください。古い仕様書、過去の監査レポート、初期UI資料は履歴資料であり、現在の訴求判断には使わないでください。

## 1. LP制作の基本方針

AdFlow-AIは、単なるAI分析ツールではありません。市場Evidence、広告・LP改善、実装、GitHub PR、効果測定、Experiment、Learningをつなぐ、改善運用プラットフォームです。

LPでは、次の価値を中心に伝えるべきです。

- 何を根拠に改善すべきか分かる
- AI提案をそのまま実行せず、人間が承認できる
- 承認した改善をCodex TaskやGitHub PRへつなげられる
- 実装後のOutcomeとExperiment結果を測定できる
- 成功・失敗パターンを次の改善提案へ戻せる

ただし、現在のアプリ全体に正式な `BUILD / PIVOT / WAIT` 判定画面があるわけではありません。この判定はトップページ用の週次LPスナップショット機能として存在します。LP全体を「Build Decision」だけに寄せすぎると、実際のアプリの中核である改善・実装・測定ループを過小評価します。

推奨ポジショニングは次の通りです。

> Evidenceから改善案を作り、承認し、実装し、測定し、学習するための広告・LP改善ワークフロー。

短く言う場合:

> 広告・LP改善を、EvidenceからLearningまでつなぐAI運用プラットフォーム。

## 2. 対象ユーザー

実装済み機能から見て、主要ターゲットは次のユーザーです。

- SaaS、デジタルサービス、オンライン商品の運用者
- 広告とLPを継続的に改善したいマーケター
- 広告運用とLP改善を一体で管理したい小規模チーム
- AI提案を人間の承認付きで使いたいプロダクトチーム
- GitHub PRやCodex Taskまで改善フローをつなげたい開発寄りのチーム
- X Adsを使って広告同期・公開・測定を行いたい運用者

LPで「個人開発者」「ソロ創業者」「SaaSビルダー」を対象にすることは可能です。ただし、現行アプリには広告、LP、X Ads、GitHub、Outcome、Experimentなど運用機能が多いため、「アイデア検証だけの個人向けツール」として狭く見せすぎない方がよいです。

## 3. 実装済みの主要機能

以下はLPで訴求してよい実装済み機能です。表現は「できる」「管理できる」「保存できる」「接続できる」程度に留め、成果保証はしないでください。

### Project / Workspace

- Project作成、編集、複製、一時停止、アーカイブ、復元、論理削除
- Project単位でDiscovery、Research、Improvement、Codex、PR、Outcome、Experimentを管理
- Global Search、Notification Center、Background Jobs、Activity Timeline、Saved Views、Workspace Settings
- Realtime同期とポーリングフォールバック

根拠:

- `frontend/app/projects/page.tsx`
- `frontend/app/operations/page.tsx`
- `backend/api/main.py`
- `supabase/migrations/202606150001_phase7_operations_workspace.sql`

### Demand Discovery / Demand Intelligence

- Demand Discoveryセッション作成、一覧、再開、検索、お気に入り、削除
- 実Connector由来のEvidence保存
- Competitor候補保存
- Demand Score保存
- Learning Context保存
- 実データと参考推定値の区別
- Connector状態、失敗、Unavailable状態の保存

LPで使える表現:

- 「市場Evidenceを収集し、改善判断の材料として整理」
- 「検索結果、レビュー検索、X、Webページ、Firecrawl、RedditなどのConnectorに対応」
- 「実データと参考推定値を区別」
- 「Evidence、競合候補、需要スコアを保存」

注意:

- RedditはAPI審査・認証情報が必要です。
- Google Suggest、Related Search、PAA、YouTubeコメント専用取得は未実装です。
- Demand Scoreは意思決定支援用であり、需要や売上の証明ではありません。

根拠:

- `frontend/app/demand-discovery/page.tsx`
- `backend/services/demand/demand_intelligence_service.py`
- `backend/services/demand/evidence_engine.py`
- `backend/services/demand/demand_scoring_engine.py`
- `backend/services/demand/connectors/**`
- `supabase/migrations/202606130003_phase6_real_demand_evidence.sql`

### Ad / LP Pair Analysis

- 広告とLPをPairとして登録
- Pair単位でAI分析、改善提案、リスク、推奨ポジショニング、LP改善Contextを表示
- Demand Intelligence結果、Evidence、Competitor gaps、Outcome Learningを分析Contextに利用
- AI結果にREAL / MOCKを保存・表示

LPで使える表現:

- 「広告とLPを別々ではなく、一つの改善単位として分析」
- 「広告の約束とLPの訴求ズレを確認」
- 「需要Evidenceと過去Outcomeを使って改善案を作る」

注意:

- AI結果は外部API設定に依存します。
- MOCK結果は明示され、Learning対象外です。

根拠:

- `frontend/app/pairs/[pairId]/page.tsx`
- `backend/services/analysis/registered_pair_analysis_service.py`
- `backend/services/orchestration/ai_orchestrator.py`
- `supabase/migrations/202606120001_phase1_trust_and_reliability.sql`

### Improvement Workflow

- 改善提案一覧と詳細
- 状態: `GENERATED`, `APPROVED`, `REJECTED`, `APPLY_READY`, `APPLIED`, `FAILED`
- Approve、Reject、Apply Ready、Applied、Failedの状態保存
- Reject理由保存
- 監査ログ保存
- 更新者、更新日時保存
- 統計表示

LPで使える表現:

- 「AI提案を人間の承認フローに通せる」
- 「承認、却下、Apply Readyを履歴付きで管理」
- 「実装前にレビューと判断を分離」

根拠:

- `frontend/app/improvements/page.tsx`
- `frontend/app/improvements/[improvementId]/page.tsx`
- `frontend/components/improvements/**`
- `frontend/lib/api/improvements.ts`
- `backend/api/main.py`
- `supabase/migrations/202606120002_phase2_improvement_workflow.sql`

### GitHub Integration

- GitHub OAuth接続
- Repository一覧取得、Repository選択
- Branch作成
- Commit作成
- Pull Request作成
- PR URL、PR番号、状態保存
- PR一覧表示
- GitHub状態同期
- 異常時のFAILED保存

LPで使える表現:

- 「承認済み改善をGitHub PRへつなげられる」
- 「Branch、Commit、Pull Requestを生成」
- 「PR状態を同期」

注意:

- GitHub連携にはOAuth設定または接続済みトークンが必要です。
- 権限不足やRepository削除時は失敗状態になります。

根拠:

- `frontend/app/prs/page.tsx`
- `frontend/components/improvements/GitHubPrPanel.tsx`
- `frontend/lib/api/prs.ts`
- `backend/services/github/github_integration_service.py`
- `supabase/migrations/202606120003_phase3_github_pr_workflow.sql`

### Codex Task

- Apply Ready改善からCodex Task作成
- Task一覧、詳細、状態履歴
- 状態: `CREATED`, `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `PR_CREATED`, `OUTCOME_CREATED`
- REAL_EXECUTION、MANUAL_EXECUTION、MOCKを区別
- 実行ログ、stdout、stderr、files changed、diff summary保存
- Codex結果からGitHub PRまたはOutcome作成

LPで使える表現:

- 「改善案を実装タスクへ変換」
- 「Codex実行または手動実行結果を保存」
- 「実装結果をPRやOutcomeへ接続」

注意:

- REAL_EXECUTIONにはCodex CLI等の実行環境設定が必要です。
- MANUAL_EXECUTIONは、人間または外部Codexで実装した結果を登録する経路です。
- MOCKは本番デフォルトではありません。

根拠:

- `frontend/app/codex-tasks/page.tsx`
- `frontend/app/codex-tasks/[taskId]/page.tsx`
- `backend/services/codex/codex_task_service.py`
- `supabase/migrations/202606130001_phase4_codex_execution_workflow.sql`

### Outcome / Learning

- Improvement、Codex Task、GitHub PRからOutcome作成
- Before / After metrics保存
- 測定方法、測定期間、Evidence保存
- Outcome状態管理
- 成功、部分成功、影響なし、失敗の評価
- Learning Data保存
- 成功・失敗パターンを次回分析Contextへ接続

LPで使える表現:

- 「実装後の結果をOutcomeとして測定」
- 「Before / Afterを記録」
- 「成功・失敗パターンを次回改善に利用」

注意:

- 一部Outcomeは手動測定またはConnector refreshが必要です。
- 結果の改善を保証するものではありません。

根拠:

- `frontend/app/outcomes/page.tsx`
- `frontend/app/outcomes/[outcomeId]/page.tsx`
- `backend/services/outcomes/improvement_outcome_service.py`
- `backend/services/outcomes/outcome_learning_engine.py`
- `supabase/migrations/202606130002_phase5_outcome_learning_loop.sql`

### Experiment / Measurement / Revenue Impact

- Experiment作成、編集、削除
- 状態: `DRAFT`, `READY`, `RUNNING`, `PAUSED`, `COMPLETED`, `FAILED`, `ARCHIVED`
- 複数Variant対応
- Traffic allocation
- Public tracking token
- LP Runtime Analytics: Page View、Bounce、Scroll Depth、Time On Page、CTA Click、Form Submit、Conversion、Revenue
- X Ads指標集計
- Winner Detection
- Experiment Learning
- Revenue Impact
- Evidence付きInsight
- Alert通知
- Executive Dashboard

LPで使える表現:

- 「改善施策をExperimentとして測定」
- 「Variantごとの結果を比較」
- 「勝者、Revenue Impact、Learningを保存」
- 「次回改善に実測結果を戻す」

注意:

- 統計は主に二値指標の比率検定です。
- 連続値指標の高度な分散推定は未実装です。
- 複数Backend instanceでの定期評価には分散ロックが必要です。
- LP Runtime Analyticsを使うには対象LPへtracking呼び出しを組み込む必要があります。

根拠:

- `frontend/app/experiments/page.tsx`
- `frontend/app/experiments/[experimentId]/page.tsx`
- `backend/services/product/ad_ab_test_service.py`
- `supabase/migrations/202606150003_phase8_experiment_measurement_learning.sql`
- `docs/phase8-audit-report.md`

### X Ads Integration / Publish

- X Ads OAuth
- 手動接続
- 接続検証
- アカウント取得
- 広告・指標同期
- 公開要求作成
- 承認・却下
- 公開
- promoted tweet関連付け
- 公開イベント保存
- X Ads公開後のOutcomeやExperiment接続

LPで使える表現:

- 「X Adsの広告・指標を同期」
- 「承認済み公開要求としてX Ads公開を管理」
- 「公開後の測定とOutcomeへ接続」

注意:

- X Ads API権限と対象Ads account権限が必要です。
- 外部APIのRate Limitや権限は利用環境に依存します。

根拠:

- `frontend/components/x-ads/**`
- `backend/services/x_ads/x_ads_service.py`
- `docs/x-ads-release-workflow.md`
- `supabase/migrations/202606070002_x_ads_release_workflow.sql`

### Billing / Credit / Contact

- Stripe Checkout
- Billing Portal
- Webhook冪等処理
- 支払い成功、失敗、返金、キャンセル処理
- Credit残高、購入、消費、返金台帳
- Contactフォームのバリデーション、スパム対策、DB保存

LPで使える表現:

- 「クレジット制で分析・実行コストを管理」
- 「Stripe決済とBilling Portalに対応」
- 「問い合わせフォームは保存・送信処理付き」

注意:

- 実決済にはStripe本番設定が必要です。
- Businessプランは問い合わせ導線として扱うのが安全です。

根拠:

- `frontend/app/pricing/page.tsx`
- `frontend/lib/billing/plans.ts`
- `frontend/app/api/stripe/**`
- `frontend/app/api/contact/route.ts`
- `supabase/migrations/202606120001_phase1_trust_and_reliability.sql`

## 4. LPで使ってよい主要メッセージ

以下は実装と整合するコピー案です。

### 英語

- Evidence-backed ad and landing page improvement workflow.
- Turn market evidence into reviewed improvements, implementation tasks, and measured outcomes.
- Connect demand research, AI review, GitHub PRs, experiments, and learning in one workflow.
- Review AI recommendations before they become implementation work.
- Measure what changed after an improvement ships.
- Feed outcome and experiment learning back into future recommendations.
- Keep real AI results, mock results, real evidence, and synthetic estimates separate.
- Create GitHub pull requests from approved improvements.
- Track experiments, winners, revenue impact, and learning.

### 日本語

- Evidenceに基づいて広告・LP改善を運用するワークフロー。
- 市場Evidenceを、レビュー済み改善案、実装タスク、測定結果へつなげる。
- 需要調査、AIレビュー、GitHub PR、Experiment、Learningを一つの流れで管理。
- AI提案を実装前に人間が承認できる。
- 改善を公開した後、何が変わったかを測定できる。
- OutcomeとExperimentの学習を次回提案へ戻せる。
- 実AI、モック、実Evidence、参考推定値を区別できる。
- 承認済み改善からGitHub Pull Requestを作成できる。
- 実験の勝者、Revenue Impact、Learningを追跡できる。

## 5. LPで避けるべき表現

以下は誤認リスクがあるため使わないでください。

- 売上を予測する
- 成功するアイデアを見つける
- Product-Market Fitを保証する
- 必ずCVRが上がる
- 完全自動で改善が完了する
- すべての外部ソースを常時取得できる
- YouTubeコメントを取得できる
- Google Suggest / Related Search / PAAを専用取得できる
- Redditを認証なしで常時取得できる
- チーム・組織権限に対応
- 高度な統計分析を完全実装
- すべての指標を自動計測
- BUILD / PIVOT / WAITが全アプリ画面の標準出力

特に、トップページ用の週次 `BUILD / PIVOT / WAIT` カードは実装されていますが、通常のDemand Discovery画面に同じ形式の正式出力があるわけではありません。LPで使う場合は「週次サンプル」「公開LP用スナップショット」として扱うのが安全です。

## 6. 現在のトップページLPに関する注意

現在のLPには、週次更新のBuild Decisionカードがあります。

実装済み:

- `/api/lp-report-snapshot` で最新の `lp_report_snapshots` を取得
- Vercel Cronで `/api/cron/lp-report-refresh` を毎週実行
- Backend `/internal/lp-report-snapshot/refresh` がDemand Intelligenceを実行
- Evidence件数、競合候補数、クラスタ数、実コネクタ数、需要スコアを保存
- `BUILD / PIVOT / WAIT`、confidence、opportunity、reasons、nextActionを生成

注意:

- Cronには `CRON_SECRET`、Backendには `ADFLOW_LP_SNAPSHOT_*` 設定が必要です。
- ライブ取得に失敗した場合、バンドル済みfallback snapshotが表示されます。
- Example Report内の一部文面は固定コピーです。全項目がライブ分析結果ではありません。

根拠:

- `frontend/components/marketing/HomePageClient.tsx`
- `frontend/components/landing/HeroSection.tsx`
- `frontend/lib/landing/real-report-snapshot.ts`
- `frontend/app/api/lp-report-snapshot/route.ts`
- `frontend/app/api/cron/lp-report-refresh/route.ts`
- `backend/services/demand/lp_report_snapshot_service.py`
- `supabase/migrations/202606140001_weekly_lp_report_snapshots.sql`

## 7. 推奨LP構成

他AIにLPを作らせる場合、以下の構成が現行アプリと最も整合します。

### 1. Hero

目的: 3秒で「何のためのサービスか」を伝える。

推奨メッセージ:

- 広告・LP改善を、EvidenceからLearningまでつなぐ
- AI提案をそのまま信じず、承認・実装・測定まで管理

表示してよい要素:

- Evidence
- Reviewed Improvement
- Codex Task / GitHub PR
- Outcome
- Experiment Winner
- Learning

避ける要素:

- 売上予測
- 成功保証
- 過度なダッシュボード風メトリクス

### 2. Problem

伝える課題:

- 広告とLPが分断されている
- 改善提案の根拠が残らない
- AI提案をそのまま実装するのは危険
- 改善後の結果が次回に活かされない
- 実験やOutcomeが運用履歴とつながらない

### 3. Workflow

推奨フロー:

```text
Discover
→ Research
→ Improve
→ Approve
→ Implement
→ Measure
→ Learn
```

または:

```text
Evidence
→ AI Review
→ Human Approval
→ Codex / GitHub
→ Outcome / Experiment
→ Learning
```

### 4. Product Preview

架空ダッシュボードではなく、実装済み概念を使ってください。

表示候補:

- Demand Evidence
- Improvement status
- GitHub PR status
- Outcome status
- Experiment winner
- Revenue Impact
- Learning summary

注意:

- 数値を出す場合は「Example」「Sample」「Illustrative」と明記する。
- 実DBスナップショット由来の数値だけを「verified」と表現する。

### 5. Capabilities

4〜6個に絞るのがよいです。

推奨:

1. Evidence-backed Research
2. AI Review & Human Approval
3. Codex / GitHub Implementation
4. Outcome Measurement
5. Experiment & Winner Detection
6. Learning Loop

### 6. Why Not Just ChatGPT?

比較軸:

| ChatGPT単体 | AdFlow-AI |
| --- | --- |
| 会話で提案を作る | Evidence、状態、履歴、Outcomeと接続 |
| 判断履歴が残りにくい | 承認、却下、Apply Readyを保存 |
| 実装・PRと分断 | Codex TaskとGitHub PRに接続 |
| 結果が次回に戻りにくい | Outcome / Experiment Learningへ保存 |

### 7. Built For

推奨ターゲット:

- SaaS teams
- Growth teams
- Product marketers
- Solo founders / indie hackers
- Small product teams
- Teams that connect marketing and engineering

### 8. Pricing / CTA

価格は必ず `frontend/lib/billing/plans.ts` を参照してください。

現行プラン:

- Free: 500 monthly credits
- Starter: 2,500 monthly credits
- Growth: 8,000 monthly credits
- Business: contact only

金額:

- JPY/USDの金額は `PLANS` 定義から取得してください。
- LP上で固定金額を書く場合、実装と同期してください。

### 9. FAQ

入れるべきFAQ:

- ChatGPTとの違い
- 成功を保証するか
- どのデータソースを使うか
- AI結果とモックを区別できるか
- GitHub PRまで作れるか
- 実装後の効果を測れるか
- 外部連携には何が必要か

## 8. デザイン方向性

現行アプリと合う方向:

- Evidence-driven
- Operational
- Reviewable
- Human-in-the-loop
- Audit trail
- Workflow, not dashboard

避ける方向:

- AI魔法感
- サイバーパンク
- 成功保証
- 投資・売上予測ツール風
- SEOツール風
- BIダッシュボード風

UIとしては、分析量よりも「次のアクション」「状態」「根拠」「結果」を優先してください。

## 9. LP制作用プロンプトに含めるべき指示

外部AIに渡す場合は、次の指示を含めてください。

```text
あなたはAdFlow-AIのLPを制作します。
必ず docs/lp-creation-source-of-truth-ja.md を一次資料として扱ってください。
実装済み機能以外を訴求しないでください。
成功保証、売上予測、Product-Market Fit保証、完全自動化の表現は禁止です。
AdFlow-AIは、需要Evidence、AIレビュー、人間の承認、Codex/GitHub実装、Outcome/Experiment測定、Learningをつなぐ広告・LP改善ワークフローです。
LPでは「EvidenceからLearningまでつながる改善運用」を中心に訴求してください。
```

## 10. 実装根拠として優先して読むファイル

LP制作AIが追加確認する場合は、次の順に読んでください。

1. `docs/adflow-ai-current-state.md`
2. `docs/adflow-ai-product-overview-ja.md`
3. `docs/unimplemented-features-audit.md`
4. `docs/phase8-audit-report.md`
5. `frontend/lib/i18n/lp.ts`
6. `frontend/components/landing/**`
7. `frontend/app/demand-discovery/page.tsx`
8. `frontend/app/improvements/**`
9. `frontend/app/codex-tasks/**`
10. `frontend/app/prs/page.tsx`
11. `frontend/app/outcomes/**`
12. `frontend/app/experiments/**`
13. `backend/api/main.py`
14. `backend/services/demand/**`
15. `backend/services/codex/**`
16. `backend/services/github/**`
17. `backend/services/outcomes/**`
18. `backend/services/product/ad_ab_test_service.py`
19. `supabase/migrations/202606120001_phase1_trust_and_reliability.sql` 以降

## 11. 最終チェックリスト

LP公開前に、以下を確認してください。

- 実装済みでない機能を主張していない
- 成功保証・売上予測をしていない
- AIが自動で全て実装すると誤解させていない
- GitHub、Codex、X Ads、Reddit、Stripeなど外部連携には設定が必要だと分かる
- Evidenceと参考推定値を混同していない
- Weekly Build Decisionを通常アプリ全体の標準機能として誇張していない
- Pricingは `frontend/lib/billing/plans.ts` と一致している
- CTA先が実在する
- 日本語・英語の両方で同じ意味になっている
- 「分析ツール」ではなく「改善運用ワークフロー」として伝わる

