# AdFlow AI Complete Specification（日本語版）

このファイルは、AdFlow AI の製品仕様、技術仕様、アルゴリズム仕様、将来開発の引き継ぎ資料を 1 つにまとめた完全仕様書です。

記載方針:

- 実装済みのものは `Status: Implemented（実装済み）` と記載する
- 一部のみ実装済みのものは `Status: Partially implemented（一部実装済み）` と記載する
- 未実装のものは `Status: Not implemented（未実装）` と記載する
- Demand Intelligence は `an evidence-based decision support system` として扱い、売上予測、需要保証、成功予測として扱わない
- 仕様は現在のコードベースに基づく。未確認の機能は実装済みとして扱わない

## 1. Product Overview

Status: Implemented（実装済み）

AdFlow AI は、広告とランディングページ（LP）を 1 つの改善単位として登録し、分析、変更履歴、AI 提案、リスクレビュー、Codex 実装タスク化、実装後の結果記録までを扱う広告改善オペレーション SaaS です。

中心となる対象は `twitter_ads` と `landing_pages` を紐づけた `ad_lp_pairs` です。広告単体の改善ではなく、広告の約束と LP のファーストビュー、CTA、オファー、ターゲットが一致しているかを評価します。

主な機能:

- Supabase Auth によるログイン
- Bearer token によるバックエンド認証
- プロジェクト管理
- X 広告 CRUD
- LP CRUD
- LP versioning
- 広告 LP ペア CRUD
- 変更履歴保存
- Pair Analysis
- Demand Intelligence Engine
- Evidence Explorer
- AI Orchestration
- AI proposal comparison
- AI scorecards
- Codex task prompt 生成
- Improvement Outcome Tracking
- Credit Billing
- Stripe Checkout
- JPY / USD 料金表示切り替え
- 英語 / 日本語 i18n

## 2. Core Concept

Status: Implemented（実装済み）

### 広告と LP はペアで分析する

広告の CTR が上がっても、クリック後の LP と訴求がずれていれば CVR や直帰率が悪化する可能性があります。そのため AdFlow AI は、広告と LP を常に同じ改善単位として扱います。

### AI 提案とレビューを分離する

提案生成 AI とリスクレビュー AI を分離します。これにより、広告文や LP 改善案をそのまま実装せず、人間が採否を判断するワークフローを作ります。

### Demand Intelligence は需要を断定しない

Demand Intelligence は `an evidence-based decision support system` です。ネット上の不満、欲求、要望、競合への不満を構造化し、広告改善と LP 改善の仮説材料にします。

Demand Intelligence は次ではありません。

- sales prediction system
- guaranteed demand detection system
- market success predictor

## 3. Target Users

Status: Implemented（想定ユーザーとして仕様化済み）

想定ユーザー:

- SaaS やデジタル商品の広告運用者
- LP 改善を行うマーケター
- 広告代理店の運用担当者
- 広告と LP の訴求整合性を検証したいプロダクトチーム
- AI 提案をレビュー付きで運用したいチーム
- 需要シグナルを根拠として改善仮説を作りたい事業開発担当者

## 4. Main User Problems

Status: Implemented（仕様と UI に反映済み）

ユーザーの主な課題:

- 広告文と LP の約束がずれている
- 改善履歴が残らず、前回何を変えたか分からない
- AI 提案が根拠なく出てくる
- AI 提案を採用した後の結果が次回に反映されない
- 市場の声、競合ギャップ、検索需要を広告改善に接続しにくい
- AI 実行コストをユーザー単位で制御したい
- 日本向けと海外向けの料金表示を分けたい
- 英語と日本語のマーケティングサイトを同じ実装で運用したい

## 5. Value Proposition

Status: Implemented（主要機能として実装済み）

AdFlow AI が提供する価値:

- 広告と LP を同じ文脈で分析する
- 変更履歴を含めて AI に渡す
- Demand Intelligence により、根拠つきの改善仮説を作る
- Validation / Fit / Monitoring により、根拠の強さと適合度を分けて見る
- AI 提案とリスクレビューを分離する
- `apply_ready` になった提案だけを Codex task に変換する
- 実装後 outcome を記録し、次回分析に反映する
- クレジット制で実行コストを管理する

## 6. System Architecture

Status: Implemented（主要構成は実装済み）

全体構成:

```text
Next.js Frontend
↓
Supabase Auth
↓
FastAPI Backend
↓
Supabase Repository
↓
Supabase Database
```

AI / 外部連携:

```text
Frontend UI
↓
FastAPI
↓
AI Provider Registry
↓
OpenAI / Grok / Gemini / Mock fallback
```

Demand Intelligence:

```text
Source Query Builder
↓
Connector Registry
↓
Real Source Connectors or Synthetic Fallback
↓
Demand Intelligence Service
↓
Validation / Fit / Monitoring / Search / Market / Outcome Layers
↓
Supabase
↓
Pair Analysis Context
```

Billing:

```text
Pricing UI
↓
Next.js Stripe API Routes
↓
Stripe Checkout / Webhook
↓
Supabase credit functions
↓
Backend credit checks
```

## 7. Frontend Structure

Status: Implemented（主要画面は実装済み）

主要技術:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Zustand
- React Query
- Supabase Browser Client
- Stripe API routes
- localStorage i18n persistence

主要ディレクトリ:

- `frontend/app`: ページ、API routes
- `frontend/components`: UI コンポーネント
- `frontend/hooks`: データ取得、認証、i18n hooks
- `frontend/lib`: API client、型、i18n、billing plans、store
- `frontend/locales`: 英語 / 日本語辞書

主要入力:

- Supabase Auth session
- API base URL
- localStorage の `adflow-locale`
- 登録済み広告、LP、ペア、分析 run

主要出力:

- 各管理画面
- 分析結果
- Demand Intelligence 表示
- Stripe Checkout 遷移
- 言語切り替え済み UI

## 8. Backend Structure

Status: Implemented（主要サービスは実装済み）

主要技術:

- FastAPI
- Pydantic
- Supabase REST repository
- OpenAI structured output
- deterministic LLM fallback
- provider registry

主要サービス:

- `RegisteredPairAnalysisService`: 広告 LP ペア分析
- `DemandIntelligenceService`: Demand Intelligence pipeline
- `SignalValidationEngine`: 根拠強度評価
- `SolutionFitEngine`: 需要クラスタと広告 / LP / 機能案の適合度評価
- `DemandMonitoringEngine`: snapshot と trend status
- `SearchDemandLayer`: 検索需要の参考スコア
- `MarketSizeLayer`: 市場規模の参考レンジ
- `OutcomeFeedbackLearning`: outcome と需要クラスタの接続
- `AIOrchestrator`: AI agent routing
- `CreditService`: クレジット残高確認と消費
- `ImprovementOutcomeService`: 実装後 outcome 管理

## 9. Database Structure

Status: Implemented（主要テーブル実装済み）

DB は Supabase を前提とし、全主要テーブルは `user_id` によるユーザー別分離を行います。RLS policy は `auth.uid() = user_id` を基本とします。

### ad_projects

Purpose: プロジェクト管理。

Main Columns: `id`, `user_id`, `name`, `description`, `status`, `created_at`, `updated_at`

Relationships: 広告、LP、ペア、分析 run と `project_id` で関連。

Used By: Projects UI、広告 / LP / ペア登録。

### twitter_ads

Purpose: X 広告データを保存。

Main Columns: `headline`, `body`, `cta`, `destination_url`, `impressions`, `clicks`, `conversions`, `spend`, `ctr`, `cpc`, `cvr`, `status`

Relationships: `ad_lp_pairs.twitter_ad_id`

Used By: Ads UI、Pair Analysis、Demand Intelligence query expansion。

### landing_pages

Purpose: LP データを保存。

Main Columns: `url`, `hero_title`, `hero_subtitle`, `primary_cta`, `secondary_cta`, `offer_text`, `target_audience`, `bounce_rate`, `session_duration`, `scroll_depth`, `page_speed`, `fcp`, `lcp`

Relationships: `ad_lp_pairs.landing_page_id`, `landing_page_versions.landing_page_id`

Used By: LP UI、Pair Analysis、Solution Fit。

### landing_page_versions

Purpose: LP 更新時の snapshot 保存。

Main Columns: `landing_page_id`, `version_number`, `snapshot`, `change_summary`, `created_at`

Relationships: `landing_pages.id`

Used By: Pair Detail の LP version timeline。

### ad_lp_pairs

Purpose: 広告と LP を分析単位として紐づける。

Main Columns: `twitter_ad_id`, `landing_page_id`, `project_id`, `name`, `status`, `last_analyzed_at`

Relationships: `twitter_ads`, `landing_pages`, `analysis_runs`, `demand_intelligence_runs`, `improvement_outcomes`

Used By: Pair Analysis、Demand Intelligence、Outcomes。

### change_history

Purpose: 作成、更新、削除、AI result decision の履歴保存。

Main Columns: `entity_type`, `entity_id`, `action`, `before_data`, `after_data`, `summary`, `reason`

Relationships: project / ad / LP / pair / AI result と概念的に関連。

Used By: Pair Analysis context。

### analysis_runs

Purpose: Pair Analysis の結果保存。

Main Columns: `score`, `ctr_trend`, `hero_similarity`, `cta_strength`, `bounce_rate`, `risk_level`, `ad_improvements`, `lp_improvements`, `diff_plan`, `review_result`, `history_insights`

Relationships: `ad_lp_pair_id`, `project_id`

Used By: Improvements UI、Pair Detail、Dashboard。

### demand_intelligence_runs

Purpose: Demand Intelligence 実行単位。

Main Columns: `query`, `status`, `summary`, `source_status_summary`, `validation_summary`, `solution_fit_summary`, `monitoring_summary`, `search_demand_summary`, `market_size_summary`, `outcome_learning_summary`

Relationships: signals、clusters、validations、fits、snapshots、source runs、search signals、market estimates、learning links。

Used By: Demand Intelligence tab、Pair Analysis context。

### demand_intelligence_signals

Purpose: 正規化済み signal の保存。

Main Columns: `source_type`, `source_id`, `title`, `body`, `url`, `author`, `published_at`, `engagement`, `sentiment`, `language`, `metadata`

Relationships: `run_id`

Used By: Evidence Explorer、cluster evidence。

### demand_intelligence_clusters

Purpose: pain / desire cluster 保存。

Main Columns: `cluster_type`, `name`, `category`, `count`, `source_count`, `representative_quotes`, `growth_rate`, `confidence`, `persona_ratios`, `root_causes`, `demand_signal_score`, `trend`, `evidence_signal_indexes`

Relationships: `run_id`, validations、fits、snapshots。

Used By: Demand Intelligence summary、Pair Analysis context。

### demand_signal_validations

Purpose: cluster の根拠強度評価。

Main Columns: `validation_score`, `confidence`, `cross_source_confirmed`, `source_diversity`, `duplicate_ratio`, `noise_ratio`, `spam_ratio`, `recency_score`, `continuity_score`, `bias_warnings`, `validation_reasons`

Relationships: `run_id`, `cluster_id`

Used By: Signal Validation UI、Pair Analysis guardrails。

### demand_solution_fits

Purpose: target と demand cluster の適合度評価。

Main Columns: `fit_target_type`, `fit_target_text`, `cluster_id`, `fit_score`, `coverage_score`, `gap_score`, `confidence`, `matched_pains`, `unmatched_pains`, `recommended_adjustments`, `evidence_signal_ids`

Relationships: `run_id`, `cluster_id`

Used By: Solution Fit UI、Pair Analysis context。

### demand_signal_snapshots

Purpose: demand cluster の時系列 snapshot。

Main Columns: `snapshot_date`, `signal_count`, `source_count`, `demand_signal_score`, `validation_score`, `fit_score`, `growth_7d`, `growth_30d`, `growth_90d`, `trend_status`

Relationships: `run_id`, `cluster_id`

Used By: Demand Monitoring UI。

### demand_source_runs

Purpose: connector 実行状態の保存。

Main Columns: `source_type`, `query`, `status`, `requested_count`, `collected_count`, `stored_count`, `error_message`, `metadata`

Relationships: `run_id`

Used By: Source Collection Status UI、debug。

### demand_connector_logs

Purpose: connector warning / error の保存。

Main Columns: `connector_key`, `level`, `message`, `metadata`

Relationships: `run_id`, `source_run_id`

Used By: connector 実行監査。

### demand_search_signals

Purpose: Search Demand の参考スコア保存。

