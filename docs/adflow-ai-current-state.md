# adflow-ai 現状仕様ドキュメント

本書は、2026年6月12日時点のリポジトリ内の実装コード、ルーティング、Supabaseマイグレーション、環境変数例、ビルド結果を根拠に、現在確認できる機能だけを整理したものです。マーケティングページ内の訴求文や、名前・コメントだけが存在する処理は、動作する実装の根拠として扱っていません。

## 1. アプリ概要

adflow-ai は、広告プロジェクトに対して X 広告、ランディングページ（LP）、広告とLPの組み合わせを登録し、分析結果・改善提案・需要調査・実施後の成果を管理するWebアプリです。

現在の中心的な処理は次の2系統です。

- **広告最適化**: プロジェクト、X広告、LP、広告とLPのペアを登録し、ペア単位の分析、AI提案、需要インテリジェンス、改善成果、A/Bテストを管理する。
- **需要発見**: チャット形式で入力内容を整理し、必要に応じて外部ソースまたは合成データを使った需要調査を実行し、結果を保存・表示する。

データ保存と認証には Supabase を使用します。フロントエンドは Supabase を直接利用するCRUDと、FastAPIバックエンドを経由する分析・外部連携処理を併用しています。課金は Stripe とクレジット台帳で実装されています。

## 2. 実装済み機能一覧

- Supabase Google OAuthによるログイン・ログアウト
- ログイン必須ページへの未認証アクセス時の `/login` リダイレクト
- プロジェクトの作成・一覧表示
- X広告データの手動登録・編集・削除・一覧表示
- X Ads OAuth接続、手動トークン接続、接続検証、失効
- X Adsアカウント取得と直近30日データの同期
- AI提案を元にしたX Ads公開ドラフトの作成、承認・却下、承認済みドラフトの公開
- LPの手動登録・編集・削除・一覧表示
- 公開URLからのLP情報取得と登録
- LPの作成・更新時のバージョンスナップショット保存
- 広告とLPのペアの作成・編集・削除・一覧・詳細表示
- 登録データの作成・更新・削除履歴の保存と表示
- ペア単位の分析実行と分析結果保存
- OpenAIのみ、または複数プロバイダーを使うAI分析モードの選択
- AIエージェントのルーティング、提案結果、判断状態、スコアカードの保存・表示
- AI提案への判断状態の設定と、`apply_ready` 提案からCodex向け実装タスク文面の生成
- ペア単位の需要インテリジェンス実行
- 需要シグナル、クラスタ、検証結果、解決策適合度、証拠、検索需要、市場規模推定、スナップショット、成果学習の保存・表示
- チャット形式の需要発見セッション作成、メッセージ追加、調査実行
- 改善施策の実施前後メトリクスと学習メモの保存・更新
- プロジェクト単位の広告A/Bテスト作成、状態変更、暫定勝者表示
- 登録済みX広告をキャンペーン名単位に集計したキャンペーン一覧・詳細表示
- 最新LPの登録値を使ったLP構造・行動・性能値の表示
- 分析結果から抽出した改善提案一覧・詳細表示
- ダッシュボードと結果集約画面
- 言語（日本語・英語）と分析AIモードのユーザー設定保存
- Stripe Checkoutによるサブスクリプション購入と追加クレジット購入
- Stripe Billing Portalへの遷移
- Stripe Webhookによる契約状態更新、月次クレジット付与、購入クレジット付与、解約時のFreeプラン反映
- クレジット残高表示と、対象バックエンド処理実行時のクレジット消費
- 公開マーケティングページ、料金ページ、法務ページ、請求結果ページの表示

## 3. 画面・ページ構成

### 公開ページ

