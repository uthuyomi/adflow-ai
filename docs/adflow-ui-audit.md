# AdFlow AI UI Audit

> **履歴資料:** 本書は初期UI監査時点の指摘を保存したものです。Phase1〜8で解決済みの指摘を含みます。現在の残課題は [`unimplemented-features-audit.md`](unimplemented-features-audit.md) を参照してください。

このドキュメントは、AdFlow AI のユーザー向け画面を UI / UX / コピー / ラベル / オンボーディング / コンバージョン観点でレビューするための監査資料です。技術仕様書ではなく、別の AI またはレビュアーがソースコードを開かずに画面体験を評価できることを目的にしています。

注意:

- スクリーンショットは現時点でリポジトリ内に確認していません。
- 公開マーケティングページは i18n 辞書から文言を取得します。
- 管理画面の一部は英語固定文言が残っています。
- 日本語辞書は一部文字化けしている可能性があるため、UI レビュー時に重点確認が必要です。

## Product Positioning

### Current Marketing Message

現在の主メッセージは、広告チーム向けの「需要シグナル発見」と「広告 / LP 改善ワークフロー」です。

英語コピーの中心:

```text
Find the next sellable angle before demand gets expensive.
```

日本語として意図されるメッセージ:

```text
需要が高くなる前に、次に売れる訴求を見つける。
```

補足メッセージ:

```text
AdFlow AI connects reviews, social signals, competitor messages, search demand, ad copy, and LP structure in one credit-based workflow.
```

UI 上の現在の訴求軸:

- Demand Intelligence
- Ad and LP Pair Analysis
- AI Review Separation
- Outcome Learning
- Credit billing
- JPY / USD pricing
- English / Japanese support

### Primary User

主なユーザー:

- SaaS / デジタル商品の広告運用者
- LP 改善を担当するマーケター
- 小規模 SaaS チーム
- 個人開発者
- 広告代理店の運用担当者
- AI 提案を人間レビュー付きで運用したいチーム

### Main Value Proposition

主要価値:

- 広告と LP を同じ改善単位として分析できる
- 市場の声、競合ギャップ、検索需要を広告改善に接続できる
- AI 提案をリスクレビューと分離して扱える
- 採用した改善結果を次回分析に反映できる
- クレジット制で分析コストを管理できる

コンバージョン上の主導線:

- 公開ページ: Pricing / Login / Start free
- 管理画面: Create project / Register ad / Register LP / Create pair / Run analysis
- Pair detail: Run analysis / Run demand scan / Generate Codex Task / Create Outcome Draft

---

## Navigation Structure

### Header Navigation

公開サイトのヘッダー:

| Label | Route | Purpose |
| --- | --- | --- |
| AdFlow AI | `/` | トップページへ戻るブランドリンク |
| Features | `/features` | 機能説明 |
| Use Cases | `/use-cases` | 利用シーン説明 |
| Pricing | `/pricing` | 料金、クレジット、Checkout |
| FAQ | `/faq` | 導入前の疑問解消 |
| Contact | `/contact` | 問い合わせ |
| EN | 現在ページ | 英語へ切り替え |
| 日本語 | 現在ページ | 日本語へ切り替え |
| Log in | `/login` | ログイン |

モバイルヘッダー:

- メニューアイコンで full-screen navigation を開く
- 同じ nav items を縦並びで表示
- language switcher を menu 内に表示
- Login ボタンを表示

管理画面サイドバー:

| Label | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/dashboard` | KPI と全体状況 |
| Projects | `/projects` | プロジェクト管理 |
| X Ads | `/ads` | 広告管理 |
| Landing Pages | `/lps` | LP 管理 |
| Ad LP Pairs | `/pairs` | 広告 LP ペア管理 |
| AI OS | `/orchestration` | AI agent / scorecard 管理 |
| History | `/history` | 変更履歴 |
| Campaigns | `/campaigns` | キャンペーン集計 |
| LP Analysis | `/lp` | LP 分析 |
| Improvements | `/improvements` | 改善提案一覧 |
| PR Reviews | `/prs` | PR レビュー |
| Settings | `/settings` | 設定 |

### Footer Navigation

公開サイトのフッター:

| Group | Label | Route |
| --- | --- | --- |
| Product | Features | `/features` |
| Product | Use Cases | `/use-cases` |
| Product | Pricing | `/pricing` |
| Legal | Terms | `/terms` |
| Legal | Privacy | `/privacy` |
| Legal | Legal | `/legal` |
| Legal | Specified Commercial Transaction Act | `/legal/tokusho` |

フッター文言:

```text
AdFlow AI
(c) 2026 AdFlow AI. All rights reserved.
```

---

## Page Inventory

# Page

Route:

```text
/
```

Purpose:

公開マーケティングトップ。AdFlow AI の主価値、ワークフロー、主要機能を説明し、Pricing または Login に送客する。

---

## Hero Section

Headline:

```text
Find the next sellable angle before demand gets expensive.
```

Subtitle:

```text
AdFlow AI connects reviews, social signals, competitor messages, search demand, ad copy, and LP structure in one credit-based workflow.
```

CTA Buttons:

- Start free -> `/login`
- View pricing -> `/pricing`

---

## Main Sections

### Section 1

Title:

```text
AI demand intelligence for ad teams
```

Content:

需要シグナル、競合、広告文、LP 構成、マーケットレポートまでの流れを提示する。

Displayed cards:

- Demand scan
- Competitor map
- Ad copy
- LP outline
- Market report

Displayed labels:

- credits

Displayed metrics:

- なし

### Section 2

Title:

```text
Demand Discovery / Competitor Analysis / Ad and LP Generation / Market Reports
```

Content:

4 つの機能カードで、需要発見、競合分析、広告と LP 生成、市場レポートを説明する。

Displayed cards:

- Demand Discovery
- Competitor Analysis
- Ad and LP Generation
- Market Reports

Displayed labels:

- なし

Displayed metrics:

- なし

---

## User Actions

- Start free
- View pricing
- Header navigation
- Language switch
- Login

---

## Empty States

なし。

---

## Current Labels

```text
AdFlow AI
AI demand intelligence for ad teams
Demand scan
Competitor map
Ad copy
LP outline
Market report
Demand Discovery
Competitor Analysis
Ad and LP Generation
Market Reports
credits
```

---

## Current Buttons

```text
Start free
View pricing
Log in
EN
日本語
```

---

## Current Messages

```text
Find the next sellable angle before demand gets expensive.
AdFlow AI connects reviews, social signals, competitor messages, search demand, ad copy, and LP structure in one credit-based workflow.
Find repeatable demand signals before you write the next campaign.
Compare positioning, claims, and proof points across the market.
Turn validated demand into ad copy and landing page outlines.
Summarize evidence, risks, and next moves for the team.
```

---

## Conversion Goal

ユーザーに Pricing を確認させる、または Login して無料利用を開始させる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/pricing
```

