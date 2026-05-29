# AdFlow AI プロジェクトブリーフ

`AdFlow AI` は、広告とランディングページ（LP）をひとつの改善単位として登録し、分析、変更履歴、AI提案、レビュー、Codex実装タスク化までを扱う広告改善オペレーションツールです。

単なる広告文生成ツールではなく、広告とLPの整合性、過去の編集履歴、AIごとの役割分担、AI提案の採否判断、将来のPR化までを一連のワークフローとして管理します。

現在は、複数AIを役割別に使い分ける `AI OS` モードと、OpenAI API だけでLLM分析を走らせる `OpenAI API only` モードの2系統を持ちます。AI実行モードはSettingsのアカウントAI設定で切り替えます。デフォルトは `OpenAI API only` です。

さらに、広告改善前段の仮説形成レイヤとして `Market Research Layer` を持ちます。これは需要の有無や成功可否を断定する機能ではなく、課題、競合、検索意図、市場ギャップなどの判断材料を構造化して保存し、広告分析・LP分析・改善提案のコンテキストとして利用する機能です。

加えて、AI提案を出して終わりにしないための `Improvement Outcome Tracking` を持ちます。AI提案、Codex task、実装前後の指標、測定結果、学習メモを保存し、次回分析へ反映する閉ループを作ります。

## プロダクトの目的

- 広告とLPを別々ではなく、必ずペアとして評価する
- X広告の訴求、LPファーストビュー、CTA、オファー、ターゲットの整合性を確認する
- 作成、編集、削除の履歴を保存し、AI分析時の文脈に含める
- AIの提案とレビューを分離し、提案をそのまま実装しない
- AIごとの結果を比較し、人間が採否を決められるようにする
- `apply_ready` になった提案だけを Codex 実装タスクプロンプトに変換する
- 将来的にA/Bテスト、実広告API、GitHub PR作成へ拡張できる土台を作る
- 広告改善前に市場調査を実行し、市場の反応、SNS上の不満、競合、検索意図を分析コンテキストへ加える
- 採用・実装した改善の結果を記録し、次回分析に成功/失敗/保留パターンとして反映する

## 中核コンセプト

### 1. 広告とLPはペアで見る

広告だけを改善しても、クリック後のLPと約束がずれていればCVRや直帰率が悪化します。このため、AdFlow AIでは `twitter_ads` と `landing_pages` を `ad_lp_pairs` として紐づけ、ペア単位で分析します。

評価対象:

- 広告見出し
- 広告本文
- 広告CTA
- LPヒーロータイトル
- LPヒーローサブタイトル
- LPプライマリCTA
- LPセカンダリCTA
- オファーテキスト
- ターゲットユーザー
- 直帰率、滞在時間、スクロール深度、ページ速度などのLP指標

### 2. 変更履歴をAIに渡す

広告、LP、ペアの作成・更新・削除は `change_history` に保存されます。分析時には対象ペアに関連する履歴を取得し、AIが「最近何が変わったか」「頻繁に変わっている項目は何か」を考慮できるようにします。

これにより、AI提案は単発の文章生成ではなく、過去の変更を踏まえた仮説になります。

### 3. AI提案とレビューを分離する

提案生成AIとリスクレビューAIを分けます。広告文・LP改善案を出すAIと、誇大表現、ブランドリスク、実装リスクを見るAIを分離することで、即時反映ではなくレビュー前提の運用にします。

### 4. 2つのAI実行モード

現在の分析実行には2つのモードがあります。

#### AI OS router

複数AIを役割別に使い分けるモードです。

- X/Twitter広告改善は Grok 担当
- Google検索意図や検索広告系は Gemini 担当
- LPレビュー、履歴分析、リスクレビューは OpenAI/ChatGPT 担当
- 実装計画や差分化は Codex 担当

未設定または失敗したproviderは、同じスキーマのmock fallbackに切り替わります。

#### OpenAI API only

OpenAI APIだけで分析を走らせるモードです。

- メインの履歴考慮型レコメンドを OpenAI structured output で生成する
- AI orchestration の各ステップも OpenAI provider に固定する
- `openai_pair_strategy`
- `openai_lp_review`
- `openai_risk_review`
- 必要に応じて `openai_implementation_plan`

このモードがデフォルトです。OpenAI APIが必須で、`OPENAI_API_KEY` と `OPENAI_MODEL` が未設定の場合はmock fallbackに逃がさず、エラーを返します。

### 5. 採否判断とスコアカード

AI提案は `ai_agent_results` に保存されます。ユーザーは結果に対して以下の判断を付けられます。

- `pending`
- `accepted`
- `rejected`
- `needs_review`
- `apply_ready`

判断結果は `ai_agent_scorecards` に反映され、AI agentごとの信頼度や採用状況を比較できます。

### 6. Codex task prompt

`apply_ready` になったAI提案だけ、Codex向けの実装タスクプロンプトに変換できます。生成されたタスクは `codex_task_prompts` に保存されます。

Codex task promptには以下が含まれます。