| ルート | 現在の内容 |
| --- | --- |
| `/` | 公開トップページ |
| `/features` | 機能紹介ページ |
| `/how-it-works` | 利用方法の説明ページ |
| `/compare` | 比較情報ページ |
| `/why-adflow` | サービス説明ページ |
| `/use-cases` | ユースケース紹介ページ |
| `/faq` | FAQページ |
| `/contact` | 問い合わせページ |
| `/changelog` | 変更履歴の公開ページ |
| `/pricing` | プラン、追加クレジット、クレジット残高、Billing Portal導線を表示するページ |
| `/terms`, `/privacy` | 法務コンテンツへの公開ルート |
| `/legal`, `/legal/terms`, `/legal/privacy`, `/legal/tokusho` | 法務情報、利用規約、プライバシー、特定商取引法表記 |
| `/billing/success`, `/billing/cancel` | Stripe Checkout後の結果表示ページ |
| `/login` | Google OAuthログインページ |

### ログイン必須ページ

| ルート | 現在の内容 |
| --- | --- |
| `/dashboard` | 登録件数、需要調査・成果の概要、次に行う操作への導線 |
| `/ad-optimization` | プロジェクトの作成・一覧、X Ads接続操作 |
| `/ad-optimization/[projectId]` | プロジェクト内の広告、LP、ペア、結果、成果、履歴、A/Bテスト、X Ads操作 |
| `/demand-discovery` | チャット形式の需要発見と需要調査結果表示 |
| `/results` | 広告成果、需要調査結果、実装項目、活動履歴の集約表示 |
| `/projects` | プロジェクト作成・一覧 |
| `/projects/[projectId]` | プロジェクト名・説明と固定説明文の表示 |
| `/ads` | 登録済みX広告の一覧・削除 |
| `/ads/new` | X Ads同期または手動入力による広告登録 |
| `/ads/[adId]/edit` | X広告の編集 |
| `/lps` | 登録済みLPの一覧・削除 |
| `/lps/new` | URL取得または手動入力によるLP登録 |
| `/lps/[lpId]/edit` | LPの編集 |
| `/pairs` | 広告・LPペアの一覧、分析実行、削除 |
| `/pairs/new` | 広告・LPペアの作成 |
| `/pairs/[pairId]` | ペア詳細、分析、AI提案、需要調査、成果、履歴、LPバージョンの表示・操作 |
| `/pairs/[pairId]/edit` | 広告・LPペアの編集 |
| `/orchestration` | AIエージェント、ルーティング実行履歴、スコアカード、直近提案の表示 |
| `/history` | 登録データの変更履歴一覧 |
| `/campaigns` | X広告をキャンペーン名で集計した一覧 |
| `/campaigns/[campaignId]` | 集計キャンペーンと代表広告クリエイティブの表示 |
| `/lp` | 最新登録LPの構造・行動・性能値の表示 |
| `/improvements` | 分析結果から抽出した改善提案一覧 |
| `/improvements/[improvementId]` | 改善提案、差分、レビュー警告の詳細表示 |
| `/prs` | PR一覧画面。現在のデータ取得関数は常に空配列を返す |
| `/settings` | 言語と分析AIモードの保存 |

### Next.js APIルート

| ルート | 処理 |
| --- | --- |
| `POST /api/stripe/create-checkout-session` | 認証ユーザー用のサブスクリプションCheckout作成 |
| `POST /api/stripe/create-credit-checkout-session` | 認証ユーザー用の追加クレジットCheckout作成 |
| `POST /api/billing/portal` | Stripe Billing Portalセッション作成 |
| `POST /api/stripe/webhook` | Stripeイベント検証と契約・クレジット反映 |

### FastAPIの主要API群

FastAPIには、ヘルスチェックに加えて、広告最適化、需要発見、LP・広告インポート、X Ads連携、ペア分析、需要インテリジェンス、成果管理、AIオーケストレーション、課金・クレジット取得のAPIが実装されています。`/health` と外部サービスから戻るX Ads OAuthコールバックを除く主要APIは、Supabaseアクセストークンによる認証を要求します。

## 4. ユーザーができること

### 広告最適化の基本フロー