Purpose:

プラン選択、クレジット残高確認、追加クレジット購入、JPY / USD 切り替え、Stripe Checkout への導線を提供する。

---

## Hero Section

Headline:

```text
Plans for demand validation and campaign production.
```

Subtitle:

```text
Start with free monthly credits, upgrade for larger workflows, and add one-time credit packs whenever a launch needs more analysis.
```

CTA Buttons:

- Choose Plan -> Stripe Checkout
- Buy Credits -> Stripe Checkout
- Manage billing -> Stripe Billing Portal

---

## Main Sections

### Section 1

Title:

```text
Credit billing
```

Content:

プランとクレジット残高を表示する。

Displayed cards:

- Free
- Starter
- Pro
- Business

Displayed labels:

- Credit balance
- Total
- Monthly
- Purchased
- Lifetime used
- Japan / JPY
- Global / USD
- Recommended

Displayed metrics:

- total credits
- monthly credits
- purchased credits
- lifetime used credits

### Section 2

Title:

```text
Additional Credits
```

Content:

追加クレジットパックを表示する。

Displayed cards:

- 1,000 credits
- 5,000 credits
- 20,000 credits
- 50,000 credits

Displayed labels:

- credits that do not expire.
- Purchased credits are consumed after monthly credits.

Displayed metrics:

- credit amount
- price

### Section 3

Title:

```text
FAQ
```

Content:

クレジット、繰り越し、通貨、キャンセル、反映タイミングの FAQ。

Displayed cards:

- What are credits?
- Do monthly credits roll over?
- Can I pay in yen or dollars?
- What happens when I cancel?
- When are purchased credits reflected?

Displayed labels:

- なし

Displayed metrics:

- なし

---

## User Actions

- Switch currency
- Choose Plan
- Buy Credits
- Manage billing
- Start free
- Login if required
- Change language

---

## Empty States

- billing profile がない場合、プラン状態が未契約または free として表示される想定
- credit balance が取得できない場合、残高カードは読み込みまたは fallback 表示
- Stripe env 未設定の場合、Checkout API が失敗する可能性がある

---

## Current Labels

```text
Credit billing
Monthly Credits
Additional Credits
Choose Plan
Buy Credits
Start free
Recommended
/ month
Manage billing
Credit balance
Total
Monthly
Purchased
Lifetime used
Japan / JPY
Global / USD
```

---

## Current Buttons

```text
Choose Plan
Buy Credits
Start free
Manage billing
Japan / JPY
Global / USD
```

---

## Current Messages

```text
Plans for demand validation and campaign production.
Start with free monthly credits, upgrade for larger workflows, and add one-time credit packs whenever a launch needs more analysis.
Purchased credits are consumed after monthly credits.
credits that do not expire.
Billing portal failed.
```

---

## Conversion Goal

有料プラン選択、追加クレジット購入、または無料開始。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/features
```

Purpose:

機能説明ページ。Demand Intelligence、広告 LP ペア分析、AI レビュー分離、Outcome Learning を説明する。

---

## Hero Section

Headline:

```text
Demand evidence, AI proposals, and implementation context in one workflow.
```

Subtitle:

```text
AdFlow AI helps teams move from scattered market signals to reviewed ad and LP improvements.
```

CTA Buttons:

- View pricing -> `/pricing`
- Contact -> `/contact`

---

## Main Sections

### Section 1

Title:

```text
Demand Intelligence
```

Content:

不満、欲求、検索意図、競合ギャップ、根拠を使えるシグナルに構造化する説明。

Displayed cards:

- Demand Intelligence
- Ad and LP Pair Analysis
- AI Review Separation
- Outcome Learning

Displayed labels:

- Features

Displayed metrics:

- なし

---

## User Actions

- Pricing へ遷移
- Contact へ遷移
- Header navigation
- Language switch

---

## Empty States

なし。

---

## Current Labels

```text
Features
Demand Intelligence
Ad and LP Pair Analysis
AI Review Separation
Outcome Learning
```

---

## Current Buttons

```text
View pricing
Contact
Log in
```

---

## Current Messages

```text
Structure complaints, desires, search intent, competitor gaps, and evidence into usable signals.
Review whether the ad promise, LP hero, CTA, and offer match the same user intent.
Separate proposal generation from risk review so humans approve changes intentionally.
Record measured outcomes and feed successful, failed, or inconclusive patterns into future analysis.
```

---

## Conversion Goal

機能理解を深め、Pricing または Contact に進ませる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/use-cases
```

Purpose:

想定ユーザー別の利用シーンを説明する。

---

## Hero Section

Headline:

```text
Built for teams that need evidence before changing campaigns.
```

Subtitle:

```text
Use AdFlow AI to sharpen campaigns, validate LP changes, and turn market signals into implementation tasks.
```