Main Columns: `keyword`, `search_volume_estimate`, `competition_level`, `cpc_estimate`, `related_keywords`, `suggest_queries`, `people_also_ask`, `trend_status`, `confidence`, `search_demand_score`

Relationships: `run_id`

Used By: Search Demand UI、Market Size。

### demand_market_size_estimates

Purpose: 市場規模の参考レンジ保存。

Main Columns: `segment_name`, `persona`, `estimated_audience_size_min`, `estimated_audience_size_max`, `search_demand_score`, `pain_signal_score`, `competitor_gap_score`, `market_size_score`, `confidence`, `assumptions`, `evidence`

Relationships: `run_id`, `cluster_id`

Used By: Market Size UI、Pair Analysis context。

### demand_outcome_learning_links

Purpose: outcome と demand cluster の接続結果。

Main Columns: `outcome_id`, `demand_signal_score`, `validation_score`, `fit_score`, `search_demand_score`, `market_size_score`, `before_metrics`, `after_metrics`, `metric_delta`, `learning_status`, `learning_summary`

Relationships: `run_id`, `cluster_id`, `improvement_outcomes`

Used By: Outcome Learning UI、Pair Analysis context。

### ai_agents

Purpose: AI agent の定義。

Main Columns: `agent_key`, `display_name`, `provider`, `role`, `strengths`, `default_tasks`, `is_enabled`

Relationships: `ai_agent_results.agent_key`

Used By: AI Orchestration。

### ai_orchestration_runs

Purpose: AI routing 実行単位。

Main Columns: `platform`, `objective`, `router_version`, `route_plan`, `route_reason`, `status`, `completed_at`

Relationships: `ai_agent_results.orchestration_run_id`

Used By: Orchestration UI、analysis run history。

### ai_agent_results

Purpose: AI agent ごとの出力保存。

Main Columns: `agent_key`, `provider`, `role`, `task`, `input_summary`, `output`, `score`, `risk_level`, `decision_status`, `decision_reason`, `confidence`, `predicted_effect`

Relationships: `ai_orchestration_runs`, `codex_task_prompts`, `improvement_outcomes`

Used By: AI comparison UI、scorecards。

### ai_agent_scorecards

Purpose: AI agent の採否、信頼度、routing score。

Main Columns: `sample_count`, `average_score`, `accepted_count`, `rejected_count`, `apply_ready_count`, `avg_confidence`, `avg_risk`, `estimated_ctr_lift`, `estimated_cvr_lift`, `estimated_bounce_reduction`, `router_score`

Relationships: `agent_key`

Used By: router ranking、orchestration 管理画面。

### codex_task_prompts

Purpose: `apply_ready` の AI result から Codex 実装タスクを生成。

Main Columns: `source_ai_result_id`, `title`, `target_files_hint`, `implementation_goal`, `constraints`, `acceptance_criteria`, `prompt`, `status`

Relationships: `ai_agent_results`, `improvement_outcomes`

Used By: Codex 実装ワークフロー。

### improvement_outcomes

Purpose: 実装後の成果記録。

Main Columns: `source_ai_result_id`, `source_codex_task_id`, `title`, `description`, `implemented_at`, `measured_at`, `before_metrics`, `after_metrics`, `metric_delta`, `outcome_status`, `outcome_summary`, `learning_notes`

Relationships: pair、analysis、AI result、Codex task、outcome learning。

Used By: Outcomes UI、Pair Analysis context。

### user_billing_profiles

Purpose: Stripe 顧客、サブスクリプション、プラン情報。

Main Columns: `stripe_customer_id`, `stripe_subscription_id`, `plan_key`, `billing_status`, `current_period_end`

Relationships: `user_id`

Used By: Billing UI、Stripe webhook。

### user_credit_balances

Purpose: クレジット残高。

Main Columns: `monthly_credits`, `purchased_credits`, `lifetime_used_credits`, `last_monthly_reset_at`

Relationships: `user_id`

Used By: CreditService、Pricing UI。

### credit_transactions

Purpose: クレジット付与、購入、消費履歴。

Main Columns: `type`, `amount`, `reason`, `metadata`, `stripe_event_id`

Relationships: `user_id`

Used By: Webhook、CreditService、監査。

## 10. Authentication and Authorization

Status: Implemented（実装済み）

Frontend は Supabase browser client で session を取得します。Backend は `Authorization: Bearer <token>` を受け取り、Supabase JWT を検証して user ID を特定します。

認可方針:

- Backend repository は user ID を条件にデータを取得、更新する
- Supabase RLS は `auth.uid() = user_id` を基本にする
- Billing / credit の RPC 実行は service role 経由で行う
- 未認証 API は原則 `401` 相当のエラーになる

## 11. Credit Billing System

Status: Implemented（実装済み）

クレジットは AI 実行や分析処理を制御する単位です。

Credit balance:

- monthly credits: 月額プランで付与されるクレジット
- purchased credits: 追加購入クレジット
- lifetime used credits: 累計消費

消費順:

```text
1. Monthly credits
2. Purchased credits
```

Monthly credits は請求サイクルごとに reset されます。Purchased credits は期限なしの残高として保持されます。

実装済みの消費量:

- `workflow_run`: 300 credits
- `pair_analysis`: 80 credits
- `demand_intelligence`: 50 credits
- `demand_solution_fit`: 120 credits
- `outcome_learning_rebuild`: 20 credits
- `codex_task`: 100 credits

処理手順:

1. API 実行前に `CreditService.has_enough()` で残高確認
2. 不足時は `INSUFFICIENT_CREDITS`
3. 実行可能な場合は `consume_user_credits` RPC を呼ぶ
4. DB 関数が monthly credits から先に減算し、不足分を purchased credits から減算
5. `credit_transactions` に `consume` transaction を保存

Failure Cases:

- Bearer token がない
- 残高不足
- DB RPC エラー
- Stripe webhook の重複 event

## 12. Pricing Plans

Status: Implemented（実装済み）

Pricing UI は JPY / USD を切り替えます。

Plan examples:

- Free: small tests and first demand scans
- Starter: solo builders
- Pro: multiple projects
- Business: small teams and ad operations

Credit packs:

- 1,000 credits
- 5,000 credits
- 20,000 credits
- 50,000 credits

Stripe Price ID:

- JPY 用 env と USD 用 env を分ける
- UI 表示通貨と Checkout の Price ID を一致させる
- USD は `_USD` suffix の環境変数を使う

## 13. Pages and Routes

Status: Implemented（主要ページ実装済み）

### /

Route: `/`

Purpose: マーケティングトップ。

Main Components: PublicHeader、hero、feature summary、CTA、PublicFooter。

Required Data: i18n dictionary、auth state。

User Actions: 言語切り替え、Pricing / Login / Dashboard へ移動。

Empty State: なし。

### /pricing

Route: `/pricing`

Purpose: プラン、クレジット残高、追加 credit pack、JPY/USD 切り替え。

Main Components: PricingCards、CreditPackCards、billing portal button。

Required Data: billing profile、credit balance、Stripe Price env。

User Actions: plan checkout、credit checkout、billing portal、currency switch。

Empty State: 未ログイン時は checkout 前にログインが必要。

### /features

Route: `/features`

Purpose: AdFlow AI の機能説明。

Main Components: MarketingPageShell、localized content blocks。

Required Data: i18n dictionary。

User Actions: pricing / contact へ遷移。

Empty State: なし。

### /use-cases

Route: `/use-cases`

Purpose: 活用例の表示。

Main Components: localized use-case sections。

Required Data: i18n dictionary。

User Actions: pricing / contact へ遷移。

Empty State: なし。

### /faq

Route: `/faq`

Purpose: クレジット、請求、Demand Intelligence、AI workflow の FAQ。

Main Components: FAQ list。

Required Data: i18n dictionary。

User Actions: contact / pricing へ遷移。

Empty State: なし。

### /contact

Route: `/contact`

Purpose: 問い合わせ導線。

Main Components: contact content、support / billing / partnership categories。

Required Data: i18n dictionary。

User Actions: メールまたは問い合わせ導線の確認。

Empty State: なし。

### /terms

Route: `/terms`

Purpose: 利用規約。

Main Components: localized legal content。

Required Data: i18n dictionary / legal content blocks。

User Actions: 法務情報確認。

Empty State: なし。

### /privacy

Route: `/privacy`

Purpose: プライバシーポリシー。

Main Components: localized privacy content。

Required Data: i18n dictionary / legal content blocks。

User Actions: 個人情報取り扱い確認。

Empty State: なし。

### /legal

Route: `/legal`

Purpose: 法務情報 index。

Main Components: legal links、terms、privacy、tokusho links。

Required Data: i18n dictionary。

User Actions: 各法務ページへ遷移。

Empty State: なし。

### /changelog

Route: `/changelog`

Purpose: 更新履歴。

Main Components: changelog entries。

Required Data: i18n dictionary。

User Actions: 更新内容確認。

Empty State: なし。

### /login

Route: `/login`

Purpose: Supabase Auth ログイン。

Main Components: login form / auth controls。

Required Data: Supabase env。

User Actions: ログイン、ログアウト、dashboard へ遷移。

Empty State: auth env 未設定時は接続不可。

### /dashboard

Route: `/dashboard`

Purpose: 登録済みデータから KPI、改善、リスク、Demand Intelligence 概要を表示。

Main Components: KPI cards、recent improvements、risk alerts、Demand Intelligence summary。

Required Data: ads、LPs、pairs、analysis runs、outcomes、demand intelligence latest。

User Actions: 各詳細画面へ遷移。

Empty State: 登録データがない場合は空状態。

### /projects

Route: `/projects`

Purpose: プロジェクト一覧。

Main Components: project list、create / edit controls。

Required Data: `ad_projects`

User Actions: 作成、詳細表示、編集。

Empty State: project がない場合は作成導線。

### /ads

Route: `/ads`

Purpose: X 広告一覧。

Main Components: ad table、filters、create button。

Required Data: `twitter_ads`

User Actions: 新規登録、編集、削除、ペア作成へ接続。

Empty State: 広告がない場合は登録導線。

### /lps

Route: `/lps`

Purpose: LP 一覧。

Main Components: LP table、create button。

Required Data: `landing_pages`

User Actions: 新規登録、編集、削除。

Empty State: LP がない場合は登録導線。

### /pairs

Route: `/pairs`

Purpose: 広告 LP ペア一覧。

Main Components: pair list、analysis status、create button。

Required Data: `ad_lp_pairs`, `twitter_ads`, `landing_pages`

User Actions: ペア作成、詳細表示、編集、分析実行。

Empty State: pair がない場合は作成導線。

### /history

Route: `/history`

Purpose: 変更履歴一覧。

Main Components: history timeline / table。

Required Data: `change_history`

User Actions: 履歴確認。

Empty State: 履歴がない場合は空状態。

### /orchestration

Route: `/orchestration`

Purpose: AI agents、router runs、scorecards、recent AI proposals の管理。

Main Components: agent list、run list、scorecards、result list。

Required Data: `ai_agents`, `ai_orchestration_runs`, `ai_agent_results`, `ai_agent_scorecards`

User Actions: result decision、Codex task generation。

Empty State: AI run がない場合は空状態。

### /campaigns

Route: `/campaigns`

Purpose: 広告をキャンペーン名で集計。

Main Components: campaign cards、campaign table、metrics chart。

Required Data: `twitter_ads`

User Actions: campaign detail へ遷移。

Empty State: 広告がない場合は空状態。

### /improvements

Route: `/improvements`

Purpose: analysis_runs から改善提案一覧を表示。

Main Components: improvement cards、risk badges、detail links。

Required Data: `analysis_runs`

User Actions: 詳細確認。

Empty State: analysis run がない場合は空状態。

### /prs

Route: `/prs`

Purpose: PR レビュー管理。

Main Components: PR list。

Required Data: GitHub provider または memory provider。

User Actions: PR 状態確認。

Empty State: PR 接続または PR データがない場合は空配列。

### /settings

Route: `/settings`

Purpose: 設定画面。

Main Components: settings form、AI mode selector、account settings。

Required Data: local state / future persisted settings。

User Actions: AI mode 変更、設定入力。

Empty State: 一部設定は永続化未実装。

## 14. Internationalization

Status: Implemented（マーケティングサイトを中心に実装済み）

Supported locales:

```text
en
ja
```

Default:

```text
en
```

Browser locale:

- `navigator.language` が `ja` で始まる場合は `ja`
- それ以外は `en`

Persistence:

- localStorage key: `adflow-locale`
- values: `en`, `ja`

Language switcher:

- desktop header: `EN | 日本語`
- mobile: navigation menu 内に配置

Routing:

- locale route は作らない
- `/features`, `/pricing` など同一 route で辞書を切り替える

Translated areas:

- navigation
- footer
- hero sections
- pricing labels
- FAQ
- legal pages
- metadata title / description
- billing success / cancel

Current limitation:

- App 内部の一部管理画面には翻訳拡張余地が残る
- 一部 backend generated Japanese text に文字化けが残っている
- Demand Discovery Chat と Demand Intelligence の検索、Synthetic fallback、主要分析成果物は日本語 / 英語の両方に対応する

## 15. Pair Analysis Workflow

Status: Implemented（実装済み）

### Purpose

広告と LP を常にペアとして分析し、訴求整合性、CTA、オファー、ターゲット、変更履歴、Demand Intelligence、過去 outcome を踏まえた改善提案を生成する。

### Inputs

- ad headline
- ad body
- ad CTA
- landing page hero title
- landing page subtitle
- landing page CTA
- target audience
- offer
- change history
- Demand Intelligence context
- previous outcomes
- previous analysis runs
- AI mode
- locale

### Processing Steps

1. `ad_lp_pairs` から対象 pair を取得
2. `twitter_ads` と `landing_pages` を取得
3. `change_history` を取得
4. 最新 Demand Intelligence context を取得
5. previous outcomes を取得
6. `FeatureExtractor` で `hero_similarity`, `cta_strength`, `bounce_rate`, `ctr_trend` を算出
7. ad text と LP text から `message_match_score` を算出
8. `risk_level` を判定
9. AI Orchestration を実行
10. LLM structured output で `HistoryAwareRecommendation` を生成
11. ad improvements、LP improvements、diff plan、review result に変換
12. `analysis_runs` に保存
13. pair の `last_analyzed_at` を更新

### Outputs

- alignment score
- mismatch warnings
- CTA issues
- offer clarity issues
- target mismatch
- recommended improvements
- risk notes
- apply-ready suggestions
- ad improvements
- LP improvements
- diff plan
- review result

### Stored Data

- `analysis_runs`
- `ai_orchestration_runs`
- `ai_agent_results`
- `ai_agent_scorecards`
- `change_history` for decisions

### Failure Cases

- pair が存在しない
- ad または LP が存在しない
- OpenAI-only mode で OpenAI client 未設定
- クレジット不足
- LLM structured output failure
- Supabase insert / update failure

### Current Limitations

- 実広告媒体 API からの自動 metrics 取得は未実装
- AI diff plan は概念的差分であり、実ファイル適用は未実装
- message match は semantic embedding ではなく既存 feature extractor ベース

## 16. Demand Intelligence Engine

Status: Implemented（実装済み）

Demand Intelligence は `an evidence-based decision support system` です。成功予測、売上予測、需要確定ではありません。

Full pipeline:

```text
Source Collection
↓
Signal Normalization
↓
Pain / Desire / Complaint Extraction
↓
Embedding
↓
Clustering
↓
Signal Validation
↓
Root Cause Analysis
↓
Competitor Gap Detection
↓
Opportunity Discovery
↓
Solution Fit
↓
Demand Monitoring
↓
Search Demand
↓
Market Size Estimate
↓
Outcome Learning
↓
Pair Analysis Context
```

### Purpose

ネット上の不満、欲求、競合への不満、代替手段を構造化し、広告改善と LP 改善の文脈へ変換する。

### Inputs

- `project_id`
- `ad_lp_pair_id`
- `query`
- registered ad
- registered LP
- connector settings
- previous snapshots
- improvement outcomes
- locale

### Processing Steps

1. Source Query Builder が connector 別 query を作る
2. Connector Registry が利用可能 connector を選択
3. raw signals を収集
4. signals を正規化
5. pains / desires / churn reasons を抽出
6. deterministic embedding を保存
7. demand clusters を作成
8. competitor gap を生成
9. opportunities、features、positioning、ad appeals、LP context を生成
10. Signal Validation を実行
11. Solution Fit を実行
12. Demand Monitoring snapshot を作成
13. Search Demand を生成
14. Market Size estimate を生成
15. Outcome Learning を生成
16. summary を Pair Analysis context に統合

### Outputs

- demand intelligence summary
- evidence summary
- validation summary
- solution fit summary
- monitoring summary
- search demand summary
- market size summary
- outcome learning summary
- pair analysis context

### Stored Data

- `demand_intelligence_runs`
- `demand_intelligence_signals`
- `demand_intelligence_embeddings`
- `demand_intelligence_clusters`
- `demand_signal_validations`
- `demand_solution_fits`
- `demand_signal_snapshots`
- `demand_source_runs`
- `demand_connector_logs`
- `demand_search_signals`
- `demand_market_size_estimates`
- `demand_outcome_learning_links`

### Failure Cases

- connector API key missing: skipped として記録
- connector failure: failed として log 保存
- raw signal が少ない
- Supabase 保存失敗
- クレジット不足

### Current Limitations

- 本格クラスタリングではなく rule-based extraction と deterministic cluster
- embedding は hash-based fallback
- Search Demand と Market Size は外部実データではない参考値
- 日本語文言の一部に文字化けが残る

## 17. Signal Collection Algorithm

Status: Partially implemented（一部実装済み）

### Purpose

query、広告、LP から connector 別の検索語を作成し、実 source または synthetic fallback から signal を集める。

### Inputs

- user query
- ad headline / body / CTA
- LP hero / offer / target audience
- connector API keys
- max signals settings

### Processing Steps

1. `SourceQueryBuilder.build()` が source 別 query list を作る
2. `ConnectorRegistry.skipped_connectors()` が API key 未設定 connector を列挙
3. skipped connector を `demand_source_runs` に保存
4. selected connector を実行
5. result status を completed / partial / failed / skipped に正規化
6. signal と connector metadata を保存
7. error がある場合は `demand_connector_logs` に保存

### Outputs

- raw signals
- source status summary
- connector logs

### Stored Data

- `demand_source_runs`
- `demand_connector_logs`
- later: `demand_intelligence_signals`

### Failure Cases

- API key missing
- connector timeout
- connector API error
- no signals collected

### Current Limitations