1. Googleアカウントでログインする。
2. プロジェクトを作成する。
3. X AdsアカウントをOAuthまたはアクセストークンで接続して広告を同期するか、広告を手動登録する。
4. 公開URLからLPを取り込むか、LPを手動登録する。
5. 広告とLPを選んで分析対象ペアを作成する。
6. ペア分析を実行し、保存された分析値、改善案、リスク、AIエージェント別提案を確認する。
7. 必要に応じてAI提案の判断状態を変更し、`apply_ready` の提案からCodex向けタスク文面を生成する。
8. 改善施策の実施前後メトリクスと学習メモを成果として保存する。
9. 広告・LPの変更履歴、LPバージョン、成果、集約結果を確認する。

### 需要調査のフロー

1. `/demand-discovery` で調べたい市場、課題、商品案などを入力する。
2. チャットを継続して調査条件を整理する。
3. 調査を実行し、需要クラスタ、競合ギャップ、証拠、ソース状態などを確認する。
4. ペア詳細では、需要インテリジェンスを実行し、検索需要、市場規模推定、解決策適合度、成果学習も確認・更新できる。

### X Ads公開フロー

1. X Ads接続とアカウントを登録する。
2. AIエージェント結果から公開ドラフトを作成し、アカウント、line item ID、広告文、仮説を指定する。
3. ドラフトを承認または却下する。
4. 承認済みドラフトを明示的に公開する。
5. 公開要求、公開イベント、作成された広告、A/Bテスト、成果レコードが保存される。

### 課金・クレジットのフロー

1. 料金ページでJPYまたはUSDを選択する。
2. StarterまたはGrowthのサブスクリプション、または追加クレジットパックのStripe Checkoutへ進む。
3. Stripe Webhook成功後、契約情報または購入クレジットがSupabaseへ反映される。
4. 対象処理の実行前に残高が確認され、成功後にクレジットが消費される。

コード上で確認できた主な消費量は、需要インテリジェンス50、ペア分析80、解決策適合度120、全体ワークフロー300、X Ads同期20、X Ads公開40、Codexタスク生成100、成果学習再構築20クレジットです。

## 5. 技術スタック

### フロントエンド

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Radix UI、独自UIコンポーネント
- TanStack React Query
- React Hook Form、Zod
- Zustand
- Recharts
- assistant-ui
- Vercel Analytics

### バックエンド

- Python
- FastAPI
- Uvicorn
- Pydantic
- Requests
- Cryptography
- OpenAI Python SDK

### DB・認証

- Supabase PostgreSQL
- Supabase Auth
- Supabase Google OAuth
- Row Level Securityによるユーザー単位のデータ制限
- フロントエンドからのSupabase直接CRUD
- FastAPIからSupabase Auth API、REST API、RPCの利用

### 課金

- Stripe Checkout
- Stripe Billing Portal
- Stripe Webhook
- Supabase上の契約プロファイル、クレジット残高、クレジット取引台帳

### 配置設定

- フロントエンド: Vercel向け設定あり
- バックエンド: DockerfileとFly.io向け `fly.toml` あり

## 6. データ構造

全テーブルには、用途に応じてユーザーID、プロジェクトID、作成日時、更新日時、JSONデータ、外部サービスIDなどが保存されます。主なテーブル群は次の通りです。

### 登録データ・分析

- `ad_projects`: プロジェクト名と説明
- `twitter_ads`: 広告文、遷移先、画像・動画URL、インプレッション、クリック、コンバージョン、費用、CTR/CPC/CVR、X Ads外部ID
- `landing_pages`: URL、ヒーロー文言、CTA、オファー、対象者、直帰率、滞在時間、スクロール、速度指標
- `ad_lp_pairs`: 広告とLPの分析対象ペア
- `analysis_runs`: ペア分析のスコア、トレンド、類似度、改善案、差分案、レビュー結果
- `change_history`: 作成・更新・削除・判断操作の前後データと理由
- `landing_page_versions`: LPのバージョン番号とスナップショット

### AIオーケストレーション・成果

- `ai_agents`: AIエージェント定義
- `ai_orchestration_runs`: ルーティング計画と実行状態
- `ai_agent_results`: エージェント別の出力、スコア、リスク、判断状態
- `ai_agent_scorecards`: エージェント別の件数、採否、信頼度、リスク、推定効果、ルータースコア
- `codex_task_prompts`: `apply_ready` 提案から生成した実装タスク文面
- `improvement_outcomes`: 改善施策の実施前後値、状態、結果要約、学習メモ