CTA Buttons:

- View pricing -> `/pricing`
- Contact -> `/contact`

---

## Main Sections

### Section 1

Title:

```text
Solo builders / Small SaaS teams / Ad operators
```

Content:

個人開発者、小規模 SaaS、広告運用者それぞれのユースケースを説明する。

Displayed cards:

- Solo builders
- Small SaaS teams
- Ad operators

Displayed labels:

- Use cases

Displayed metrics:

- なし

---

## User Actions

- Pricing へ遷移
- Contact へ遷移
- Header navigation
- Language switch

---

## Empty States

なし。

---

## Current Labels

```text
Use cases
Solo builders
Small SaaS teams
Ad operators
```

---

## Current Buttons

```text
View pricing
Contact
Log in
```

---

## Current Messages

```text
Validate product angles and landing page claims before spending heavily on traffic.
Find repeated customer pains and convert them into campaign tests.
Compare ads, LPs, evidence, and outcomes across client workflows.
```

---

## Conversion Goal

ユーザーが自分の利用シーンを認識し、Pricing または Contact に進む。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/faq
```

Purpose:

導入前の不安を解消する FAQ ページ。

---

## Hero Section

Headline:

```text
Questions teams ask before using AdFlow AI.
```

Subtitle:

```text
Clear answers about credits, AI outputs, sources, and billing.
```

CTA Buttons:

- View pricing -> `/pricing`
- Contact -> `/contact`

---

## Main Sections

### Section 1

Title:

```text
FAQ
```

Content:

売上予測、OpenAI-only、外部ソースキー、AI 提案の自動適用について回答する。

Displayed cards:

- Does AdFlow AI predict sales?
- Can I use only OpenAI?
- What happens when external source keys are missing?
- Are AI suggestions applied automatically?

Displayed labels:

- FAQ

Displayed metrics:

- なし

---

## User Actions

- FAQ を読む
- Pricing へ遷移
- Contact へ遷移
- Language switch

---

## Empty States

なし。

---

## Current Labels

```text
FAQ
```

---

## Current Buttons

```text
View pricing
Contact
Log in
```

---

## Current Messages

```text
Does AdFlow AI predict sales?
No. It structures evidence and supports human decisions. It does not guarantee demand, revenue, or success.
Can I use only OpenAI?
Yes. OpenAI-only mode runs the analysis workflow with OpenAI when the API key and model are configured.
What happens when external source keys are missing?
Connectors skip safely or use the configured synthetic fallback for development.
Are AI suggestions applied automatically?
No. AI proposals are reviewed first, and only apply-ready items become Codex task prompts.
```

---

## Conversion Goal

導入前の不安を下げ、Pricing / Contact / Login へ送る。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/contact
```

Purpose:

問い合わせフォームまたは問い合わせ導線の提示。

---

## Hero Section

Headline:

```text
Talk to the AdFlow AI team.
```

Subtitle:

```text
Send support, billing, or partnership questions. This form is a prepared contact surface for production wiring.
```

CTA Buttons:

- Send message -> form submit

---

## Main Sections

### Section 1

Title:

```text
Contact
```

Content:

名前、メール、件名、メッセージ入力フォーム。

Displayed cards:

- Contact form

Displayed labels:

- Name
- Email
- Topic
- Message

Displayed metrics:

- なし

---

## User Actions

- Name 入力
- Email 入力
- Topic 入力
- Message 入力
- Send message
- Language switch

---

## Empty States

フォーム未入力状態。

---

## Current Labels

```text
Name
Email
Topic
Message
```

---

## Current Buttons

```text
Send message
```

---

## Current Messages

```text
For production, connect this form to your support inbox or CRM.
This form is a prepared contact surface for production wiring.
```

---

## Conversion Goal

問い合わせを送信させる、または商談 / サポート導線につなげる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/terms
```

Purpose:

利用規約を提示する。

---

## Hero Section

Headline:

```text
Terms of Service
```

Subtitle:

```text
なし
```

CTA Buttons:

- なし

---

## Main Sections

### Section 1

Title:

```text
Service / Accounts / Credits / AI output / Prohibited use / Service changes / Governing law
```

Content:

サービス内容、アカウント責任、クレジット、AI 出力、禁止事項、サービス変更、準拠法を説明する。

Displayed cards:

- Legal content sections

Displayed labels:

- Service
- Accounts
- Credits
- AI output
- Prohibited use
- Service changes
- Governing law

Displayed metrics:

- なし

---

## User Actions

- 規約確認
- Footer navigation
- Header navigation

---

## Empty States

なし。

---

## Current Labels

```text
Terms of Service
Service
Accounts
Credits
AI output
Prohibited use
Service changes
Governing law
```

---

## Current Buttons

```text
なし
```

---

## Current Messages

```text
AI-generated output may be inaccurate. Users are responsible for reviewing and deciding how to use the output.
Monthly credits reset each billing period. Purchased credits remain in the user's balance until consumed.
```

---

## Conversion Goal

法務不安を下げ、サービス利用前の確認を完了させる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/privacy
```

Purpose:

プライバシーポリシーを提示する。

---

## Hero Section

Headline:

```text
Privacy Policy
```

Subtitle:

```text
なし
```

CTA Buttons:

- なし

---

## Main Sections

### Section 1

Title:

```text
Information collected / Purpose of use / Payment processing / Data storage / Third parties / Contact
```

Content:

取得情報、利用目的、決済、データ保存、第三者提供、問い合わせ先を説明する。

Displayed cards:

- Legal content sections

Displayed labels:

- Information collected
- Purpose of use
- Payment processing
- Data storage
- Third parties
- Contact

Displayed metrics:

- なし

---

## User Actions

- ポリシー確認
- Header / Footer navigation

---

## Empty States

なし。

---

## Current Labels

```text
Privacy Policy
Information collected
Purpose of use
Payment processing
Data storage
Third parties
Contact
```

