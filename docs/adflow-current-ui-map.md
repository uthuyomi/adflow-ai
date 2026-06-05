# AdFlow AI Current UI Map

このドキュメントは、AdFlow AI の現在の UI 表示内容、画面構造、主要ワークフロー、状態表示をページ単位で把握するための監査用メモです。UI 改修案ではなく、現状の実装を別のレビュアーや AI が確認できるように整理したものです。

確認対象:

- `frontend/app`
- `frontend/components`
- `frontend/hooks`
- `frontend/lib`
- `frontend/locales`

注意:

- この文書ではコードや UI コピーは変更していません。
- スクリーンショットの確認は含めていません。
- 実 API の成功可否は環境変数、Supabase、Fly.io、Vercel の設定状態に依存します。

---

## 1. 全体概要

AdFlow AI は、公開マーケティングサイト、Google ログイン画面、ログイン後の広告・LP 改善管理画面で構成されています。

主要な利用目的:

- 公開ページで価値訴求、料金、FAQ、法務情報を確認する
- Google OAuth でログインする
- プロジェクト、X 広告、LP、広告 LP ペアを登録する
- ペア単位で AI 分析、Demand Intelligence、AI レビュー、改善結果管理を行う
- 改善提案、PR 状態、履歴、キャンペーン、設定を管理する

主要導線:

1. 公開ページ `/` から `/pricing` または `/login` へ進む
2. `/login` で Google ログインする
3. `/projects` でプロジェクト作成
4. `/ads` と `/lps` で素材登録
5. `/pairs` で広告 LP ペア作成
6. `/pairs/[pairId]` で `Run analysis` / `Run demand scan` / AI レビュー / Outcome 登録を行う

---

## 2. グローバルレイアウト

### 公開ページレイアウト

対象:

- `/`
- `/features`
- `/how-it-works`
- `/compare`
- `/why-adflow`
- `/use-cases`
- `/pricing`
- `/faq`
- `/contact`
- `/terms`
- `/privacy`
- `/legal`
- `/legal/tokusho`
- `/changelog`
- `/billing/*`

表示要素:

- 上部に公開ヘッダー
- 下部に公開フッター
- メインコンテンツ
- 言語切り替え

公開ヘッダーのナビゲーション:

| Label | Route |
| --- | --- |
| AdFlow AI | `/` |
| Features | `/features` |
| How it works | `/how-it-works` |
| Compare | `/compare` |
| Use cases | `/use-cases` |
| Pricing | `/pricing` |
| FAQ | `/faq` |
| EN / 日本語 | 現在ページ |
| Log in | `/login` |

公開フッター:

| Group | Links |
| --- | --- |
| Product | Features, How it works, Compare, Why AdFlow, Use cases, Pricing, FAQ, Contact |
| Legal | Terms, Privacy, Legal, Specified Commercial Transaction Act |

### ログインページレイアウト

対象:

- `/login`

表示要素:

- 公開ヘッダー・フッターなし
- 中央寄せのログインカード
- `AdFlow AI`
- `Sign in to manage ad and LP reviews.`
- `Continue with Google`

### アプリ管理画面レイアウト

対象:

- `/dashboard`
- `/projects`
- `/projects/[projectId]`
- `/ads`
- `/ads/new`
- `/ads/[adId]/edit`
- `/lps`
- `/lps/new`
- `/lps/[lpId]/edit`
- `/pairs`
- `/pairs/new`
- `/pairs/[pairId]`
- `/pairs/[pairId]/edit`
- `/orchestration`
- `/history`
- `/campaigns`
- `/campaigns/[campaignId]`
- `/lp`
- `/improvements`
- `/improvements/[improvementId]`
- `/prs`
- `/settings`

表示要素:

- 左サイドバー
- 上部アプリヘッダー
- メインコンテンツ
- Toast 表示領域
- 認証ゲート

アプリヘッダー:

- `Workspace / current page`
- 選択中プロジェクト、未選択時 `No project selected`
- 検索入力 `Search campaigns, PRs, improvements`
- `Synced` バッジ
- 言語切り替え
- `Sync`
- 通知アイコンボタン
- `Logout`

サイドバー:

| Label | Route |
| --- | --- |
| Dashboard | `/dashboard` |
| Projects | `/projects` |
| X Ads | `/ads` |
| Landing Pages | `/lps` |
| Ad LP Pairs | `/pairs` |
| AI OS / AI Review Center | `/orchestration` |
| History | `/history` |
| Campaigns | `/campaigns` |
| LP Analysis | `/lp` |
| Improvements | `/improvements` |
| PR Reviews | `/prs` |
| Settings | `/settings` |

認証ゲート対象:

- `/dashboard`
- `/projects`
- `/ads`
- `/lps`
- `/pairs`
- `/orchestration`
- `/history`
- `/improvements`
- `/prs`
- `/settings`

確認ポイント:

- `/campaigns` と `/lp` はアプリシェル内に表示されますが、現状の `AuthGate` の protected roots には含まれていません。

---

## 3. 公開マーケティングページ

### `/`

目的:

- AdFlow AI の価値、ワークフロー、主要機能を説明するトップページ

主な表示:

- Hero
- クイックワークフロー
- 右側のデモカード
- Problem / Solution
- Workflow
- Feature preview
- Sample results
- Comparison
- Trust
- CTA

主要コピー:

- `Find the next sellable angle before demand gets expensive.`
- `AdFlow AI connects reviews, social signals, competitor messages, search demand, ad copy, and LP structure in one credit-based workflow.`

主要 CTA:

- `Start free` -> `/login`
- `View pricing` -> `/pricing`

### `/features`

目的:

- Demand Intelligence、広告 LP ペア分析、AI レビュー分離、Outcome Learning を説明する

主な表示:

- Hero
- 機能カード
- Pricing / Contact への CTA

### `/how-it-works`

目的:

- AdFlow AI の運用ステップを説明する

想定表示:

- Evidence collection
- Pair analysis
- Review
- Implementation
- Outcome learning

### `/compare`

目的:

- 既存の広告運用・LP 改善フローとの比較を説明する

想定表示:

- 比較カードまたは比較セクション
- Pricing / Login への導線

### `/why-adflow`

目的:

- なぜ AdFlow AI を使うかを説明する補足ページ

想定表示:

- 価値説明カード
- 利用前の心理的障壁を下げる説明

### `/use-cases`

目的:

- 想定ユーザー別の利用シーンを説明する

主な表示:

- Solo builders
- Small SaaS teams
- Ad operators

主要 CTA:

- `View pricing`
- `Contact`

### `/pricing`

目的:

- プラン、クレジット残高、追加クレジット、JPY / USD 切り替え、Stripe 導線を表示する

主な表示:

- Pricing hero
- `CurrencyToggle`
- `BillingPortalButton`
- `CreditBalanceCard`
- Credit usage cards
- ROI card
- Plan cards
- Feature comparison table
- Additional credit packs
- FAQ
- CTA section

表示されるクレジット消費目安:

| Workflow | Credits |
| --- | ---: |
| Demand scan | 50 |
| Competitor analysis | 100 |
| Ad LP pair analysis | 150 |
| Full workflow | 300 |

主要 CTA:

- `Choose Plan`
- `Buy Credits`
- `Manage billing`
- `Start free`

### `/faq`

目的:

- 導入前の不安を解消する

主な質問:

- Does AdFlow AI predict sales?
- Can I use only OpenAI?
- What happens when external source keys are missing?
- Are AI suggestions applied automatically?

### `/contact`

目的:

- 問い合わせフォームを表示する

フォーム項目:

- Name
- Email
- Category
- Topic
- Message

確認ポイント:

- 画面上はフォームが表示されていますが、現状は production wiring 前提の contact surface として扱われています。