- タイトル
- 対象ファイルのヒント
- 実装ゴール
- 制約
- 受け入れ条件
- 元になったAI result ID

### 7. Market Research Layer

Market Researchは、広告改善レイヤではなく広告改善前段の仮説形成レイヤです。

目的:

- 広告改善前に市場の反応を把握する
- LPと市場ニーズのズレを検出する
- SNS上の課題や不満を収集する
- 競合分析を行う
- 検索意図や関連キーワードを整理する
- AI分析時のコンテキストとして利用する

禁止事項:

- 需要あり/需要なしの断定
- 成功/失敗の断定
- 売上予測
- 市場規模や需要を確定的に扱うこと

代わりに扱うもの:

- 課題
- 競合
- 検索意図
- 市場ギャップ
- ポジショニング仮説

### 8. Improvement Outcome Tracking

Improvement Outcome Trackingは、AI提案後の実装結果を記録し、次回分析に反映するための閉ループ機能です。

流れ:

```text
広告分析
↓
AI提案
↓
採用
↓
実装
↓
再計測
↓
結果記録
↓
次回分析に反映
```

対象:

- AI提案
- Codex task prompt
- 広告LPペア
- 分析実行
- 実装前後の指標

保存するもの:

- before_metrics
- after_metrics
- metric_delta
- outcome_status
- outcome_summary
- learning_notes

outcomeは実測値ベースで扱います。AI提案の成功を事前断定せず、測定済みデータから「positive」「neutral」「negative」「inconclusive」などの状態を付けます。

## 主な機能

### 認証

- Supabase Authによるログイン
- フロントエンドはSupabase browser clientでセッションを取得
- バックエンドAPIはBearer tokenを検証
- Supabaseのuser IDを使ってユーザー別データを分離

### プロジェクト管理

- 広告、LP、ペアをプロジェクトに紐づけ可能
- プロジェクト一覧表示
- プロジェクト詳細表示
- プロジェクト単位で改善対象を整理

### X広告管理

- X広告の一覧表示
- X広告の新規登録
- X広告の編集
- X広告の削除
- 広告名、キャンペーン名、広告グループ名を管理
- 見出し、本文、CTA、遷移先URLを管理
- 画像URL、動画URLを管理
- impressions、clicks、conversions、spend、CTR、CPC、CVRを管理
- statusを管理

### LP管理

- LP一覧表示
- LP新規登録
- LP編集
- LP削除
- LP名、URLを管理
- ヒーロータイトル、ヒーローサブタイトルを管理
- プライマリCTA、セカンダリCTAを管理
- オファーテキストを管理
- ターゲットオーディエンスを管理
- bounce_rate、session_duration、scroll_depthを管理
- page_speed、FCP、LCPを管理
- notesを管理

### LPバージョン管理

- LP作成・更新時にスナップショットを保存
- `landing_page_versions` にversion_number付きで保存
- 変更概要を保存
- ペア詳細画面でLP version timelineを確認可能

### 広告LPペア管理

- X広告とLPをペアとして登録
- ペア一覧表示
- ペア詳細表示
- ペア編集
- ペア削除
- ペアごとに分析を実行
- 最終分析日時を保存
- ペア詳細画面で広告、LP、分析結果、履歴、AI OSログをまとめて確認

### ペア分析

ペア分析では以下を行います。

- 対象ペアの広告データ取得
- 対象ペアのLPデータ取得
- 対象ペアに関連する変更履歴取得
- 最新のMarket Research取得
- 最新および過去のImprovement Outcomes取得
- 過去の分析結果取得
- 広告・LPの特徴量抽出
- message match score算出
- risk level算出
- 総合score算出
- AI orchestration実行
- 履歴考慮型AI推薦生成
- 市場調査を含むAI推薦生成
- 過去outcomeを含むAI推薦生成
- 広告改善案生成
- LP改善案生成
- diff plan生成
- review result生成
- `analysis_runs` に保存
- ペアの `last_analyzed_at` 更新

### Market Research

Market Researchはprojectまたはad_lp_pairに紐づく調査runとして保存されます。

実行パイプライン:

```text
query
↓
competitor collection
↓
social collection
↓
search collection
↓
insight generation
↓
summary generation
↓
storage
```

保存するsummary:

- market_overview
- main_pain_points
- main_competitors
- opportunities
- warnings
- positioning_gaps
- social_research
- search_research
- competitor_research

保存するsource types:

- twitter
- reddit
- search
- competitor
- review
- forum
- youtube

Phase 1では外部SNS/APIの実取得ではなく、queryとペア情報から市場判断材料を構造化して保存します。需要判定や成功予測は行いません。

### Improvement Outcomes

Improvement Outcomesは、採用・実装した改善の測定結果を保存します。

主な操作:

- outcome作成
- outcome一覧取得
- latest outcome取得
- outcome更新
- before/after metrics保存
- metric_delta自動計算
- outcome_summary自動生成
- AI resultからoutcome draft生成
- Codex task promptからoutcome draft生成

outcome_status:

- pending
- implemented
- measured
- positive
- neutral
- negative
- inconclusive

metric_delta例:

- ctr_delta
- ctr_delta_rate
- cvr_delta
- cvr_delta_rate
- bounce_rate_delta
- session_duration_delta
- spend_delta

判定ルールは控えめです。CTR上昇かつCVR維持以上ならpositive、CTRとCVRが共に低下すればnegative、データ不足や混在した結果はneutralまたはinconclusiveとして扱います。

### 特徴量抽出

`FeatureExtractor` が広告とLPから分析用特徴量を作ります。

- CTR trend
- hero similarity
- CTA strength
- bounce rate

message match scoreは広告側テキストとLP側テキストを比較して算出します。

広告側:

- headline
- body
- cta

LP側:

- hero_title
- hero_subtitle
- primary_cta
- offer_text
- target_audience

### 履歴考慮型AI推薦

`HistoryAwareRecommendation` として構造化保存します。

含まれる内容:

- overall_diagnosis
- likely_problem
- history_based_insights
- ad_recommendations
- lp_recommendations
- do_not_change
- next_test_plan
- ai_mode
- orchestration_run_id
- route_plan
- agent_results

### 広告改善案

AI推薦から広告向け改善案を生成します。

- problems
- suggestions
- headlines
- bodies
- ctas

### LP改善案

AI推薦からLP向け改善案を生成します。

- hero
- cta
- faq
- structure
- mobile_ui

### Diff plan

AI推薦を、将来的な実装差分に近い形へ変換します。

- file path
- before
- after

現在は登録済み広告LPペアの概念的な差分として保存されます。

### Review result

AI推薦をレビュー観点で整理します。

- exaggerated_claims
- brand_risks
- ui_risks
- dangerous_changes
- approved_for_pr

### AI Orchestration

AI orchestrationは、どのAI agentにどのタスクを振るかを決め、実行結果を保存する層です。

保存されるもの:

- orchestration run
- route plan
- route reason
- agent results
- provider
- role
- task
- input summary
- output
- score
- risk level
- confidence
- predicted effect
- decision status

### AI OS Router

`RuleBasedAIRouter` がplatformとobjectiveに応じてAI agentを選びます。

X/Twitter系:

- `twitter_ad_improvement` -> `grok_x_copywriter`
- `lp_review` -> `chatgpt_lp_reviewer`
- `risk_review` -> `chatgpt_risk_reviewer`
- implementation/diff系objectiveの場合は `implementation_plan` -> `codex_implementation`

Google/search系:

- `google_ad_improvement` -> `gemini_search_intent`
- `lp_review` -> `chatgpt_lp_reviewer`
- `risk_review` -> `chatgpt_risk_reviewer`

不明platform:

- `analytics_diagnosis` -> `chatgpt_lp_reviewer`
- `lp_review` -> `chatgpt_lp_reviewer`
- `risk_review` -> `chatgpt_risk_reviewer`

### OpenAI-only Router

`OpenAIOnlyAIRouter` はすべてのタスクをOpenAI providerに固定します。

route plan:

- `openai_pair_strategy`
- `openai_lp_review`
- `openai_risk_review`
- `openai_implementation_plan`

agent:

- `openai_direct_strategist`

provider:

- `openai`

role:

- `openai_direct_analysis`

router version:

- `openai-only.v1`

### Provider registry

`AIProviderRegistry` がprovider keyから実行providerを返します。

登録provider:

- `mock`
- `grok`
- `gemini`
- `openai`
- `chatgpt`
- `codex`

`chatgpt` は OpenAI provider を使います。`codex` は現状mock providerです。

### OpenAI structured output

OpenAI APIは `OpenAIJSONClient` 経由で structured output を使用します。

用途:

- workflow系LLM処理
- 履歴考慮型推薦
- OpenAI-only modeの推薦生成
- OpenAI-only modeのagent output生成

`OpenAIJSONClient` はOpenAI Responses APIのparse機能を使い、Pydantic modelに合うJSONを返します。

### Mock fallback

AI OS routerモードでは、Grok/Gemini/OpenAI providerが未設定または失敗した場合、mock providerが同じスキーマで結果を返します。

ただし、OpenAI API onlyモードではOpenAI接続が必須です。OpenAI接続失敗時にmock fallbackは使いません。

### AI proposal comparison

ペア詳細画面では、最新分析に紐づくAI agent resultsを比較できます。

表示内容:

- agent key
- provider
- role
- task
- risk
- confidence
- summary
- recommendations
- message match
- score
- generated at
- decision status

操作:

- accepted
- rejected
- needs_review
- apply_ready
- Generate Codex Task

### AI scorecards

AI agentの過去結果をスコアカード化します。

指標:

- sample_count
- average_score
- accepted_count
- rejected_count
- apply_ready_count
- avg_confidence
- avg_risk
- estimated_ctr_lift
- estimated_cvr_lift
- estimated_bounce_reduction
- router_score
- last_result_id

routerはscorecardを参照してroute planを並べ替えます。

### Change history

主要エンティティの変更履歴を保存します。

対象:

- ad_project
- twitter_ad
- landing_page
- ad_lp_pair
- ai_agent_result