---

## Current Buttons

```text
なし
```

---

## Current Messages

```text
Card numbers are processed by Stripe and are not stored by AdFlow AI.
Application data is stored in Supabase. Billing events are processed through Stripe webhooks.
For privacy requests, contact support@example.com.
```

---

## Conversion Goal

個人情報と決済情報の取り扱いへの不安を下げる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/legal
```

Purpose:

法務情報への index ページ。

---

## Hero Section

Headline:

```text
Legal information
```

Subtitle:

```text
Policies and disclosures for AdFlow AI.
```

CTA Buttons:

- Terms -> `/terms`
- Privacy -> `/privacy`
- Specified Commercial Transaction Act -> `/legal/tokusho`

---

## Main Sections

### Section 1

Title:

```text
Important notes
```

Content:

AdFlow AI は需要、CV、売上、キャンペーン成功を保証しないことを説明する。

Displayed cards:

- Terms of Service
- Privacy Policy
- Specified Commercial Transaction Act
- Important notes

Displayed labels:

- Legal information
- Important notes

Displayed metrics:

- なし

---

## User Actions

- Terms へ遷移
- Privacy へ遷移
- Tokusho へ遷移

---

## Empty States

なし。

---

## Current Labels

```text
Legal information
Terms of Service
Privacy Policy
Specified Commercial Transaction Act
Important notes
```

---

## Current Buttons

```text
Terms
Privacy
Legal
Specified Commercial Transaction Act
```

---

## Current Messages

```text
AdFlow AI supports decision-making with structured evidence. It does not guarantee demand, conversion, revenue, or campaign success.
```

---

## Conversion Goal

利用前の法務確認を完了させる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/changelog
```

Purpose:

プロダクト更新履歴を表示する。

---

## Hero Section

Headline:

```text
Product updates
```

Subtitle:

```text
Recent improvements to AdFlow AI.
```

CTA Buttons:

- なし

---

## Main Sections

### Section 1

Title:

```text
Credit billing and pricing / Demand Intelligence Engine / Marketing i18n
```

Content:

直近の機能追加をカードで表示する。

Displayed cards:

- Credit billing and pricing
- Demand Intelligence Engine
- Marketing i18n

Displayed labels:

- Changelog

Displayed metrics:

- なし

---

## User Actions

- 更新履歴確認
- Header navigation

---

## Empty States

なし。

---

## Current Labels

```text
Changelog
Product updates
Credit billing and pricing
Demand Intelligence Engine
Marketing i18n
```

---

## Current Buttons

```text
なし
```

---

## Current Messages

```text
Added plans, credit packs, Stripe Checkout, and JPY/USD switching.
Replaced the legacy market research layer with evidence-backed demand workflows.
Added English and Japanese dictionaries for public pages.
```

---

## Conversion Goal

プロダクトが更新されている安心感を与え、Pricing / Login への心理的障壁を下げる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/login
```

Purpose:

Supabase Auth のログイン画面。Google OAuth ログイン導線を提供する。

---

## Hero Section

Headline:

```text
AdFlow AI
```

Subtitle:

```text
Review-first ad ops
```

CTA Buttons:

- Continue with Google -> Supabase OAuth

---

## Main Sections

### Section 1

Title:

```text
AdFlow AI
```

Content:

ログインカード。Google ログインボタンを表示する。

Displayed cards:

- Login card

Displayed labels:

- AdFlow AI

Displayed metrics:

- なし

---

## User Actions

- Continue with Google

---

## Empty States

- Supabase env 未設定時はログインが失敗する可能性がある

---

## Current Labels

```text
AdFlow AI
```

---

## Current Buttons

```text
Continue with Google
```

---

## Current Messages

```text
Google login failed.
```

---

## Conversion Goal

ログインしてダッシュボードへ進む。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/dashboard
```

Purpose:

登録済み広告、LP、Demand Intelligence、改善結果をもとに全体状況を確認する管理画面。

---

## Hero Section

Headline:

```text
Dashboard
```

Subtitle:

```text
Monitor real ads, LPs, Demand Intelligence, and measured outcomes.
```

CTA Buttons:

- 画面上の主要 CTA はページ内容に依存

---

## Main Sections

### Section 1

Title:

```text
KPI cards
```

Content:

広告データから集計した KPI を表示する。

Displayed cards:

- Total impressions
- Clicks
- CTR
- Spend
- CPC
- CVR
- Active campaigns

Displayed labels:

- Total impressions
- Clicks
- Spend
- Active campaigns

Displayed metrics:

- impressions
- clicks
- spend
- active campaign count
- CTR / CPC / CVR

### Section 2

Title:

```text
Recent improvements / Risk alerts / Pending PRs
```

Content:

改善提案、リスク、PR 状況を表示する。

Displayed cards:

- Recent Improvements
- Risk Alerts
- Pending PR List

Displayed labels:

- depends on component data

Displayed metrics:

- improvement score
- risk level
- PR status

---

## User Actions

- 各詳細へ遷移
- Sidebar navigation
- Header search
- Sync
- Logout

---

## Empty States

- 登録済み広告や LP がない場合、KPI は 0 または空状態
- 改善提案がない場合、recent improvements は空状態
- PR がない場合、pending PR list は空状態

---

## Current Labels

```text
Dashboard
Total impressions
Clicks
Spend
Active campaigns
Synced
Sync
Workspace
No project selected
Search campaigns, PRs, improvements
```

---

## Current Buttons

```text
Sync
Logout
Sidebar navigation items
```

---

## Current Messages

```text
Monitor real ads, LPs, Demand Intelligence, and measured outcomes.
No data
Loading
Signed out.
Sign out failed.
```

---

## Conversion Goal