### `/terms`

目的:

- 利用規約を表示する

主な項目:

- Service
- Accounts
- Credits
- AI output
- Prohibited use
- Service changes
- Governing law

### `/privacy`

目的:

- プライバシーポリシーを表示する

主な項目:

- Information collected
- Purpose of use
- Payment processing
- Data storage
- Third parties
- Contact

### `/legal`

目的:

- 法務情報への index ページ

主なリンク:

- Terms
- Privacy
- Specified Commercial Transaction Act

主な注意:

- 需要、CV、売上、キャンペーン成功を保証しないことを表示する

### `/legal/tokusho`

目的:

- 特定商取引法に基づく表記を表示する

主な項目:

- Seller
- Operations manager
- Address
- Sales price
- Payment method
- Payment timing
- Service delivery
- Returns and cancellation

### `/changelog`

目的:

- プロダクト更新履歴を表示する

主な表示:

- Credit billing and pricing
- Demand Intelligence Engine
- Marketing i18n

### `/billing/success` / `/billing/cancel`

目的:

- Stripe Checkout 後の結果ページ

想定 CTA:

- Back to pricing
- Go to dashboard

---

## 4. 認証・ログイン UI

### `/login`

表示:

- `AdFlow AI`
- `Sign in to manage ad and LP reviews.`
- `Continue with Google`

操作:

- Google OAuth ログイン

エラー:

- Google ログイン失敗時に toast でエラー表示

認証後:

- Supabase Auth のセッション状態に依存
- 保護対象ページでは未ログイン時にログイン画面へ誘導される想定

---

## 5. アプリ管理画面レイアウト

### 共通構造

アプリ管理画面は `Sidebar`、`Header`、ページ本体で構成されています。ページ本体は多くの画面で `SectionHeader` を使い、タイトル、説明、右側アクションを表示します。

### 共通操作

- サイドバー遷移
- ヘッダー検索
- 言語切り替え
- Sync ボタン
- Notification ボタン
- Logout

確認ポイント:

- `Sync` と通知アイコンは UI として存在しますが、実処理が明確に接続されているかは追加確認が必要です。
- 検索入力は全体検索 UI として表示されますが、現在ページ内での検索実装とは別に確認が必要です。

---

## 6. 主要ワークフロー

### 初回セットアップ

1. `/projects` でプロジェクトを作成
2. `/ads/new` で X 広告を登録
3. `/lps/new` で LP を登録
4. `/pairs/new` で広告 LP ペアを作成
5. `/pairs/[pairId]` で分析実行

### ペア分析

1. `/pairs` から `Run analysis`
2. または `/pairs/[pairId]` から `Run analysis`
3. AI mode は `/settings` の `OpenAI API only` / `AI OS router` に依存
4. 成功時 `Analysis completed.`
5. 失敗時 `Analysis failed.` または API エラー message

### Demand Intelligence

1. `/pairs/[pairId]` の Demand Intelligence タブを開く
2. クエリ入力
3. `Run demand scan`
4. Source status / Validation / Search Demand / Market Size / Outcome Learning を確認

### AI レビュー

1. `/pairs/[pairId]` の AI Comparison または AI Review Center タブを確認
2. `accepted` / `rejected` / `needs_review` / `apply_ready` を選択
3. `Generate Codex Task`
4. `Create Outcome Draft`

### 改善提案レビュー

1. `/improvements` で改善提案一覧を確認
2. `/improvements/[improvementId]` で Diff / warnings を確認
3. `Approve` / `Create PR` / `Reject`
4. 確認ダイアログで確定

### Outcome Learning

1. `/pairs/[pairId]` で outcome draft を作成
2. before / after metrics を入力
3. `Save measured outcome`
4. 次回分析の学習材料として参照される

---

## 7. 各ページ詳細

### `/dashboard`

目的:

- 登録済み広告、LP、Demand Intelligence、改善結果をもとに全体状況を確認する