保存内容:

- entity_type
- entity_id
- action
- before_data
- after_data
- summary
- reason
- created_at

AI resultの採否判断もchange historyに保存されます。

### Dashboard

ダッシュボードでは、KPI、最近の改善、未処理PR、リスクアラートなどの運用画面を想定したUIがあります。

主な構成:

- KPI card
- metrics chart
- recent improvements
- pending PR list
- risk alerts

### Campaigns

キャンペーン画面では広告キャンペーンの分析・可視化UIがあります。

主な構成:

- Campaign metric cards
- Campaign table
- Campaign trend chart
- Ad creative preview
- Campaign detail

### LP Analysis

既存のLP分析画面があります。

主な構成:

- LP performance cards
- LP summary card
- LP issue list

### Improvements

改善提案一覧・詳細画面があります。

主な構成:

- Improvement list
- Improvement card
- Improvement detail
- Diff viewer
- Review warnings
- Approval dialog

### PR Reviews

PRレビュー管理画面があります。

主な構成:

- PR一覧
- PRレビュー状況の確認
- 改善ループの一部としてのPR確認

### Settings

設定画面があります。

主な構成:

- Settings form
- 接続情報や設定の入力UI

現状、すべての設定が永続化済みとは限りません。

## 画面一覧

- `/login`: ログイン
- `/`: ダッシュボードへ誘導
- `/dashboard`: KPI、改善、リスク、PR状況
- `/projects`: プロジェクト一覧
- `/projects/[projectId]`: プロジェクト詳細
- `/ads`: X広告一覧
- `/ads/new`: X広告登録
- `/ads/[adId]/edit`: X広告編集
- `/lps`: LP一覧
- `/lps/new`: LP登録
- `/lps/[lpId]/edit`: LP編集
- `/pairs`: 広告LPペア一覧
- `/pairs/new`: 広告LPペア作成
- `/pairs/[pairId]`: ペア詳細、分析、AI比較、履歴、LPバージョン、AI OSログ
- `/pairs/[pairId]/edit`: ペア編集
- `/history`: 変更履歴一覧
- `/orchestration`: AI agents、router runs、scorecards、recent AI proposals
- `/campaigns`: キャンペーン一覧・指標
- `/campaigns/[campaignId]`: キャンペーン詳細
- `/lp`: LP分析
- `/improvements`: 改善提案一覧
- `/improvements/[improvementId]`: 改善提案詳細
- `/prs`: PRレビュー
- `/settings`: 設定

### Settings

`/settings` では接続設定に加えて、アカウント単位のAI実行モードを切り替えます。

AI mode:

- OpenAI only
- Multi AI

初期値:

- OpenAI only

## ペア詳細画面のタブ

`/pairs/[pairId]` には以下のタブがあります。

- Overview
- Analysis
- AI Comparison
- Market Research
- Outcomes
- Versions
- History
- AI OS
- AI Recommendations

### Overview

対象広告と対象LPを並べて確認します。

広告側:

- name
- headline
- body
- CTA

LP側:

- name
- hero title
- hero subtitle
- primary CTA

### Analysis

過去の分析実行結果を一覧表示します。

表示内容:

- created_at
- risk_level
- score
- hero_similarity
- cta_strength
- bounce_rate

### AI Comparison

AI agentごとの提案を比較し、採否判断を行います。

### Market Research

ペア単位の市場調査を実行・確認します。

表示内容:

- Overview
- Pain Points
- Competitors
- Opportunities
- Warnings
- Source Signals

操作:

- query入力
- Market Research実行

### Outcomes

改善結果を一覧・作成・編集します。

表示内容:

- status
- title
- implemented_at
- measured_at
- CTR差分
- CVR差分
- Bounce rate差分
- outcome_summary
- learning_notes

操作:

- outcome作成
- before metrics入力
- after metrics入力
- measuredへ更新
- learning_notes保存

### Versions

LP version timelineを表示します。

表示内容:

- version_number
- created_at
- change_summary
- snapshot fields

### History

対象ペアに関連する変更履歴を表示します。

### AI OS

分析時に保存されたagent resultsを表示します。

### AI Recommendations

履歴考慮型AI推薦の内容を表示します。

## UIでのAIモード切り替え

Settings画面の `Account AI settings` に、AI実行モード切り替えがあります。設定はローカルに保存され、Pair Analysis実行時に参照されます。

選択肢:

- `OpenAI`: OpenAI APIのみを使う
- `Multi AI`: 複数providerをrouterで使い分ける

デフォルトは `OpenAI` です。ペア詳細画面とペア一覧画面の `Run analysis` / `Analyze` は、このアカウント設定を使ってAPIへ `ai_mode` を送信します。

送信payload:

```json
{
  "ai_mode": "multi_provider"
}
```

または:

```json
{
  "ai_mode": "openai_only"
}
```

最新分析結果には `history_insights.ai_mode` が保存され、画面上でも現在の分析routeとして表示されます。

## API

### Health

- `GET /health`

ヘルスチェック用。戻り値:

```json
{
  "status": "ok"
}
```