ユーザーが次に確認すべき分析対象や改善対象へ移動する。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/projects
```

Purpose:

プロジェクトを作成し、広告、LP、ペア、履歴、分析 run を workspace 単位で整理する。

---

## Hero Section

Headline:

```text
Projects
```

Subtitle:

```text
Group X ads, landing pages, pairs, history, and analysis runs by workspace.
```

CTA Buttons:

- Create

---

## Main Sections

### Section 1

Title:

```text
Project creation form
```

Content:

プロジェクト名と説明を入力して作成する。

Displayed cards:

- Project cards

Displayed labels:

- Project name
- Description
- No description

Displayed metrics:

- project count

---

## User Actions

- Project name 入力
- Description 入力
- Create
- Project detail へ遷移

---

## Empty States

```text
No projects
Create a project before grouping ads and landing pages.
```

---

## Current Labels

```text
Projects
Project name
Description
No description
No projects
```

---

## Current Buttons

```text
Create
```

---

## Current Messages

```text
Project created.
Create failed.
Group X ads, landing pages, pairs, history, and analysis runs by workspace.
Create a project before grouping ads and landing pages.
```

---

## Conversion Goal

初回ユーザーに最初のプロジェクトを作成させる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/ads
```

Purpose:

X 広告を登録、一覧、編集、削除する。

---

## Hero Section

Headline:

```text
X Ads
```

Subtitle:

```text
Register X ads manually and keep every create, update, and delete in history.
```

CTA Buttons:

- New ad -> `/ads/new`

---

## Main Sections

### Section 1

Title:

```text
X Ads table
```

Content:

登録済み広告を表形式で表示する。

Displayed cards:

- Table rows

Displayed labels:

- Name
- Headline
- Destination
- Spend
- Status
- Actions

Displayed metrics:

- spend
- status

---

## User Actions

- New ad
- Edit ad
- Delete ad
- Confirm delete
- Cancel delete

---

## Empty States

```text
No X ads
Register an ad manually to start pair-based analysis.
```

---

## Current Labels

```text
X Ads
Name
Headline
Destination
Spend
Status
Actions
No X ads
```

---

## Current Buttons

```text
New ad
Edit ad
Delete ad
Delete
Cancel
```

---

## Current Messages

```text
Ad deleted.
Delete failed.
The ad will be removed, but the delete history remains available.
Deleting...
```

---

## Conversion Goal

広告を登録し、LP とペアにできる状態にする。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/lps
```

Purpose:

LP を登録、一覧、編集、削除する。

---

## Hero Section

Headline:

```text
Landing Pages
```

Subtitle:

```text
LP 管理画面。現在は一部英語固定文言の可能性あり。
```

CTA Buttons:

- New LP -> `/lps/new`

---

## Main Sections

### Section 1

Title:

```text
Landing Pages table
```

Content:

登録済み LP の URL、hero、CTA、指標を確認する。

Displayed cards:

- LP table rows

Displayed labels:

- Name
- URL
- Hero
- CTA
- Status
- Actions

Displayed metrics:

- bounce rate
- session duration
- scroll depth
- page speed

---

## User Actions

- New LP
- Edit LP
- Delete LP

---

## Empty States

```text
No landing pages
Register an LP to populate this analysis view.
```

---

## Current Labels

```text
Landing Pages
Name
URL
Hero
CTA
Actions
```

---

## Current Buttons

```text
New LP
Edit
Delete
Save LP
```

---

## Current Messages

```text
No landing pages
Register an LP to populate this analysis view.
```

---

## Conversion Goal

LP を登録し、広告とのペア分析に進める。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/pairs
```

Purpose:

広告と LP をペアにし、分析対象を作成する。

---

## Hero Section

Headline:

```text
Ad LP Pairs
```

Subtitle:

```text
広告と LP を 1 つの改善単位として管理する。
```

CTA Buttons:

- New pair -> `/pairs/new`

---

## Main Sections

### Section 1

Title:

```text
Pairs list
```

Content:

ペア名、広告、LP、最終分析日時、ステータスを表示する。

Displayed cards:

- Pair rows / cards

Displayed labels:

- Pair
- Ad
- LP
- Last analyzed
- Status

Displayed metrics:

- last_analyzed_at

---

## User Actions

- New pair
- Pair detail
- Edit pair
- Delete pair

---

## Empty States

```text
No pairs
Create a pair before running analysis.
```

---

## Current Labels

```text
Ad LP Pairs
Pair
Ad
LP
Status
Last analyzed
```

---

## Current Buttons

```text
New pair
Edit
Delete
```

---

## Current Messages

```text
Create a pair before running analysis.
```

---

## Conversion Goal