### 需要インテリジェンス・需要発見

- `demand_discovery_sessions`: チャットメッセージ、洞察、調査状態、調査コンテキスト
- `demand_research_requests`: 需要発見からの調査要求
- `demand_intelligence_runs`: 調査クエリ、状態、各種サマリー、需要発見との関連
- `demand_intelligence_signals`: 取得した需要シグナルと品質値
- `demand_intelligence_embeddings`: シグナルの埋め込み
- `demand_intelligence_clusters`: 需要クラスタと評価値
- `demand_signal_validations`: シグナル検証結果
- `demand_solution_fits`: 商品案・広告文・LP等との適合度
- `demand_signal_snapshots`: 時点ごとのシグナルスナップショット
- `demand_source_runs`: コネクタ単位の取得実行結果
- `demand_connector_logs`: コネクタログ
- `demand_search_signals`: 検索需要シグナル
- `demand_market_size_estimates`: 市場規模推定
- `demand_outcome_learning_links`: 改善成果と需要シグナルの関連

### X Ads・A/Bテスト

- `x_ads_connections`: 暗号化されたX Adsアクセストークン、接続状態、検証結果
- `x_ads_oauth_sessions`: OAuth処理中のセッション情報
- `x_ads_accounts`: X Adsアカウント、権限、通貨、タイムゾーン
- `x_ads_metric_snapshots`: 日次等の広告指標スナップショット
- `x_ads_publish_requests`: AI提案を元にした公開要求、承認・公開状態
- `x_ads_publish_events`: 公開処理の要求・応答・エラー記録
- `ad_ab_tests`: A/Bテスト名、仮説、主要指標、状態
- `ad_ab_test_variants`: テスト対象広告と指標値

### 課金・設定

- `user_billing_profiles`: Stripe顧客・契約ID、プラン、契約状態、契約期間
- `user_credit_balances`: 月次クレジット、購入クレジット、累計利用量
- `credit_transactions`: 付与、購入、消費、返金、調整の台帳
- `user_preferences`: 言語と分析AIモード

各ユーザー所有テーブルにはRLSポリシーが設定されています。バックエンドの管理処理はSupabaseサービスロールを利用します。

## 7. 外部サービス連携

### 実際にコードから呼び出される外部サービス

| サービス | 実装されている利用範囲 |
| --- | --- |
| Supabase | Google OAuth、ユーザー検証、PostgreSQL REST CRUD、RPC、RLS |
| Stripe | サブスクリプションCheckout、追加クレジットCheckout、Billing Portal、Webhook |
| OpenAI | 構造化JSONによる分析。OpenAI-onlyモードでは設定不足・呼び出し失敗時にエラー |
| xAI Grok | 複数AI分析時の構造化提案。設定不足・失敗時はモック出力へフォールバック |
| Google Gemini | 複数AI分析時の構造化提案。設定不足・失敗時はモック出力へフォールバック |
| X API v2 | 最近の投稿検索による需要シグナル収集 |
| X Ads API / X OAuth | OAuth接続、アカウント検証、広告・指標同期、承認済み広告の公開 |
| Google Custom Search JSON API | 需要調査用の検索結果取得 |
| Firecrawl | 検索とWebページスクレイピングによる需要シグナル取得 |
| 一般Webページ | URL安全性チェック後のLP取り込み・需要シグナル取得 |
| GitHub API | バックエンド全体ワークフローがGitHubプロバイダー設定時にPR作成を試行 |
| Vercel Analytics | フロントエンド利用分析 |

### 主な環境変数