- Google Custom Search で URL と検索スニペットを取得し、Firecrawl 設定時は上位 URL の本文を追加取得する
- X / Reddit は直接 API の必須依存にせず、Google の `site:x.com` / `site:reddit.com` 検索を補助ソースとして扱う
- Firecrawl 未設定または一部取得失敗時も、Google 検索結果のみで処理を継続する
- YouTube コメント取得、Google Suggest / PAA の実取得は未実装
- synthetic connector は実外部 source ではなく、実データが取れない場合のみ fallback として利用する

## 18. Signal Normalization Algorithm

Status: Implemented（実装済み）

### Purpose

raw signal を重複、ノイズ、広告らしさを評価できる形に正規化する。

### Inputs

- raw signals
- signal body
- engagement metadata

### Processing Steps

1. body を trim
2. replacement rules を適用
3. normalized text を lowercase して duplicate key 化
4. duplicate group ID を SHA-256 で生成
5. duplicate の場合は quality score を 0
6. text length と engagement から quality score を算出
7. text length から noise score を算出
8. ad-like pattern から spam score を算出

### Outputs

- normalized signals
- quality score
- noise score
- spam score
- duplicate group ID

### Stored Data

- `demand_intelligence_signals.metadata`
- `demand_intelligence_embeddings`

### Failure Cases

- body が空
- duplicate が多すぎる
- short text が多い

### Current Limitations

- language detection は限定的
- spam 判定は簡易ルール
- replacement rules の一部に文字化けが残る

## 19. Clustering Algorithm

Status: Implemented（簡易実装済み）

### Purpose

抽出された pain / desire を demand cluster として保存し、優先度順に並べる。

### Inputs

- normalized signals
- extracted pains
- extracted desires
- evidence signal indexes

### Processing Steps

1. pain と desire を別 cluster type として扱う
2. extracted item ごとに representative quotes を最大 3 件取得
3. evidence index 数から source count を計算
4. growth rate を簡易計算
5. trend label を設定
6. demand signal score を計算
7. persona ratios と root causes を付与
8. score 降順で sort

Score:

```text
demand_signal_score =
  min(100, round(
    count * 7
    + source_count * 8
    + intensity * 0.45
    + confidence * 20
  ))
```

### Outputs

- demand clusters
- demand signal score
- representative quotes
- root causes
- persona ratios

### Stored Data

- `demand_intelligence_clusters`

### Failure Cases

- extracted item がない
- evidence index が不正
- representative quote が不足

### Current Limitations

- 厳密な embedding clustering ではない
- 類似文の意味的統合は未実装
- persona 推定は rule-based

## 20. Signal Validation Algorithm

Status: Implemented（実装済み）

### Purpose

cluster を根拠としてどの程度信頼できるか評価する。

### Inputs

- signals
- clusters
- evidence signal indexes

### Processing Steps

1. cluster の evidence indexes から evidence signals を取得
2. source diversity を計算
3. duplicate ratio を計算
4. noise ratio / spam ratio を平均
5. recency score / continuity score を計算
6. validation score を算出
7. bias warnings を生成
8. strong / weak summary を作成

Score:

```text
validation_score =
  source_score
  + volume_score
  + recency_score
  + continuity_score
  + quality_score
  - duplicate_ratio * 15
  - spam_ratio * 20
```

### Outputs

- validation score
- confidence
- cross source confirmed
- source diversity
- duplicate / noise / spam ratio
- bias warnings

### Stored Data

- `demand_signal_validations`
- `demand_intelligence_clusters.validation_score`

### Failure Cases

- evidence signal が存在しない
- source diversity が低い
- duplicate / spam / noise が高い

### Current Limitations

- recency は実 timestamp 分布ではなく evidence count proxy
- continuity は source diversity proxy
- spam / noise 判定は簡易

## 21. Solution Fit Algorithm

Status: Implemented（実装済み）

### Purpose

広告、LP、ポジショニング、機能案、app idea が demand cluster の不満や欲求にどれだけ適合しているかを評価する。

### Inputs

- clusters
- ad text
- LP text
- positioning messages
- feature suggestions
- optional app idea text

### Processing Steps

1. target list を作る
2. target text と cluster text を token 化
3. token overlap を計算
4. similarity を算出
5. validation score を加味して fit score を算出
6. demand signal score と fit score の差から gap score を算出
7. matched / unmatched pains を分類
8. recommended adjustments を生成

Score:

```text
fit_score =
  min(100, similarity * 70 + validation_score * 0.25 + overlap_bonus)
gap_score =
  max(0, demand_signal_score - fit_score)
```

### Outputs

- fit score
- coverage score
- gap score
- matched pains
- unmatched pains
- recommended adjustments

### Stored Data

- `demand_solution_fits`

### Failure Cases

- target text が空
- cluster text が空
- token overlap がない

### Current Limitations

- semantic similarity ではなく token overlap
- 日本語の形態素解析は未実装
- fit score は成功予測ではない

## 22. Demand Monitoring Algorithm

Status: Implemented（実装済み）

### Purpose

需要クラスタの変化を snapshot として保存し、emerging / growing / stable / declining / spike / noise を分類する。

### Inputs

- current clusters
- validations
- solution fits
- previous snapshots

### Processing Steps

1. cluster と validation を対応付ける
2. cluster ごとの fit score 平均を計算
3. 同名 cluster の previous snapshot を探す
4. 7d / 30d / 90d growth を計算
5. validation score、noise ratio、continuity、growth から trend status を決める
6. summary を作る

Trend rules:

- `noise`: validation score < 35 または noise ratio >= 0.55
- `emerging`: previous snapshot なし、signal count >= 40、validation score >= 60
- `spike`: growth_30d >= 0.25 かつ continuity < 8
- `growing`: growth_30d >= 0.12
- `declining`: growth_30d <= -0.12
- `stable`: その他

### Outputs

- snapshots
- trend status
- growth values
- emerging / growing / noise summary

### Stored Data

- `demand_signal_snapshots`

### Failure Cases

- previous snapshot がない
- baseline が 0
- cluster name が変わる

### Current Limitations

- 同一 cluster 判定は name ベース
- date range filtering は限定的
- 実時系列集計は今後拡張対象

## 23. Search Demand Layer

Status: Implemented（参考スコアとして実装済み）

### Purpose

検索需要の方向性を参考スコアとして生成する。正確な検索ボリュームではない。