広告と LP のペアを作成し、Pair Detail で分析を実行させる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/pairs/[pairId]
```

Purpose:

ペア詳細。Pair Analysis、Demand Intelligence、AI comparison、Outcomes、履歴、LP versions、AI OS logs を統合表示する。

---

## Hero Section

Headline:

```text
Pair name
```

Subtitle:

```text
Pair detail
```

CTA Buttons:

- Settings
- Run analysis

---

## Main Sections

### Section 1

Title:

```text
Pair summary
```

Content:

広告側と LP 側の訴求、CTA、offer、target を並べて確認する。

Displayed cards:

- X Ad
- Landing Page

Displayed labels:

- No CTA
- campaign / LP fields

Displayed metrics:

- CTR
- CVR
- bounce rate

### Section 2

Title:

```text
Analysis / AI proposals / Demand Intelligence / Outcomes / History / LP Versions / AI OS
```

Content:

タブまたはセクションで分析結果を表示し、意思決定、Codex task、Outcome draft を操作する。

Displayed cards:

- Analysis run cards
- AI proposal cards
- Demand Intelligence panels
- Source status
- Validation
- Solution Fit
- Monitoring
- Search Demand
- Market Size
- Outcome Learning
- Evidence
- Outcome cards
- History cards
- LP version cards

Displayed labels:

- Run metadata
- Created
- No analysis runs
- No AI proposals
- No demand intelligence
- No source runs
- No validation data
- No solution fit results yet.
- No monitoring snapshots
- No search demand
- No market size estimates
- No outcome learning
- No clusters
- No outcomes
- No history
- No orchestration log
- No AI recommendation
- No LP versions

Displayed metrics:

- score
- confidence
- risk level
- validation score
- fit score
- gap score
- growth
- market size score
- search demand score
- metric delta

---

## User Actions

- Run analysis
- Run demand scan
- Run fit
- Rebuild outcome learning
- Accept AI result
- Reject AI result
- Mark needs_review
- Mark apply_ready
- Generate Codex Task
- Create Outcome Draft
- Create outcome
- Edit metrics
- Save measured outcome
- Close edit panel

---

## Empty States

```text
No analysis runs
Run analysis to save pair-level results.
No AI proposals
Run analysis to compare Grok, Gemini, ChatGPT, and reviewer outputs.
No demand intelligence
Run demand intelligence to collect pains, desires, competitor gaps, demand signals, and evidence before analysis.
No source runs
Run demand intelligence to inspect connector status.
No validation data
Run demand intelligence to score signal quality and evidence strength.
No search demand
Run demand intelligence to create search demand signals.
No market size estimates
Run demand intelligence to create cautious segment estimates.
No outcomes
Create an outcome draft after implementation, then save before and after metrics.
No history
Create, update, and delete events for this pair will appear here.
```

---

## Current Labels

```text
Run metadata
Created
Cluster
Run validation
Outcome title
Description
Learning notes
Edit outcome metrics
No CTA
No summary
No overview was generated.
```

---

## Current Buttons

```text
Settings
Run analysis
Running...
Run demand scan
Scanning...
Run fit
Checking...
Generate Codex Task
Create Outcome Draft
Create outcome
Save measured outcome
Edit metrics
Close
accepted
rejected
needs_review
apply_ready
```

---

## Current Messages

```text
Analysis completed.
Analysis failed.
Demand intelligence completed.
Demand intelligence failed.
Solution fit completed.
Solution fit failed.
Outcome learning rebuilt.
Outcome learning rebuild failed.
Outcome created.
Outcome updated.
Decision failed.
Codex task prompt generated.
Codex task generation failed.
Outcome draft created.
Outcome draft creation failed.
Describe an app idea, offer, or positioning to test
Measured outcomes will be linked back to demand signals here.
```

---

## Conversion Goal

最重要ゴールは `Run analysis` と `Run demand scan` の実行。次に `apply_ready` 判断、Codex task 生成、Outcome 登録まで進めること。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/history
```

Purpose:

作成、更新、削除、AI result decision の履歴を確認する。

---

## Hero Section

Headline:

```text
History
```

Subtitle:

```text
変更履歴一覧。
```

CTA Buttons:

- なし

---

## Main Sections

### Section 1

Title:

```text
Change history
```

Content:

entity type、action、summary、reason、created_at を表示する。

Displayed cards:

- history rows

Displayed labels:

- Entity
- Action
- Summary
- Reason
- Created

Displayed metrics:

- history count

---

## User Actions

- 履歴確認
- Sidebar navigation

---

## Empty States

```text
No history
```

---

## Current Labels

```text
History
Entity
Action
Summary
Reason
Created
```

---

## Current Buttons

```text
なし
```

---

## Current Messages

```text
Create, update, and delete events will appear here.
```

---

## Conversion Goal

変更の透明性を確認し、分析結果の根拠として履歴を理解する。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/orchestration
```

Purpose:

AI agents、router runs、agent results、scorecards を確認し、AI 提案の採否や Codex task 化を行う。

---

## Hero Section

Headline:

```text
AI OS
```

Subtitle:

```text
AI agents, router runs, scorecards, recent AI proposals
```

CTA Buttons:

- なし、または result 操作用ボタン

---

## Main Sections

### Section 1

Title:

```text
AI agents / Router runs / Scorecards / Recent AI proposals
```

Content:

AI agent の役割、実行履歴、スコアカード、最近の提案を表示する。

Displayed cards:

- agent cards
- run cards
- scorecard cards
- AI result cards

Displayed labels:

- Provider
- Role
- Task
- Confidence
- Risk
- Score
- Decision status

Displayed metrics:

- router score
- average score
- accepted count
- rejected count
- apply ready count
- confidence
- risk

---

## User Actions

- AI result decision
- Generate Codex Task
- View run results

---

## Empty States

```text
No orchestration runs
No AI proposals
No scorecards
```

---

## Current Labels

```text
AI OS
Provider
Role
Task
Risk
Confidence
Score
Decision
```

---

## Current Buttons

```text
accepted
rejected
needs_review
apply_ready
Generate Codex Task
```

---

## Current Messages

```text
Run analysis to route this pair through specialized AI desks.
Review before marking apply-ready.
```

---

## Conversion Goal

AI 提案をレビューし、実装可能な提案だけを `apply_ready` にする。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/campaigns
```

Purpose:

登録済み広告をキャンペーン名で集計し、キャンペーン単位の概要を表示する。

---

## Hero Section

Headline:

```text
Campaigns
```

Subtitle:

```text
Campaign overview from registered ads.
```

CTA Buttons:

- なし

---

## Main Sections

### Section 1

Title:

```text
Campaign metrics / Campaign table
```

Content:

キャンペーンごとの指標、テーブル、検索入力を表示する。

Displayed cards:

- Campaign metric cards
- Campaign table

Displayed labels:

- Search campaigns
- Campaign
- Spend
- Clicks
- CTR
- Status

Displayed metrics:

- spend
- clicks
- CTR
- conversions

---

## User Actions

- Search campaigns
- Campaign detail へ遷移

---

## Empty States

```text
No campaigns
Connect an ad source or run analysis to populate campaigns.
```