フロントエンド:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BILLING_PORTAL_CONFIGURATION`
- JPY/USDの各サブスクリプション・クレジットパック用 `STRIPE_PRICE_*`

バックエンド:

- `ADFLOW_AI_PROVIDER`, `ADFLOW_GITHUB_PROVIDER`, `ADFLOW_STORAGE_PROVIDER`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_FAST_MODEL`, `OPENAI_DEEP_MODEL`
- `GROK_API_KEY`, `GROK_MODEL`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `X_API_BEARER_TOKEN`
- `X_ADS_CONSUMER_KEY`, `X_ADS_CONSUMER_SECRET`, `X_ADS_TOKEN_ENCRYPTION_KEY`
- `X_ADS_API_BASE_URL`, `X_ADS_OAUTH_BASE_URL`, `X_ADS_OAUTH_CALLBACK_URL`
- `GOOGLE_CUSTOM_SEARCH_API_KEY`, `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
- `FIRECRAWL_API_KEY` と各種取得上限・タイムアウト設定
- `DEMAND_REAL_SOURCES_ENABLED`, `DEMAND_SYNTHETIC_FALLBACK` と需要調査上限設定
- `ADFLOW_CORS_ORIGINS`, `ADFLOW_FRONTEND_APP_URL`
- `ADFLOW_AUTO_TOP_UP_CREDIT_EMAILS`, `ADFLOW_AUTO_TOP_UP_CREDIT_AMOUNT`

バックエンド設定コードは `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, `X_API_BASE_URL`, 埋め込み関連環境変数も参照しますが、`backend/.env.example` には記載されていません。

## 8. 現状の制限・未確認点

- `/prs` の取得関数は常に空配列を返すため、PR一覧には実データが表示されません。
- 改善提案画面の承認関数は固定の成功値を返すだけで、状態を永続化しません。
- 改善提案画面のPR作成関数は `pr: null` を返すだけで、GitHub PRを作成しません。
- GitHub PR作成コードはバックエンド全体ワークフロー内に存在しますが、現在のPR一覧画面・改善提案画面とは接続されていません。
- `/projects/[projectId]` はプロジェクト名・説明と固定説明文のみを表示します。プロジェクト内の実データ表示は `/ad-optimization/[projectId]` に実装されています。
- キャンペーン詳細の `problems`、`suggestions`、`alignment`、`riskLevel` は分析結果と接続されておらず、空配列または固定値です。
- LP分析画面は登録済みLPのうち最新1件の保存値を表示する実装で、画面から新しい計測を実行する処理は確認できませんでした。
- 複数AIモードでは、Grok、Gemini、OpenAIの設定不足や呼び出し失敗時にモック提案へフォールバックします。画面上のプロバイダー名だけでは実API出力かモック出力かを判別できない場合があります。
- `codex` エージェントはモックプロバイダーに割り当てられており、生成したタスクをCodexへ送信・実行する処理は確認できませんでした。
- 需要調査は設定により実ソース取得を無効化でき、合成シグナルへフォールバックできます。実ソース取得の可否は環境変数と外部APIキーに依存します。
- Stripe、X Ads、OpenAI、Grok、Gemini、Google Custom Search、Firecrawl、GitHubの実サービス接続は、必要な認証情報を使った実環境での動作確認が必要です。
- `frontend/.env.example` と `backend/.env.example` は存在しますが、リポジトリ直下にREADMEや一括起動スクリプトは確認できませんでした。
- Supabaseマイグレーション適用済み環境の有無と、全RPC・RLSポリシーの実環境動作は確認できませんでした。
- バックエンドのテストコードは存在しますが、調査環境には `pytest` がインストールされておらず、テストを実行できませんでした。
- フロントエンドは `npm run lint` と `npm run build` が成功しました。ただし、ブラウザ操作によるE2E確認は実施していません。

## 9. 開発者向け補足

### ローカル起動

フロントエンド:

```powershell
cd frontend
npm ci
npm run dev
```

デフォルトのバックエンド接続先は `http://127.0.0.1:8000` です。変更する場合は `NEXT_PUBLIC_API_BASE_URL` を設定します。