### Workflow

- `POST /workflow/run`

既存のワークフロー実行用APIです。

実行内容:

- ad collection
- LP collection
- feature extraction
- ad improvement
- LP improvement
- diff service
- review service
- storage
- PR service

### Pair analysis

- `POST /analysis/pairs/{pair_id}/run`
- `GET /analysis/pairs/{pair_id}/runs`
- `GET /analysis/pairs/{pair_id}/latest`

`POST /analysis/pairs/{pair_id}/run` はBearer token必須です。

request body:

```json
{
  "ai_mode": "multi_provider"
}
```

`ai_mode`:

- `multi_provider`
- `openai_only`

省略時は `multi_provider` です。

### Market research

- `POST /market-research/run`
- `GET /market-research/pairs/{pair_id}/latest`
- `GET /market-research/pairs/{pair_id}/runs`

すべてBearer token必須です。

request body:

```json
{
  "project_id": "...",
  "ad_lp_pair_id": "...",
  "query": "route planning app"
}
```

response:

```json
{
  "run_id": "...",
  "status": "completed"
}
```

### Improvement outcomes

- `POST /outcomes`
- `GET /outcomes/pairs/{pair_id}`
- `GET /outcomes/pairs/{pair_id}/latest`
- `PATCH /outcomes/{outcome_id}`
- `POST /orchestration/results/{result_id}/outcome`
- `POST /orchestration/codex-tasks/{task_id}/outcome`

すべてBearer token必須です。

create request:

```json
{
  "project_id": "...",
  "ad_lp_pair_id": "...",
  "source_ai_result_id": "...",
  "source_codex_task_id": "...",
  "title": "Hero CTA improvement",
  "description": "Changed LP primary CTA based on AI recommendation.",
  "before_metrics": {},
  "after_metrics": {}
}
```

update request:

```json
{
  "implemented_at": "...",
  "measured_at": "...",
  "before_metrics": {},
  "after_metrics": {},
  "outcome_status": "measured",
  "outcome_summary": "...",
  "learning_notes": "..."
}
```

### AI orchestration

- `GET /orchestration/agents`
- `GET /orchestration/runs`
- `GET /orchestration/runs/{run_id}/results`
- `GET /orchestration/scorecards`
- `POST /orchestration/results/{result_id}/decision`
- `POST /orchestration/results/{result_id}/codex-task`

すべてBearer token必須です。

#### Decision request

```json
{
  "decision_status": "apply_ready",
  "decision_reason": "Marked apply_ready from pair detail."
}
```

許可される `decision_status`:

- `pending`
- `accepted`
- `rejected`
- `needs_review`
- `apply_ready`

## DB

### Registered entities

- `ad_projects`
- `twitter_ads`
- `landing_pages`
- `ad_lp_pairs`
- `change_history`
- `analysis_runs`
- `landing_page_versions`

### AI orchestration

- `ai_agents`
- `ai_orchestration_runs`
- `ai_agent_results`
- `ai_agent_scorecards`
- `codex_task_prompts`

### Market research

- `market_research_runs`
- `market_research_sources`
- `market_research_insights`

### Improvement outcomes

- `improvement_outcomes`

### RLS

全テーブルはユーザー別データ分離を前提とします。

基本方針:

```sql
auth.uid() = user_id
```

### Migration files

- `supabase/migrations/202605280001_registered_adflow_entities.sql`
- `supabase/migrations/202605280002_ai_orchestration_os.sql`
- `supabase/migrations/202605280003_decisions_lp_versions_codex_tasks.sql`
- `supabase/migrations/202605280004_market_research_layer.sql`
- `supabase/migrations/202605280005_improvement_outcomes.sql`

## 主要データモデル

### AnalysisRun

- id
- user_id
- project_id
- ad_lp_pair_id
- score
- ctr_trend
- hero_similarity
- cta_strength
- bounce_rate
- risk_level
- ad_improvements
- lp_improvements
- diff_plan
- review_result
- history_insights
- created_at

### AIHistoryBasedRecommendation

- ai_mode
- overall_diagnosis
- likely_problem
- history_based_insights
- ad_recommendations
- lp_recommendations
- do_not_change
- next_test_plan
- market_insights
- competitor_summary
- pain_point_alignment
- positioning_opportunities
- market_alignment_score
- market_fit_analysis
- recommended_positioning
- market_opportunities
- market_research_run_id
- outcome_insights
- successful_improvement_patterns
- failed_improvement_patterns
- outcome_based_warnings
- recommended_next_measurement
- orchestration_run_id
- route_plan
- agent_results

### AIAgent

- id
- user_id
- agent_key
- display_name
- provider
- role
- strengths
- default_tasks
- is_enabled
- created_at
- updated_at

### AIOrchestrationRun

- id
- user_id
- project_id
- ad_lp_pair_id
- platform
- objective
- router_version
- route_plan
- route_reason
- status
- created_at
- completed_at

### AIAgentResult

- id
- user_id
- project_id
- orchestration_run_id
- ad_lp_pair_id
- agent_key
- provider
- role
- task
- input_summary
- output
- score
- risk_level
- decision_status
- decision_reason
- decided_at
- accepted_by
- confidence
- predicted_effect
- status
- created_at