---

## Current Labels

```text
Campaigns
Search campaigns
No campaigns
```

---

## Current Buttons

```text
なし
```

---

## Current Messages

```text
Connect an ad source or run analysis to populate campaigns.
```

---

## Conversion Goal

キャンペーン単位で問題のある広告や改善対象に気づかせる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/improvements
```

Purpose:

analysis_runs から生成された改善提案を一覧表示する。

---

## Hero Section

Headline:

```text
Improvements
```

Subtitle:

```text
Review generated improvements and risks.
```

CTA Buttons:

- なし

---

## Main Sections

### Section 1

Title:

```text
Improvement list
```

Content:

改善提案カード、スコア、リスク、概要を表示する。

Displayed cards:

- Improvement cards

Displayed labels:

- Risk
- Score
- Review warnings

Displayed metrics:

- analysis score
- risk level

---

## User Actions

- Improvement detail へ遷移

---

## Empty States

```text
No improvements
Run analysis to generate improvements.
```

---

## Current Labels

```text
Improvements
Risk
Score
Review warnings
```

---

## Current Buttons

```text
View detail
```

---

## Current Messages

```text
No exaggerated claims, brand risks, or dangerous changes were detected.
```

---

## Conversion Goal

改善提案の詳細確認、承認、PR 準備へ進ませる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/improvements/[improvementId]
```

Purpose:

改善提案の詳細、差分、レビュー警告、承認操作を表示する。

---

## Hero Section

Headline:

```text
Improvement detail
```

Subtitle:

```text
改善提案の詳細。
```

CTA Buttons:

- Approve
- Create PR
- Reject

---

## Main Sections

### Section 1

Title:

```text
Improvement detail / Diff / Review warnings
```

Content:

提案内容、差分、警告、承認ダイアログ。

Displayed cards:

- Detail card
- Diff viewer
- Review warnings

Displayed labels:

- Problems
- Suggestions
- Review warnings
- Diff

Displayed metrics:

- risk level

---

## User Actions

- Approve
- Create PR
- Reject
- Cancel
- Confirm

---

## Empty States

```text
No selected improvement
```

---

## Current Labels

```text
Approve improvement?
Create pull request?
Reject improvement?
```

---

## Current Buttons

```text
Approve
Create PR
Reject
Cancel
```

---

## Current Messages

```text
Improvement approved for PR preparation.
PR creation request completed.
Improvement marked as rejected in this review session.
```

---

## Conversion Goal