### Inputs

- query
- expanded queries
- clusters
- opportunities
- features

### Processing Steps

1. query、expanded queries、cluster name、opportunity name、feature name を統合
2. automation / comparison / review / alternative を追加
3. 重複 keyword を除外
4. token score を計算
5. intent marker score を計算
6. related keyword count を加味
7. keyword index による軽い減衰
8. score から volume estimate / competition / CPC estimate を生成

Score:

```text
search_demand_score =
  max(10, min(100,
    28 + token_score + intent_score + related_bonus - index
  ))
```

### Outputs

- search demand signals
- top search keywords
- low search warning
- high search opportunity

### Stored Data

- `demand_search_signals`

### Failure Cases

- keyword が少ない
- intent marker がない
- external search provider 未接続

### Current Limitations

- 実検索ボリュームではない
- Google Suggest / related search / PAA 実取得は未実装
- CPC は推定値

## 24. Market Size Estimation

Status: Implemented（参考レンジとして実装済み）

### Purpose

需要クラスタ、検索需要、validation、競合 gap、source diversity、persona spread から市場規模の参考レンジを生成する。

### Inputs

- clusters
- search signals
- solution fits
- competitor gaps

### Processing Steps

1. cluster name に近い search score を探す
2. pain signal score を取得
3. validation score を取得
4. fit score を取得
5. competitor gap score を取得
6. source diversity と persona spread を加点
7. trend bonus を加える
8. market score を 0 から 100 に丸める
9. audience min / max range を生成

Score:

```text
market_score =
  search_score * 0.26
  + pain_score * 0.24
  + validation_score * 0.18
  + gap_score * 0.16
  + source_diversity_score * 0.08
  + persona_spread_score * 0.04
  + fit_score * 0.04
  + trend_bonus
```

### Outputs

- market size score
- estimated audience min / max
- promising segments
- small market warnings
- persona market estimates

### Stored Data

- `demand_market_size_estimates`

### Failure Cases

- search signal が少ない
- validation score が低い
- competitor gap がない

### Current Limitations

- 売上予測ではない
- 実市場統計に接続していない
- audience range は参考値

## 25. Outcome Learning

Status: Implemented（実装済み）

### Purpose

改善後の実測 outcome を demand cluster に接続し、次回分析で成功、失敗、保留パターンとして参照する。

### Inputs

- clusters
- improvement outcomes
- search signals
- market estimates

### Processing Steps

1. outcome title / description / summary / notes を結合
2. cluster name と token overlap で nearest cluster を探す
3. explicit outcome status があれば優先
4. metric delta から learning status を推定
5. market score と search demand score を付与
6. learning summary を作る
7. positive / negative / inconclusive patterns を summary 化
8. recommended next tests を生成

### Outputs

- outcome learning links
- validated demand patterns
- failed demand patterns
- inconclusive demand patterns
- recommended next tests

### Stored Data

- `demand_outcome_learning_links`
- `improvement_outcomes`

### Failure Cases

- outcome がない
- metric_delta がない
- nearest cluster が曖昧

### Current Limitations

- cluster linking は token overlap
- metric 判定は控えめな rule-based
- 将来成功の保証ではない

## 26. Evidence Explorer

Status: Implemented（実装済み）

### Purpose

AI や summary の結論から元 signal、cluster、validation、source run に戻れるようにする。

### Inputs

- run ID
- clusters
- signals
- validations
- source runs

### Processing Steps

1. run に紐づく signals を取得
2. cluster evidence signal indexes を参照
3. representative quotes を表示
4. source type / source run / connector log を表示
5. validation score と warnings を並べる

### Outputs

- evidence list
- source references
- cluster references
- validation warnings

### Stored Data

- `demand_intelligence_signals`
- `demand_intelligence_clusters`
- `demand_signal_validations`
- `demand_source_runs`
- `demand_connector_logs`

### Failure Cases

- evidence index が不正
- signal が削除済み
- source URL がない

### Current Limitations

- filter / search / source 別詳細表示は今後拡張
- synthetic signal は実外部ソースではない

## 27. AI Orchestration

Status: Implemented（実装済み）

AI Orchestration は、AI agent を役割別に選び、提案、LP review、risk review、implementation plan を分離して保存します。

Multi-provider mode:

- X / Twitter: `grok_x_copywriter`
- Google / Search: `gemini_search_intent`
- LP review: `chatgpt_lp_reviewer`
- Risk review: `chatgpt_risk_reviewer`
- Implementation: `codex_implementation`

OpenAI-only mode:

- `openai_pair_strategy`
- `openai_lp_review`
- `openai_risk_review`
- `openai_implementation_plan`

Scorecard:

```text
router_score =
  accepted_count * 2
  + apply_ready_count * 3
  - rejected_count * 1.5
  + avg_confidence
  - avg_risk
```

Stored Data:

- `ai_agents`
- `ai_orchestration_runs`
- `ai_agent_results`
- `ai_agent_scorecards`

## 28. Codex Task Generation

Status: Implemented（実装済み）

Codex task は `decision_status == apply_ready` の AI result からのみ生成できます。

Inputs:

- AI result ID
- AI result output
- project ID
- pair ID

Outputs:

- title
- target files hint
- implementation goal
- constraints
- acceptance criteria
- source AI result ID

Stored Data:

- `codex_task_prompts`

Failure Cases:

- AI result が存在しない
- decision status が `apply_ready` ではない
- クレジット不足

## 29. Improvement Outcome Tracking

Status: Implemented（実装済み）

改善結果を before / after metrics として保存し、metric delta、outcome status、learning notes を次回分析に渡します。

Inputs:

- pair ID
- source AI result ID
- source Codex task ID
- before metrics
- after metrics
- implemented_at
- measured_at

Outputs:

- metric_delta
- outcome_status
- outcome_summary
- learning_notes

Stored Data:

- `improvement_outcomes`

Status values:

- pending
- implemented
- measured
- positive
- neutral
- negative
- inconclusive

## 30. Error Handling

Status: Partially implemented（一部実装済み）

Backend:

- invalid `ai_mode`: ValueError
- OpenAI-only mode without OpenAI client: ValueError
- no analysis run found: ValueError
- invalid decision status: ValueError
- non-apply-ready Codex task generation: ValueError
- insufficient credits: `INSUFFICIENT_CREDITS`
- connector failure: log and continue where possible