### AIAgentScorecard

- id
- user_id
- agent_key
- provider
- platform
- metric
- sample_count
- average_score
- accepted_count
- rejected_count
- apply_ready_count
- avg_confidence
- avg_risk
- estimated_ctr_lift
- estimated_cvr_lift
- estimated_bounce_reduction
- router_score
- last_result_id
- updated_at

### CodexTaskPrompt

- id
- user_id
- project_id
- source_ai_result_id
- title
- target_files_hint
- implementation_goal
- constraints
- acceptance_criteria
- prompt
- status
- created_at

### MarketResearchRun

- id
- user_id
- project_id
- ad_lp_pair_id
- query
- status
- summary
- created_at
- sources
- insights

### MarketResearchSource

- id
- research_run_id
- source_type
- title
- url
- content
- sentiment
- relevance_score
- created_at

### MarketResearchInsight

- id
- research_run_id
- category
- title
- description
- confidence
- created_at

### ImprovementOutcome

- id
- user_id
- project_id
- ad_lp_pair_id
- source_ai_result_id
- source_codex_task_id
- title
- description
- implemented_at
- measured_at
- before_metrics
- after_metrics
- metric_delta
- outcome_status
- outcome_summary
- learning_notes
- created_at
- updated_at

## AI agents

### grok_x_copywriter

- display name: Grok X Copywriter
- provider: grok
- role: twitter_ad_copy
- strengths:
  - X culture
  - CTR hook
  - short-form social copy
- default tasks:
  - twitter_ad_improvement

### gemini_search_intent

- display name: Gemini Search Intent
- provider: gemini
- role: google_search_intent
- strengths:
  - SEO
  - Google Ads
  - search intent
- default tasks:
  - google_ad_improvement

### chatgpt_lp_reviewer

- display name: ChatGPT LP Reviewer
- provider: openai
- role: lp_review
- strengths:
  - LP structure
  - message consistency
  - history analysis
- default tasks:
  - lp_review
  - analytics_diagnosis

### chatgpt_risk_reviewer

- display name: ChatGPT Risk Reviewer
- provider: openai
- role: risk_review
- strengths:
  - brand safety
  - claim review
  - path risk
- default tasks:
  - risk_review

### openai_direct_strategist

- display name: OpenAI Direct Strategist
- provider: openai
- role: openai_direct_analysis
- strengths:
  - single-provider analysis
  - structured recommendations
  - review continuity
- default tasks:
  - openai_pair_strategy
  - openai_lp_review
  - openai_risk_review

### codex_implementation

- display name: Codex Implementation
- provider: codex
- role: implementation
- strengths:
  - React
  - Tailwind
  - diff planning
- default tasks:
  - implementation_plan

## 技術スタック

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- React Query
- Zustand
- Zod
- React Hook Form
- Supabase Browser Client
- Sonner
- Lucide React
- Recharts

### Backend

- Python
- FastAPI
- Pydantic
- OpenAI Python SDK
- OpenAI structured output
- Supabase REST
- GitHub REST
- requests
- Uvicorn

### Database/Auth

- Supabase
- Supabase Auth
- Supabase migrations
- Row Level Security

## 主要ファイル

### Backend

```text
backend/api/main.py
backend/core/config.py
backend/services/analysis/registered_pair_analysis_service.py
backend/services/orchestration/ai_orchestrator.py
backend/services/ai/openai_json_client.py
backend/services/ai/provider_registry.py
backend/services/ai/providers/base.py
backend/services/ai/providers/mock_provider.py
backend/services/ai/providers/openai_provider.py
backend/services/ai/providers/grok_provider.py
backend/services/ai/providers/gemini_provider.py
backend/services/ai/deterministic_llm_client.py
backend/services/ai/feature_extractor.py
backend/services/ai/ad_improvement_service.py
backend/services/ai/lp_improvement_service.py
backend/services/ai/diff_service.py
backend/services/ai/review_service.py
backend/services/history/change_history_service.py
backend/services/supabase/supabase_repository.py
backend/services/github/pr_service.py
backend/services/github/github_pr_client.py
backend/services/github/change_plan_to_pr_service.py
backend/services/github/github_branch_service.py
backend/services/github/github_commit_service.py
backend/services/analytics/adflow_workflow_service.py
backend/services/analytics/storage_service.py
backend/services/ads/ad_collector_service.py
backend/services/lp/lp_collector.py
backend/services/market/market_research_service.py
backend/services/outcomes/improvement_outcome_service.py
```

### Frontend