主な表示:

- Getting started widget
- KPI cards
- Risk alerts
- Market signal cards
- Recent outcomes
- Metrics charts
- Recent improvements
- Pending PR list

KPI:

- Total impressions
- Clicks
- CTR
- Spend
- CPC
- CVR
- Active campaigns

状態:

- Loading: `PageSkeleton`
- Error: `ErrorState`
- データなし: 各カードで `No data` 系表示

### `/projects`

目的:

- プロジェクト作成と一覧表示

フォーム:

- Project name
- Description

CTA:

- `Create`

空状態:

- `No projects`
- `Create a project before grouping ads and landing pages.`

Toast:

- `Project created.`
- `Create failed.`

### `/projects/[projectId]`

目的:

- プロジェクト詳細

主な表示:

- プロジェクト名
- Description または `Project detail`
- Workspace が拡張された場合に ads / LPs / pairs / history / analysis runs を filter できる旨のカード

状態:

- Loading: `PageSkeleton`
- Error: `ErrorState`

### `/ads`

目的:

- X 広告一覧、編集、削除

主な表示:

- X Ads table
- Name
- Headline
- CTA
- Destination
- CTR
- CVR
- Spend
- Status
- Actions

CTA:

- `New ad`
- edit icon
- delete icon
- confirm delete

空状態:

- `No X ads`
- `Register an ad manually to start pair-based analysis.`

Toast:

- `Ad deleted.`
- `Delete failed.`

### `/ads/new` / `/ads/[adId]/edit`

目的:

- X 広告の作成・編集

フォーム:

- Name
- Destination URL
- Campaign
- Ad group
- Headline
- CTA
- Body
- Image URL
- Video URL
- Impressions
- Clicks
- Conversions
- Spend
- Status

バリデーション:

- Name required
- Destination URL required and URL
- Image URL / Video URL は空または URL
- 数値は 0 以上

### `/lps`

目的:

- LP 一覧、編集、削除

主な表示:

- Landing Pages table
- Name
- URL
- Hero
- Primary CTA
- Bounce
- Speed
- Actions

CTA:

- `New LP`
- edit icon
- delete icon

空状態:

- `No landing pages`
- `Register a landing page before creating ad-LP pairs.`

### `/lps/new` / `/lps/[lpId]/edit`

目的:

- LP の作成・編集

フォーム:

- Name
- URL
- Hero title
- Hero subtitle
- Primary CTA
- Secondary CTA
- Offer text
- Target audience
- Bounce rate
- Session duration
- Scroll depth
- Page speed
- FCP
- LCP
- Notes

バリデーション:

- Name required
- URL required and URL
- Bounce rate 0-100
- Scroll depth 0-100
- Session duration / Page speed / FCP / LCP は 0 以上

### `/pairs`

目的:

- 広告と LP のペア一覧、分析実行、編集、削除

主な表示:

- Pair
- Ad
- LP
- Status
- Last analyzed
- Actions

CTA:

- `New pair`
- `Analyze`
- detail icon
- edit icon
- delete icon

空状態:

- `No ad LP pairs`

Toast:

- `Analysis completed.`
- `Analysis failed.`

### `/pairs/new` / `/pairs/[pairId]/edit`

目的:

- 広告 LP ペアの作成・編集

フォーム:

- Pair name
- Status
- X ad
- Landing page

バリデーション:

- Pair name required
- X ad required
- Landing page required

### `/pairs/[pairId]`

目的:

- ペア詳細、AI 分析、Demand Intelligence、Outcomes、履歴、LP versions、AI Review Center を統合表示する最重要画面

上部表示:

- Pair name
- `OpenAI only` / `Multi AI` バッジ
- `AI settings`
- `Run analysis`

Beginner / Advanced:

- 初心者向けビュー
- 詳細タブビュー

Advanced tabs:

- Overview
- Analysis
- AI Comparison
- Demand Intelligence
- Outcomes
- Versions
- History
- AI Review Center
- AI Recommendations

Overview:

- X ad card
- Landing page card
- CTA 未設定時 `No CTA`

Analysis:

- analysis run cards
- score
- hero similarity
- CTA strength
- bounce rate
- risk level

AI Comparison:

- AI proposal cards
- confidence
- risk
- score
- decision buttons
- `Generate Codex Task`
- `Create Outcome Draft`

Demand Intelligence:

- query input
- `Run demand scan`
- source runs
- validation
- solution fit
- monitoring snapshots
- search demand
- market size
- evidence
- outcome learning

Outcomes:

- outcome cards
- outcome title
- description
- learning notes
- edit metrics
- save measured outcome

Versions:

- LP versions

History:

- change history rows

AI Review Center:

- orchestration log
- AI recommendation

主な Toast:

- `Analysis completed.`
- `Analysis failed.`
- `Demand intelligence completed.`
- `Demand intelligence failed.`
- `Solution fit completed.`
- `Solution fit failed.`
- `Outcome learning rebuilt.`
- `Outcome learning rebuild failed.`
- `Outcome created.`
- `Outcome updated.`
- `Decision failed.`
- `Codex task prompt generated.`
- `Codex task generation failed.`
- `Outcome draft created.`
- `Outcome draft creation failed.`

### `/orchestration`

目的:

- AI Review Center として、AI agents、router runs、AI comparison を確認する

主な表示:

- SectionHeader: `AI Review Center`
- Enabled agents
- Router runs
- Scorecards
- Review layer
- Notice card
- Tabs

Tabs:

- Specialized AI
- Router Runs
- AI Comparison

空状態:

- `No AI agents`
- `No router runs`
- `No AI comparison data`

エラー:

- `Unable to load this view`
- `The API request failed. Check the backend URL and try again.`

確認ポイント:

- バックエンド URL、CORS、Fly.io 稼働、Vercel 環境変数、Supabase 認証トークンのいずれかに問題があるとこの画面で API request failed が出やすいです。

### `/history`

目的:

- 作成、更新、削除、AI decision の履歴確認

表示:

- Entity
- Action
- Summary
- Reason
- Created

空状態:

- `No history`

### `/campaigns`

目的:

- 登録済み広告をキャンペーン名で集計する

表示:

- Campaign metrics
- Campaign table
- Search campaigns

空状態:

- `No campaigns`
- `Connect an ad source or run analysis to populate campaigns.`

### `/campaigns/[campaignId]`

目的:

- キャンペーン詳細確認

表示:

- Campaign name
- risk badge
- CampaignMetricCards
- Tabs

Tabs:

- Overview
- Metrics
- Ad Suggestions
- LP Alignment
- History

空状態:

- `No campaign`
- `No registered ads matched this campaign.`

### `/lp`

目的:

- LP 分析ビュー

表示:

- LP performance cards
- LP summary
- LP issue list

空状態:

- LP データなし時の empty state

### `/improvements`

目的:

- analysis runs 由来の改善提案一覧

表示:

- Improvement cards/list
- Risk
- Score
- Review warnings

空状態:

- `No improvements`
- `Run analysis to generate reviewable improvement proposals.`

### `/improvements/[improvementId]`

目的:

- 改善提案の差分、警告、承認操作を確認する

表示:

- `Diff review`
- Diff viewer
- Review warnings
- Approval summary
- Confidence progress
- CTR impact
- CVR impact

CTA:

- `Approve`
- `Create PR`
- `Reject`

空状態:

- `No improvement`
- `No measured analysis suggestion matched this item.`

### `/prs`

目的:

- PR レビュー状態確認

表示:

- PR cards / rows
- PR
- Status
- Review
- 外部リンク

空状態:

- `No PRs`
- `Approved improvements that create PRs will appear here.`

### `/settings`

目的:

- AI mode、接続設定、workspace defaults を設定する

表示:

- Account AI settings
- OpenAI API only
- Multi AI / AI OS router
- Backend API URL
- GitHub repository
- Supabase project
- X Ads connection status
- Analysis schedule

CTA:

- `Save settings`

Toast:

- `Settings validated locally.`

確認ポイント:

- 現状は local validation の保存であり、外部設定が永続保存・反映されるかは別途確認が必要です。

---

## 8. 共通コンポーネント

主な共通 UI:

- `SectionHeader`
- `Card`
- `Button`
- `Badge`
- `Tabs`
- `Progress`
- `Input`
- `Textarea`
- `Select`
- `EmptyState`
- `ErrorState`
- `PageSkeleton`
- `ConfirmDialog`
- `ApprovalDialog`
- `DiffViewer`
- `ReviewWarnings`

画面状態コンポーネント:

- `PageSkeleton`: ページ読み込み中
- `ErrorState`: API エラー、データ取得失敗
- `EmptyState`: データなし

---

## 9. フォーム一覧

| Form | Route | Main fields | Submit |
| --- | --- | --- | --- |
| Contact form | `/contact` | Name, Email, Category, Topic, Message | Send message |
| Project creation | `/projects` | Project name, Description | Create |
| Ad form | `/ads/new`, `/ads/[adId]/edit` | Name, Destination URL, Campaign, Headline, CTA, metrics, Status | Save |
| LP form | `/lps/new`, `/lps/[lpId]/edit` | Name, URL, Hero, CTA, offer, audience, metrics | Save LP |
| Pair form | `/pairs/new`, `/pairs/[pairId]/edit` | Pair name, Status, X ad, Landing page | Save |
| Demand query | `/pairs/[pairId]` | Demand query | Run demand scan |
| Solution fit | `/pairs/[pairId]` | App idea / offer / positioning | Run fit |
| Outcome form | `/pairs/[pairId]` | Outcome title, Description, metrics, Learning notes | Create outcome / Save measured outcome |
| Settings form | `/settings` | AI mode, Backend API URL, GitHub repo, Supabase project, X Ads status, schedule | Save settings |

---

## 10. ボタン・CTA 一覧

### 公開ページ

- `Start free`
- `View pricing`
- `Contact`
- `Log in`
- `Choose Plan`
- `Buy Credits`
- `Manage billing`
- `Back to pricing`
- `Go to dashboard`
- `Send message`

### アプリ共通

- `Sync`
- `Logout`
- sidebar navigation
- language switch

### 登録・編集

- `Create`
- `New ad`
- `New LP`
- `New pair`
- `Edit`
- `Delete`
- `Cancel`
- `Save`
- `Save LP`

### 分析・レビュー

- `Run analysis`
- `Running...`
- `Analyze`
- `Run demand scan`
- `Scanning...`
- `Run fit`
- `Checking...`
- `Rebuild outcome learning`
- `accepted`
- `rejected`
- `needs_review`
- `apply_ready`
- `Generate Codex Task`
- `Create Outcome Draft`
- `Create outcome`
- `Edit metrics`
- `Save measured outcome`
- `Close`

### 改善提案

- `Approve`
- `Create PR`
- `Reject`
- `Confirm`
- `Cancel`

---

## 11. ナビゲーション一覧

### Public header

- `/`
- `/features`
- `/how-it-works`
- `/compare`
- `/use-cases`
- `/pricing`
- `/faq`
- `/login`

### Public footer

- `/features`
- `/how-it-works`
- `/compare`
- `/why-adflow`
- `/use-cases`
- `/pricing`
- `/faq`
- `/contact`
- `/terms`
- `/privacy`
- `/legal`
- `/legal/tokusho`

### App sidebar

- `/dashboard`
- `/projects`
- `/ads`
- `/lps`
- `/pairs`
- `/orchestration`
- `/history`
- `/campaigns`
- `/lp`
- `/improvements`
- `/prs`
- `/settings`