Frontend:

- loading states
- empty states
- toast messages
- checkout failure redirect / cancel page

Current limitations:

- provider ごとの詳細エラー表示は限定的
- backend error response schema は統一余地あり
- 一部 UI の validation message は拡張余地あり

## 31. Security Requirements

Status: Partially implemented（一部実装済み）

Implemented:

- Supabase Auth
- Bearer token backend auth
- RLS policies
- user_id based repository access
- Stripe webhook secret verification
- service role only credit mutation RPC
- no client-side secret key usage

Requirements:

- `SUPABASE_SERVICE_ROLE_KEY` は backend / server route のみ
- `STRIPE_SECRET_KEY` は server route のみ
- `STRIPE_WEBHOOK_SECRET` は webhook verification のみ
- client には publishable key のみ公開
- user_id を client request body から信頼しない

Current limitations:

- team / organization role permission は未実装
- audit log は change_history と credit_transactions に分かれている
- rate limit 永続化は未実装

## 32. Environment Variables

Status: Implemented（主要 env は実装済み）

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

ADFLOW_AI_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=

GROK_API_KEY=
GROK_MODEL=

GEMINI_API_KEY=
GEMINI_MODEL=

ADFLOW_GITHUB_PROVIDER=memory
GITHUB_REPOSITORY=
GITHUB_TOKEN=

ADFLOW_STORAGE_PROVIDER=memory
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ADFLOW_SUPABASE_TABLE=adflow_runs

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

STRIPE_PRICE_STARTER_MONTHLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_BUSINESS_MONTHLY=
STRIPE_PRICE_CREDIT_1000=
STRIPE_PRICE_CREDIT_5000=
STRIPE_PRICE_CREDIT_20000=
STRIPE_PRICE_CREDIT_50000=

STRIPE_PRICE_STARTER_MONTHLY_USD=
STRIPE_PRICE_PRO_MONTHLY_USD=
STRIPE_PRICE_BUSINESS_MONTHLY_USD=
STRIPE_PRICE_CREDIT_1000_USD=
STRIPE_PRICE_CREDIT_5000_USD=
STRIPE_PRICE_CREDIT_20000_USD=
STRIPE_PRICE_CREDIT_50000_USD=

DEMAND_REAL_SOURCES_ENABLED=true
DEMAND_SYNTHETIC_FALLBACK=true
DEMAND_MAX_SIGNALS_PER_RUN=5000
DEMAND_MAX_SIGNALS_PER_SOURCE=1000
DEMAND_CONNECTOR_TIMEOUT_SECONDS=20
DEMAND_CONNECTOR_MAX_RETRIES=2
DEMAND_EMBEDDING_PROVIDER=deterministic
DEMAND_EMBEDDING_MODEL=deterministic-hash-embedding.v1

X_API_BEARER_TOKEN=
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=
FIRECRAWL_API_KEY=
FIRECRAWL_MAX_URLS_PER_RUN=8
FIRECRAWL_MAX_AGE_MS=172800000
FIRECRAWL_TIMEOUT_MS=60000
```

## 33. Current Implementation Status

Status: Implemented（現状整理）

Implemented:

- Supabase Auth
- Backend Bearer auth
- Registered entities
- Project UI
- X Ads CRUD
- LP CRUD
- LP versioning
- Ad LP Pair CRUD
- Change history
- Pair Analysis
- Demand Intelligence
- Signal Validation
- Solution Fit
- Demand Monitoring
- Search Demand
- Market Size Estimate
- Outcome Learning
- Evidence Explorer
- AI Orchestration
- AI comparison
- AI scorecards
- Codex task prompt
- Improvement Outcomes
- Credit Billing
- Stripe Checkout
- JPY / USD pricing
- Marketing i18n

Partially implemented:

- Real source connectors
- GitHub PR workflow
- Settings persistence
- Marketing / app-wide translation coverage
- Provider-specific error UI

Not implemented:

- Real X Ads API integration
- Real Google Ads API integration
- Full crawler
- Real embedding provider integration
- Real search volume provider integration
- Automatic A/B test tracking
- Automatic PR creation UI
- Automatic file diff application

## 34. Known Limitations

Status: Documented（既知制限として文書化）

- Demand Intelligence は需要や成功を断定しない
- synthetic fallback は実外部 source ではない
- Search Demand は実検索量ではない
- Market Size は市場規模確定や売上予測ではない
- Outcome Learning は将来成功保証ではない
- hash embedding は意味ベクトルではない
- clustering は rule-based
- 一部 backend generated Japanese text に文字化けが残っている
- backend dependency file は整備余地あり
- テストは今後追加が必要

## 35. Future Roadmap

Status: Not implemented（今後の拡張）

Roadmap:

- 実 X Ads API 連携
- 実 Google Ads API 連携
- Yahoo 知恵袋、Amazon、楽天、価格.com、App Store、Google Play connector
- Reddit OAuth 検索
- Google Suggest / related search / People Also Ask 実取得
- YouTube コメント paging 強化
- 外部 source crawler
- 実 embedding provider
- 実検索 volume provider
- Market Size 外部統計連携
- Outcome Feedback Learning 自動重み付け
- 本格 clustering algorithm
- 時系列 trend aggregation
- spam / bot 判定強化
- Evidence Explorer filter / search
- connector rate limit persistence
- app-wide full i18n
- A/B test tracking
- AI diff 実ファイル適用
- GitHub branch / commit / PR UI
- Settings persistence
- automated tests

## 36. Acceptance Criteria

この仕様書の受け入れ条件:

- Status: Implemented（実装済み）このファイル `docs/adflow-ai-complete-spec.md` が存在する
- Status: Implemented（実装済み）36 セクションをすべて含む
- Status: Implemented（実装済み）主要ページ、API、DB、アルゴリズム、Billing、i18n を含む
- Status: Implemented（実装済み）各アルゴリズムに Purpose / Inputs / Processing Steps / Outputs / Stored Data / Failure Cases / Current Limitations を含む
- Status: Implemented（実装済み）Demand Intelligence を evidence-based decision support system として説明している
- Status: Implemented（実装済み）需要保証、売上予測、成功予測として説明していない
- Status: Implemented（実装済み）未実装または一部実装の項目を明示している
- Status: Implemented（実装済み）既存アプリケーション挙動は変更していない