```text
frontend/app/layout.tsx
frontend/app/providers.tsx
frontend/app/page.tsx
frontend/app/login/page.tsx
frontend/app/dashboard/page.tsx
frontend/app/projects/page.tsx
frontend/app/projects/[projectId]/page.tsx
frontend/app/ads/page.tsx
frontend/app/ads/new/page.tsx
frontend/app/ads/[adId]/edit/page.tsx
frontend/app/lps/page.tsx
frontend/app/lps/new/page.tsx
frontend/app/lps/[lpId]/edit/page.tsx
frontend/app/pairs/page.tsx
frontend/app/pairs/new/page.tsx
frontend/app/pairs/[pairId]/page.tsx
frontend/app/pairs/[pairId]/edit/page.tsx
frontend/app/orchestration/page.tsx
frontend/app/history/page.tsx
frontend/app/campaigns/page.tsx
frontend/app/campaigns/[campaignId]/page.tsx
frontend/app/lp/page.tsx
frontend/app/improvements/page.tsx
frontend/app/improvements/[improvementId]/page.tsx
frontend/app/prs/page.tsx
frontend/app/settings/page.tsx
frontend/hooks/use-analysis-runs.ts
frontend/hooks/use-orchestration.ts
frontend/hooks/use-ad-lp-pairs.ts
frontend/hooks/use-landing-pages.ts
frontend/hooks/use-change-history.ts
frontend/hooks/use-auth.ts
frontend/hooks/use-market-research.ts
frontend/hooks/use-improvement-outcomes.ts
frontend/lib/types/adflow.ts
frontend/lib/supabase/adflow-repository.ts
frontend/lib/api/client.ts
frontend/components/layout/AppShell.tsx
frontend/components/layout/Sidebar.tsx
frontend/components/layout/Header.tsx
```