### Detail links

- `/projects/[projectId]`
- `/ads/[adId]/edit`
- `/lps/[lpId]/edit`
- `/pairs/[pairId]`
- `/pairs/[pairId]/edit`
- `/campaigns/[campaignId]`
- `/improvements/[improvementId]`

---

## 12. Empty State 一覧

| Area | Empty title | Description |
| --- | --- | --- |
| Projects | No projects | Create a project before grouping ads and landing pages. |
| Ads | No X ads | Register an ad manually to start pair-based analysis. |
| Landing Pages | No landing pages | Register a landing page before creating ad-LP pairs. |
| Pairs | No ad LP pairs | Create a pair before running analysis. |
| Pair analysis | No analysis runs | Run analysis to save pair-level results. |
| Pair AI proposals | No AI proposals | Run analysis to compare AI and reviewer outputs. |
| Demand Intelligence | No demand intelligence | Run demand intelligence to collect signals and evidence. |
| Source runs | No source runs | Run demand intelligence to inspect connector status. |
| Validation | No validation data | Run demand intelligence to score signal quality. |
| Search Demand | No search demand | Run demand intelligence to create search signals. |
| Market Size | No market size estimates | Run demand intelligence to create cautious estimates. |
| Outcomes | No outcomes | Create an outcome draft after implementation. |
| History | No history | Create, update, and delete events will appear here. |
| Orchestration | No router runs | Run analysis to route this pair through specialized AI desks. |
| Campaigns | No campaigns | Connect an ad source or run analysis to populate campaigns. |
| Campaign detail | No campaign | No registered ads matched this campaign. |
| Improvements | No improvements | Run analysis to generate reviewable improvement proposals. |
| Improvement detail | No improvement | No measured analysis suggestion matched this item. |
| PR Reviews | No PRs | Approved improvements that create PRs will appear here. |

---

## 13. Loading / Error State 一覧

### Loading

多くのデータ取得ページは `PageSkeleton` を表示します。

対象:

- Dashboard
- Projects detail
- Ads
- Landing Pages
- Pairs
- Pair detail
- Orchestration
- Campaigns
- Campaign detail
- Improvements
- Improvement detail
- PR Reviews

### Error

多くの API 取得失敗時は `ErrorState` を表示します。

代表メッセージ:

- `Unable to load this view`
- `The API request failed. Check the backend URL and try again.`

想定原因:

- `NEXT_PUBLIC_API_BASE_URL` が未設定または誤り
- Fly.io backend が未起動
- CORS 設定不備
- Supabase 認証トークン不備
- API route の 4xx / 5xx
- Vercel 側の環境変数未反映

---

## 14. モーダル・確認ダイアログ一覧

### Delete confirm

対象:

- `/ads`
- `/lps`
- `/pairs`

表示:

- 削除確認
- `Delete`
- `Cancel`

目的:

- 誤削除防止
- 削除履歴を残す旨の説明

### Approval dialog

対象:

- `/improvements/[improvementId]`

モード:

- approve
- pr
- reject

表示:

- `Approve improvement?`
- `Create pull request?`
- `Reject improvement?`
- `Cancel`
- Confirm action

---

## 15. Toast / Notification 一覧

### Auth

- `Google login failed.`
- `Signed out.`
- `Sign out failed.`

### Projects

- `Project created.`
- `Create failed.`

### Ads / LPs / Pairs

- `Ad deleted.`
- `Delete failed.`
- `LP deleted.`
- `Analysis completed.`
- `Analysis failed.`

### Pair detail

- `Demand intelligence completed.`
- `Demand intelligence failed.`
- `Solution fit completed.`
- `Solution fit failed.`
- `Outcome learning rebuilt.`
- `Outcome learning rebuild failed.`
- `Outcome created.`
- `Outcome updated.`
- `Decision failed.`
- `Codex task prompt generated.`
- `Codex task generation failed.`
- `Outcome draft created.`
- `Outcome draft creation failed.`