バックエンド（リポジトリ直下から実行）:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.api.main:app --reload --port 8000
```

バックエンドのimportパスは `backend.*` を前提としています。

Supabaseは `supabase/migrations` のSQLを順番に適用する必要があります。Google OAuth、RLS、Stripe Webhook、外部API連携には各サービス側の設定も必要です。

### 主要ディレクトリ

- `frontend/app`: Next.jsページとNext.js APIルート
- `frontend/components`: 画面別・共通UIコンポーネント
- `frontend/hooks`: React Query、認証、設定用フック
- `frontend/lib/api`: FastAPIまたは集約データ取得処理
- `frontend/lib/supabase`: Supabaseクライアントと直接CRUD
- `frontend/lib/billing`: プラン、価格、Stripe価格ID対応
- `backend/api/main.py`: FastAPIルートとサービス組み立て
- `backend/services`: 分析、需要調査、X Ads、AI、課金、Supabase、GitHub等の処理
- `backend/tests`: バックエンドテスト
- `supabase/migrations`: DBテーブル、RLS、RPC、トリガー
- `docs`: 既存ドキュメント

### 確認に使用した主なファイル

#### アプリ構成・ルーティング

- `frontend/package.json`
- `frontend/app/layout.tsx`
- `frontend/app/providers.tsx`
- `frontend/components/layout/AppShell.tsx`
- `frontend/components/auth/AuthGate.tsx`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/app/**/page.tsx`
- `frontend/app/api/**/route.ts`
- `backend/api/main.py`
- `backend/core/config.py`
- `backend/requirements.txt`
- `backend/.env.example`
- `frontend/.env.example`

#### フロントエンドのデータ処理

- `frontend/lib/auth.ts`
- `frontend/lib/api/client.ts`
- `frontend/lib/api/product.ts`
- `frontend/lib/api/campaigns.ts`
- `frontend/lib/api/lp.ts`
- `frontend/lib/api/improvements.ts`
- `frontend/lib/api/prs.ts`
- `frontend/lib/supabase/adflow-repository.ts`
- `frontend/lib/billing/plans.ts`
- `frontend/lib/billing/stripe-catalog.ts`
- `frontend/hooks/**`
- `frontend/components/x-ads/XAdsOperationsPanel.tsx`
- `frontend/components/x-ads/XAdsPublishDraftDialog.tsx`
- `frontend/components/settings/SettingsForm.tsx`
- `frontend/components/billing/**`

#### バックエンド処理

- `backend/services/analysis/registered_pair_analysis_service.py`
- `backend/services/orchestration/ai_orchestrator.py`
- `backend/services/demand/**`
- `backend/services/product/**`
- `backend/services/x_ads/**`
- `backend/services/ai/**`
- `backend/services/billing/credits.py`
- `backend/services/supabase/supabase_repository.py`
- `backend/services/outcomes/improvement_outcome_service.py`
- `backend/services/analytics/**`
- `backend/services/github/**`
- `backend/core/url_safety.py`
- `backend/tests/**`

#### DBスキーマ

- `supabase/migrations/202605280001_registered_adflow_entities.sql`
- `supabase/migrations/202605280002_ai_orchestration_os.sql`
- `supabase/migrations/202605280003_decisions_lp_versions_codex_tasks.sql`
- `supabase/migrations/202605280004_demand_intelligence_engine.sql`
- `supabase/migrations/202605280005_improvement_outcomes.sql`
- `supabase/migrations/202605280006_demand_intelligence_validation_fit_monitoring_connectors.sql`
- `supabase/migrations/202605280007_search_demand_market_size_outcome_learning.sql`
- `supabase/migrations/202606030001_credit_billing.sql`
- `supabase/migrations/202606050001_demand_discovery_sessions.sql`
- `supabase/migrations/202606060001_ad_ab_tests.sql`
- `supabase/migrations/202606060002_launch_pricing.sql`
- `supabase/migrations/202606060003_user_preferences.sql`
- `supabase/migrations/202606060004_demand_discovery_research.sql`
- `supabase/migrations/202606070001_billing_hardening.sql`
- `supabase/migrations/202606070002_x_ads_release_workflow.sql`
- `supabase/migrations/202606070003_x_ads_oauth_sessions.sql`