## 環境変数

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
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
```

### OpenAI API onlyに必要な環境変数

```env
OPENAI_API_KEY=
OPENAI_MODEL=
```

`OPENAI_MODEL` にはResponses API structured outputで使うモデルを指定します。

## 起動方法

### Frontend

```bash
cd frontend
npm install
npm run dev -- --port 3000
```

### Backend

```bash
py -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000
```

または:

```bash
python -m backend.api.main
```

## 現在確認済みの検証

- `py -m compileall backend`
- `npm run build`
- `GET /health`
- `GET /login`

## 現在実装済みの範囲

- Supabase Auth連携
- Bearer tokenによるバックエンド認証
- ユーザー別データ分離前提のrepository
- プロジェクト管理UI
- X広告CRUD
- LP CRUD
- LP versioning
- 広告LPペアCRUD
- 変更履歴保存
- ペア分析
- message match score
- hero similarity
- CTA strength
- risk level
- history-aware recommendation
- ad improvements
- LP improvements
- diff plan
- review result
- AI OS router
- Grok provider入口
- Gemini provider入口
- OpenAI provider入口
- OpenAI structured output
- mock fallback
- OpenAI API only分析モード
- SettingsでのAI modeトグル
- OpenAI-onlyのデフォルト化
- Market Research Layer
- Market Research DB migration
- Market Research API
- Market Research service
- Pair DetailのMarket Researchタブ
- DashboardのTop Pain Points/Top Competitors/Opportunity Signals
- Market ResearchをPair Analysisコンテキストに統合
- Improvement Outcome Tracking
- Improvement Outcomes DB migration
- Improvement Outcomes API
- Improvement Outcome service
- Pair DetailのOutcomesタブ
- DashboardのRecent Outcomes
- AI resultからOutcome draft生成
- Improvement OutcomesをPair Analysisコンテキストに統合
- AI agent result保存
- AI比較UI
- Accept/Reject/needs_review/apply_ready
- AI scorecards
- Codex task prompt生成
- orchestration管理画面
- dashboard/campaigns/LP analysis/improvements/PR/settingsの画面土台
- `/workflow/run` の既存ワークフロー

## 未実装・今後の拡張候補

- 実X Ads API連携
- 実Google Ads API連携
- LPクローラーの本格運用
- A/B test tracking
- 実データベースによるrouter学習強化
- AI差分の実ファイル適用
- GitHub branch作成とcommit作成の本格UI化
- PR作成自動化
- Settings永続化
- バックエンド依存関係ファイルの整備
- 自動テスト追加
- providerごとの詳細なエラー表示
- OpenAI model選択UI
- AI modeのユーザー設定保存
- 外部SNS/search/competitor APIとの実接続
- Market Researchのtrend analysis
- Market Researchのopportunity scoring
- outcomeからAI scorecard補正
- 実広告APIからbefore/after metricsを自動取得

## 注意点

- `frontend/node_modules` と `.next` は解析・編集対象外
- バックエンドにはまだ `requirements.txt` / `pyproject.toml` がない
- `requests` はGrok/Gemini providerで必要
- AI実行モードのフロント初期値はOpenAI-only
- OpenAI-only modeは `OPENAI_API_KEY` と `OPENAI_MODEL` が必須
- AI OS router modeはprovider未設定時にmock fallbackを使う
- OpenAI-only modeはmock fallbackを使わず、OpenAI接続失敗時はエラーにする
- PR作成やmergeは現状UIから自動実行しない
- Codex task prompt生成は `apply_ready` のAI resultだけが対象
- Outcomeは実測値ベースで扱う
- metric_deltaはbefore/after metricsから自動計算する
- outcomeは成功を事前断定するものではなく、測定後の学習記録として扱う

## 追加実装メモ: Market Research Layer

Market Research Layerを追加実装済みです。

実装目的:

- 広告改善前に市場判断材料を集める
- LPと市場ニーズのズレを検出する
- SNS風の課題、不満、要望を構造化する
- 競合のポジショニング、強み、弱みを整理する
- 検索意図、関連キーワード、競合ワードを保存する
- Pair Analysis時に `Ad + LP + History + Market Research` の文脈でAI分析できるようにする

実装済みファイル:

```text
supabase/migrations/202605280004_market_research_layer.sql
backend/services/market/market_research_service.py
backend/api/main.py
backend/services/analysis/registered_pair_analysis_service.py
backend/services/ai/deterministic_llm_client.py
backend/services/supabase/supabase_repository.py
frontend/hooks/use-market-research.ts
frontend/app/pairs/[pairId]/page.tsx
frontend/app/dashboard/page.tsx
frontend/hooks/useAdflowData.ts
frontend/lib/supabase/adflow-repository.ts
frontend/lib/types/adflow.ts
```

追加API:

```text
POST /market-research/run
GET /market-research/pairs/{pair_id}/latest
GET /market-research/pairs/{pair_id}/runs
```

追加DB:

```text
market_research_runs
market_research_sources
market_research_insights
```

Pair Detail UI:

- `Market Research` タブを追加
- query入力からMarket Researchを実行
- Overviewを表示
- Pain Pointsを表示
- Competitorsを表示
- Opportunitiesを表示
- Warningsを表示
- Source Signalsを表示

Dashboard UI:

- `Top Pain Points`
- `Top Competitors`
- `Opportunity Signals`

AI分析統合:

- Pair Analysis実行時に最新のMarket Research runを取得
- AI orchestration contextに `market_research` を追加
- `HistoryAwareRecommendation` に以下を追加
  - `market_insights`
  - `competitor_summary`
  - `pain_point_alignment`
  - `positioning_opportunities`
  - `market_alignment_score`
  - `market_fit_analysis`
  - `recommended_positioning`
  - `market_opportunities`
  - `market_research_run_id`

重要な制約:

- 需要判定AIではない
- 「需要あり」「需要なし」は出さない
- 「成功する」「失敗する」は出さない
- 売上予測はしない
- 市場材料は仮説形成のための参考情報として扱う

現在のMarket Research収集は外部SNS/search/competitor APIの実接続ではなく、Phase 1としてqueryとペア情報から構造化した市場判断材料を生成・保存する実装です。

検証済み:

```text
py -m compileall backend
npm run build
```

## 追加実装メモ: Improvement Outcome Tracking

Improvement Outcome Trackingを追加実装済みです。

実装目的:

- AI提案後の実装結果を保存する
- before/after metricsを手入力で保存できるようにする
- metric_deltaを自動計算する
- outcome_statusを測定結果に応じて更新する
- learning_notesを次回分析に反映する
- AI resultやCodex taskからoutcome draftを作成する

実装済みファイル:

```text
supabase/migrations/202605280005_improvement_outcomes.sql
backend/services/outcomes/improvement_outcome_service.py
backend/api/main.py
backend/services/analysis/registered_pair_analysis_service.py
backend/services/ai/deterministic_llm_client.py
backend/services/supabase/supabase_repository.py
frontend/hooks/use-improvement-outcomes.ts
frontend/app/pairs/[pairId]/page.tsx
frontend/app/dashboard/page.tsx
frontend/hooks/useAdflowData.ts
frontend/lib/supabase/adflow-repository.ts
frontend/lib/types/adflow.ts
```

追加API:

```text
POST /outcomes
GET /outcomes/pairs/{pair_id}
GET /outcomes/pairs/{pair_id}/latest
PATCH /outcomes/{outcome_id}
POST /orchestration/results/{result_id}/outcome
POST /orchestration/codex-tasks/{task_id}/outcome
```

追加DB:

```text
improvement_outcomes
```

Pair Detail UI:

- `Outcomes` タブを追加
- outcome作成
- before metrics JSON入力
- after metrics JSON入力
- measured outcome保存
- CTR/CVR/Bounce rate差分表示
- summaryとlearning notes表示

AI Comparison UI:

- `apply_ready` のAI resultに `Create Outcome Draft` ボタンを表示
- 押下時に `POST /orchestration/results/{result_id}/outcome` を実行

Dashboard UI:

- `Recent Outcomes` カードを追加
- positive/negative/inconclusive件数を表示
- average CTR delta / average CVR deltaを表示
- recent learning notesを表示

AI分析統合:

- Pair Analysis実行時にrecent outcomesを取得
- contextへ以下を追加
  - `recent_outcomes`
  - `successful_patterns`
  - `failed_patterns`
  - `inconclusive_patterns`
- `HistoryAwareRecommendation` に以下を追加
  - `outcome_insights`
  - `successful_improvement_patterns`
  - `failed_improvement_patterns`
  - `outcome_based_warnings`
  - `recommended_next_measurement`

検証済み:

```text
py -m compileall backend
npm run build
```