### Improvements

- `Improvement approved for PR preparation.`
- `PR creation request completed.`
- `Improvement marked as rejected in this review session.`

### Billing

- `Billing portal failed.`

### Settings

- `Settings validated locally.`

---

## 16. i18n 対応状況

対応言語:

- English
- 日本語

公開ページ:

- i18n dictionary から主要コピーを取得しています。
- 言語切り替えは公開ヘッダーとアプリヘッダーにあります。

アプリ管理画面:

- 一部で `useI18n` を利用しています。
- 管理画面には英語固定文言が多く残っています。
- Pair detail の一部 beginner copy などは i18n 経由です。

確認ポイント:

- 日本語辞書の文字化け有無
- 公開ページと管理画面での言語切り替え反映範囲
- Toast / Error / Empty State の翻訳範囲
- `AI OS` と `AI Review Center` の名称揺れ

---

## 17. モバイル表示・レスポンシブ挙動

### 公開ヘッダー

- モバイルではメニューアイコンを表示
- full-screen navigation を開く
- nav items を縦並び表示
- language switcher を menu 内に表示
- Login ボタンを表示

### アプリ管理画面

- モバイルではサイドバーを overlay として開閉
- backdrop click で閉じる
- close icon で閉じる
- app header は sticky top
- 一部テーブルは横スクロールまたは responsive grid に依存

### カード / グリッド

- KPI cards や marketing cards は breakpoint に応じて列数変更
- Campaign detail、Improvement detail、Pair detail は wide screen で 2-column / multi-column
- Pair detail の tabs は `flex-wrap` で折り返す

確認ポイント:

- 長い日本語ラベルがボタンやタブ内で折り返して崩れないか
- Pair detail のタブ数が多いため mobile で操作しづらくないか
- Pricing comparison table は mobile で横幅が大きくなりやすい

---

## 18. UX 上の確認ポイント

優先確認:

- `/campaigns` と `/lp` が `AuthGate` の protected roots に含まれていないため、ログイン必須の意図と一致しているか確認する。
- AI Review Center の `Unable to load this view` は原因が広いため、ユーザー向けには backend URL / connection / auth のどれが問題か切り分けやすくする余地がある。
- `/settings` の `Save settings` は `Settings validated locally.` で完了するため、実際に backend / Supabase / provider 設定が保存されたと誤解されないか確認する。
- `/contact` の form は production wiring 前提の表示なので、公開状態で送信できるように見えて問題ないか確認する。
- Header の `Sync`、notification icon、global search が実処理につながっているか確認する。
- Pair detail は機能が多く、初回ユーザーには Beginner / Advanced 切り替えがあるものの、`Run analysis` と `Run demand scan` の優先度が伝わるか確認する。
- `AI OS`、`AI Review Center`、`AI Review Center router` の名称を統一するか確認する。
- Demand Intelligence は意思決定支援であり、需要・売上保証ではない注意が UI 上で十分に見えるか確認する。
- Pricing で credits の消費量、月次 credits、購入 credits、消費順が十分に理解できるか確認する。
- Stripe / Supabase / Fly.io / Vercel の環境変数不備時に、ユーザーが何を直せばよいか分かるか確認する。
- Tokusho、Privacy、Terms の placeholder 情報や問い合わせ先が本番用になっているか確認する。

---

## 補足: 現在の UI 監査で見るべき代表ルート

最低限の確認ルート:

```text
/
/pricing
/login
/dashboard
/projects
/ads
/lps
/pairs
/pairs/[pairId]
/orchestration
/campaigns
/lp
/improvements
/prs
/settings
```

公開ページ確認ルート:

```text
/features
/how-it-works
/compare
/why-adflow
/use-cases
/faq
/contact
/terms
/privacy
/legal
/legal/tokusho
/changelog
```