改善提案を承認または却下し、実装準備へ進める。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/prs
```

Purpose:

PR レビュー状態を確認する。

---

## Hero Section

Headline:

```text
PR Reviews
```

Subtitle:

```text
Review pull request status.
```

CTA Buttons:

- なし

---

## Main Sections

### Section 1

Title:

```text
Pull requests
```

Content:

GitHub provider または memory provider から PR 一覧を表示する。

Displayed cards:

- PR cards / rows

Displayed labels:

- PR
- Status
- Review

Displayed metrics:

- PR count
- review status

---

## User Actions

- PR 状態確認
- 外部 PR へ移動する可能性

---

## Empty States

```text
No PRs
```

---

## Current Labels

```text
PR Reviews
PR
Status
Review
```

---

## Current Buttons

```text
なし
```

---

## Current Messages

```text
No PRs available when no real PR connection exists.
```

---

## Conversion Goal

実装レビューの状態を確認し、改善ループを閉じる。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Page

Route:

```text
/settings
```

Purpose:

接続設定、AI mode、アカウント設定を確認、保存する。

---

## Hero Section

Headline:

```text
Settings
```

Subtitle:

```text
Configure providers and workspace defaults.
```

CTA Buttons:

- Save settings

---

## Main Sections

### Section 1

Title:

```text
AI mode / Connections
```

Content:

OpenAI-only と AI OS router mode の切り替え、Supabase project、X Ads connection status を入力する。

Displayed cards:

- AI mode selector
- connection settings form

Displayed labels:

- Supabase project
- X Ads connection status
- Save settings

Displayed metrics:

- なし

---

## User Actions

- AI mode 切り替え
- Supabase project 入力
- X Ads connection status 入力
- Save settings

---

## Empty States

初期値:

```text
supabaseProject: adflow-prod
xAdsStatus: pending
```

---

## Current Labels

```text
Settings
Supabase project
X Ads connection status
Save settings
OpenAI API only
AI OS router
```

---

## Current Buttons

```text
Save settings
OpenAI API only
AI OS router
```

---

## Current Messages

```text
Settings validated locally.
```

---

## Conversion Goal

分析実行に必要な provider / mode 設定を確認し、ユーザーに運用準備ができている感覚を与える。

## Screenshots

- screenshot path: なし
- screenshot filename: なし

---

# Full Copy Inventory

このセクションは、別 AI がコピー、ラベル、CTA、オンボーディングをレビューするための一覧です。完全な DOM 抽出ではなく、現在の主要ユーザー向け文言をページ別に整理したものです。

## Global

Navigation:

```text
AdFlow AI
Features
Use Cases
Pricing
FAQ
Contact
Log in
Dashboard
Projects
X Ads
Landing Pages
Ad LP Pairs
AI OS
History
Campaigns
LP Analysis
Improvements
PR Reviews
Settings
EN
日本語
```

Common:

```text
Workspace
Search campaigns, PRs, improvements
Synced
Sync
Logout
Signed out.
Sign out failed.
No project selected
No data
Loading
This field is required.
Enter a valid email address.
Start free
View pricing
Learn more
Send
Back to pricing
Go to dashboard
Open navigation
Close navigation
```

Footer:

```text
Product
Company
Legal
Terms
Privacy
Specified Commercial Transaction Act
(c) 2026 AdFlow AI. All rights reserved.
```

## Home

Headline:

```text
Find the next sellable angle before demand gets expensive.
```

Labels:

```text
AI demand intelligence for ad teams
Demand scan
Competitor map
Ad copy
LP outline
Market report
credits
Demand Discovery
Competitor Analysis
Ad and LP Generation
Market Reports
```

Buttons:

```text
Start free
View pricing
```

## Pricing

Headline:

```text
Plans for demand validation and campaign production.
```

Labels:

```text
Credit billing
Monthly Credits
Additional Credits
Recommended
/ month
Credit balance
Total
Monthly
Purchased
Lifetime used
Japan / JPY
Global / USD
Free
Starter
Pro
Business
```

Buttons:

```text
Choose Plan
Buy Credits
Start free
Manage billing
```

Messages:

```text
Purchased credits are consumed after monthly credits.
credits that do not expire.
Billing portal failed.
```

## Features

```text
Features
Demand evidence, AI proposals, and implementation context in one workflow.
Demand Intelligence
Ad and LP Pair Analysis
AI Review Separation
Outcome Learning
```

## Use Cases

```text
Use cases
Built for teams that need evidence before changing campaigns.
Solo builders
Small SaaS teams
Ad operators
```

## FAQ

```text
FAQ
Questions teams ask before using AdFlow AI.
Does AdFlow AI predict sales?
Can I use only OpenAI?
What happens when external source keys are missing?
Are AI suggestions applied automatically?
```

## Contact

```text
Contact
Talk to the AdFlow AI team.
Name
Email
Topic
Message
Send message
For production, connect this form to your support inbox or CRM.
```

## Legal Pages

```text
Legal information
Terms of Service
Privacy Policy
Specified Commercial Transaction Act
Important notes
Service
Accounts
Credits
AI output
Prohibited use
Service changes
Governing law
Information collected
Purpose of use
Payment processing
Data storage
Third parties
Seller
Operations manager
Address
Sales price
Payment method
Payment timing
Service delivery
Returns and cancellation
```

## Changelog

```text
Changelog
Product updates
Credit billing and pricing
Demand Intelligence Engine
Marketing i18n
```

## Login

```text
AdFlow AI
Continue with Google
Google login failed.
```

## Dashboard

```text
Dashboard
Monitor real ads, LPs, Demand Intelligence, and measured outcomes.
Total impressions
Clicks
CTR
Spend
CPC
CVR
Active campaigns
```

## Projects

```text
Projects
Group X ads, landing pages, pairs, history, and analysis runs by workspace.
Project name
Description
Create
No description
No projects
Create a project before grouping ads and landing pages.
Project created.
Create failed.
```

## Ads

```text
X Ads
Register X ads manually and keep every create, update, and delete in history.
New ad
No X ads
Register an ad manually to start pair-based analysis.
Name
Headline
Destination
Spend
Status
Actions
Edit ad
Delete ad
The ad will be removed, but the delete history remains available.
Ad deleted.
Delete failed.
Deleting...
Delete
Cancel
```

## Landing Pages

```text
Landing Pages
LP Analysis
Inspect registered LP hero, CTA, behavior, and performance metrics.
No landing pages
Register an LP to populate this analysis view.
Hero
CTA
URL
Actions
Save LP
```

## Pairs

```text
Ad LP Pairs
Run analysis
Running...
No CTA
No analysis runs
Run analysis to save pair-level results.
No AI proposals
Run analysis to compare Grok, Gemini, ChatGPT, and reviewer outputs.
No demand intelligence
Run demand intelligence to collect pains, desires, competitor gaps, demand signals, and evidence before analysis.
Run demand scan
Scanning...
Run metadata
Created
No source runs
No validation data
Describe an app idea, offer, or positioning to test
Run fit
Checking...
No solution fit results yet.
No monitoring snapshots
No search demand
No market size estimates
No outcome learning
No clusters
Outcome title
Description
Create outcome
Edit outcome metrics
Learning notes
Save measured outcome
Edit metrics
Close
No outcomes
No history
No orchestration log
No AI recommendation
No LP versions
Generate Codex Task
Create Outcome Draft
```

## History

```text
History
Entity
Action
Summary
Reason
Created
No history
```

## Orchestration

```text
AI OS
AI agents
Router runs
Scorecards
Recent AI proposals
Provider
Role
Task
Risk
Confidence
Score
Decision
accepted
rejected
needs_review
apply_ready
Generate Codex Task
```

## Campaigns

```text
Campaigns
Search campaigns
No campaigns
Connect an ad source or run analysis to populate campaigns.
AI detected problems
No analysis suggestions yet.
```

## Improvements

```text
Improvements
Risk
Score
Review warnings
No exaggerated claims, brand risks, or dangerous changes were detected.
Approve
Create PR
Reject
Approve improvement?
Create pull request?
Reject improvement?
Cancel
Improvement approved for PR preparation.
PR creation request completed.
Improvement marked as rejected in this review session.
```

## PR Reviews

```text
PR Reviews
PR
Status
Review
No PRs
```

## Settings

```text
Settings
OpenAI API only
AI OS router
Supabase project
X Ads connection status
Save settings
Settings validated locally.
```

## UI Review Notes For Another AI

重点レビュー観点:

- 公開サイトの日本語コピーが文字化けしていないか
- CTA が `Start free`, `View pricing`, `Log in` に分散しており、主導線が明確か
- Pricing で credits の価値と消費量が十分に説明されているか
- Pair Detail が多機能すぎて初回ユーザーに難しくないか
- Demand Intelligence の「需要断定ではない」注意が UI 上で十分に見えるか
- 管理画面の英語固定文言を日本語化すべきか
- Empty State が次の行動を明確に示しているか
- Settings の保存が local validation のみであることがユーザーに誤解されないか
- Contact form が production wiring 前提であることが公開状態として適切か
- Tokusho の placeholder 情報を本番前に差し替える必要がある
