# 未実装機能監査レポート

本レポートは、リポジトリ内の `frontend`、`backend`、`supabase`、`docs`、`scripts` をコードベースで照合した結果です。将来構想ではなく、現在のUI・API・DB・保存・取得・実行処理のいずれかが欠けている機能だけを記載します。

判定基準:

- **完全未実装**: UI要素や宣言はあるが、処理が存在しない。
- **モック実装**: 固定値、合成値、仮レスポンス、モックプロバイダーを実結果として返す。
- **接続漏れ**: 実装済みの層が別の層から呼ばれず、ユーザーフローとして成立しない。
- **不完全実装**: 一部のCRUD、状態、イベント、検証、実行処理だけが存在する。
- **疑似実装**: 実処理をせず、状態変更、計画生成、成功通知だけを行う。

同じ機能が複数分類に該当する場合は、主な欠落箇所の分類に記載しています。

## 完全未実装

| 機能 | 根拠ファイル | 内容 |
| --- | --- | --- |
| ヘッダー検索 | `frontend/components/layout/Header.tsx` | 検索入力欄は存在するが、値管理、検索処理、結果表示、API呼び出しがない。 |
| ヘッダーのプロジェクト切替 | `frontend/components/layout/Header.tsx` | プロジェクト名とChevron付きボタンは存在するが、クリック処理や選択UIがない。 |
| ヘッダーの同期ボタン | `frontend/components/layout/Header.tsx` | 「Sync」ボタンに `onClick` がなく、同期処理を呼ばない。 |
| ヘッダー通知 | `frontend/components/layout/Header.tsx` | 通知ボタンに処理がなく、通知データ構造・取得API・一覧UIもない。 |
| 問い合わせフォーム送信 | `frontend/components/marketing/ContactPageClient.tsx` | フォームと送信ボタンはあるが、`onSubmit`、`action`、API、保存、メール送信がない。ブラウザ標準送信になる。 |
| プロジェクト詳細機能 | `frontend/app/projects/[projectId]/page.tsx` | プロジェクト名・説明と固定説明文だけを表示し、関連広告・LP・ペア・履歴・分析結果を取得・表示しない。 |
| PR一覧データ取得 | `frontend/lib/api/prs.ts`, `frontend/app/prs/page.tsx` | `getPullRequests()` は常に空配列を返す。PR一覧画面は実データを取得しない。 |
| 改善提案の却下保存 | `frontend/components/improvements/ApprovalDialog.tsx` | Reject操作はトースト表示とダイアログ閉鎖だけで、API呼び出し・DB保存がない。 |
| Codexタスク実行 | `backend/services/orchestration/ai_orchestrator.py`, `backend/services/ai/provider_registry.py` | Codex向け文面を保存するだけで、Codexへの送信、コード変更、実行結果取得、状態更新がない。`codex` プロバイダーも `MockProvider`。 |
| GitHubブランチ作成・コミット作成 | `backend/services/github/github_branch_service.py`, `backend/services/github/github_commit_service.py` | `status: "planned"` の計画オブジェクトを返すだけで、GitHub APIやgit処理を実行しない。 |
| X需要コネクタの利用 | `backend/services/demand/connectors/x_connector.py`, `backend/services/demand/connectors/connector_registry.py`, `backend/services/demand/demand_intelligence_service.py` | X APIコネクタ実装は存在するが、コネクタレジストリと需要調査実行経路に登録されておらず呼ばれない。 |
| Webページ需要コネクタの利用 | `backend/services/demand/connectors/web_page_connector.py`, `backend/services/demand/connectors/connector_registry.py`, `backend/services/demand/demand_intelligence_service.py` | Webページ取得コネクタ実装は存在するが、実行経路ではFirecrawlのみを使い、このコネクタは呼ばれない。 |
| 共通レートリミッターの利用 | `backend/services/demand/rate_limit.py` | `SimpleRateLimiter` は定義されているが、需要コネクタ・APIから参照されない。 |
| ダッシュボードのPR・改善・リスクウィジェット | `frontend/components/dashboard/PendingPrList.tsx`, `RecentImprovements.tsx`, `RiskAlerts.tsx`, `frontend/app/dashboard/page.tsx` | コンポーネントは存在するが、ダッシュボードや他画面から利用されない。 |
| Google Suggest / Related Search / PAA実取得 | `backend/services/demand/search_demand_layer.py`, `docs/adflow-ai-complete-spec.md` | `suggest_queries` と `people_also_ask` は文字列テンプレートで生成され、外部サービスから取得しない。仕様書にも実取得未実装と明記されている。 |
| YouTubeコメント取得 | `backend/services/demand/demand_models.py`, `docs/adflow-ai-complete-spec.md` | `youtube_comment` 型は定義されているが、取得コネクタ・実行処理がない。 |

## モック実装

| 機能 | 根拠ファイル | 内容 |
| --- | --- | --- |
| 改善提案の承認 | `frontend/lib/api/improvements.ts` | `approveImprovement()` はDBやAPIを呼ばず、固定の `{ status: "Approved" }` を返す。 |
| 改善提案からのPR作成 | `frontend/lib/api/improvements.ts` | `createPullRequest()` は外部処理を行わず、固定の `{ pr: null }` を返す。 |
| 改善提案の効果・状態 | `frontend/lib/api/improvements.ts` | CTR/CVR影響は常に0、レビュー状態は常に `Pending`。保存済み判断や推定効果を取得しない。 |
| PRのメモリ実装 | `backend/services/github/in_memory_pr_client.py`, `backend/core/config.py` | 既定のGitHubプロバイダーは `memory`。PR作成時に `pr_number=0`、空URLを返す。 |
| Codexエージェント | `backend/services/ai/provider_registry.py` | `codex` は常に `MockProvider` に割り当てられている。 |
| 複数AI分析のフォールバック | `backend/services/ai/providers/openai_provider.py`, `grok_provider.py`, `gemini_provider.py`, `mock_provider.py` | APIキー未設定・外部API失敗時にモック提案を返す。結果はプロバイダー名を維持するため、保存データ上で実API出力に見える。 |
| 既定AI分析 | `backend/core/config.py`, `backend/services/ai/deterministic_llm_client.py` | 既定 `ADFLOW_AI_PROVIDER` は `mock`。決定論的な固定テンプレート提案と固定レビュー結果を返す。 |
| 検索需要 | `backend/services/demand/search_demand_layer.py` | 検索ボリューム、CPC、関連語、PAA、トレンドをキーワード長・固定係数・テンプレートから合成する。`source_type` も `synthetic_search_demand`。 |
| 市場規模推定 | `backend/services/demand/market_size_layer.py` | オーディエンス最小・最大値を内部スコアの固定算式で生成し、外部市場データを利用しない。 |
| 需要シグナルの合成フォールバック | `backend/services/demand/connectors/synthetic_connector.py`, `backend/core/config.py` | 実ソース無効時または取得結果0件時に、固定テンプレートの合成需要シグナルを保存する。 |
| 需要埋め込み | `backend/services/demand/demand_intelligence_service.py`, `backend/core/config.py` | 埋め込みは常にSHA-256から作る16次元ベクトル。OpenAI埋め込み用設定は存在するが利用されない。 |
| 需要クラスタ成長率 | `backend/services/demand/demand_intelligence_service.py` | クラスタ生成時の `growth_rate` に、ソース数とインデックスを使った固定算式が含まれる。 |
| キャンペーン一覧のトレンド | `frontend/lib/api/campaigns.ts` | 全キャンペーンの `trend` が常に0。 |
| キャンペーン詳細の分析値 | `frontend/lib/api/campaigns.ts` | 問題・提案は常に空、alignmentは0、riskLevelは常にLow。画面は分析タブを表示するが分析結果に接続されない。 |
| 未使用Risk Alert | `frontend/components/dashboard/RiskAlerts.tsx` | 「mobile UI warningが1件」と固定表示するダミー警告コンポーネント。現在は画面からも利用されない。 |
| ペア分析用の広告時系列 | `backend/services/analysis/registered_pair_analysis_service.py` | 同一の広告パフォーマンス値を2件複製して時系列として渡すため、CTRトレンドは実時系列ではない。 |
| 決定論的レビュー承認 | `backend/services/ai/deterministic_llm_client.py` | `ReviewResult` を生成する既定経路ではリスク配列が空、`approved_for_pr=True` を固定返却する。 |

## 接続漏れ

| 機能 | 根拠ファイル | 内容 |
| --- | --- | --- |
| 改善提案UIとAI判断API | `frontend/components/improvements/ApprovalDialog.tsx`, `frontend/lib/api/improvements.ts`, `backend/api/main.py` | バックエンドには `/orchestration/results/{result_id}/decision` があるが、改善提案画面は固定レスポンス関数を使い、判断APIへ接続していない。 |
| 改善提案UIとGitHub PR API | `frontend/lib/api/improvements.ts`, `backend/services/github/github_pr_client.py`, `backend/api/main.py` | GitHub PR作成処理は全体ワークフロー内部にあるが、改善提案画面のCreate PRから呼ばれない。 |
| PR一覧とGitHub結果 | `frontend/lib/api/prs.ts`, `backend/services/github/github_pr_client.py` | GitHub PR作成結果の保存テーブル・一覧API・UI取得接続がない。 |
| 全体ワークフローUI | `frontend/hooks/useAdflowData.ts`, `frontend/lib/api/client.ts`, `backend/api/main.py` | `useWorkflow()` は定義されているが画面から使われない。さらに `runWorkflow()` はリクエスト本文を送らず、バックエンドは広告・LP payload必須のため、呼ぶと400になる。 |
| 広告最適化集約API | `backend/api/main.py`, `backend/services/product/ad_optimization_service.py`, `frontend/app/ad-optimization/**` | `/ad-optimization/projects`、overview、assets、recommendations、results APIは存在するが、フロントエンドはSupabase直接取得を使い、これらのAPIを呼ばない。 |
| Demand Discoveryセッション一覧・再開 | `backend/api/main.py`, `backend/services/product/demand_discovery_service.py`, `frontend/app/demand-discovery/page.tsx`, `frontend/lib/api/product.ts` | セッション一覧・単体取得APIは存在するが、フロントエンドに一覧取得関数・履歴選択・既存セッション再開UIがない。 |
| 単発Demand Discovery分析API | `frontend/lib/api/product.ts`, `backend/api/main.py` | `/demand-discovery/analyze` と `analyzeDemandDiscovery()` は存在するが、現在の画面はセッション作成・メッセージ追加を使い、単発分析関数は呼ばれない。 |
| 旧X Ads同期API | `frontend/lib/api/product.ts`, `backend/api/main.py`, `backend/services/product/asset_import_service.py` | `/integrations/x-ads/sync` と `syncXAds()` は存在するが、現在のX Ads UIは `/integrations/x-ads/detailed-sync` を使い、旧同期経路は接続されていない。 |
| Codexタスク一覧・詳細 | `supabase/migrations/202605280003_decisions_lp_versions_codex_tasks.sql`, `backend/api/main.py`, `frontend/hooks/use-orchestration.ts` | タスクはDB保存されるが、一覧・詳細取得API、一覧UI、再表示・状態変更UIがない。生成直後のレスポンスしか利用できない。 |
| Codexタスクから成果作成 | `backend/api/main.py`, `backend/services/outcomes/improvement_outcome_service.py`, `frontend/hooks/use-improvement-outcomes.ts` | `/orchestration/codex-tasks/{task_id}/outcome` は存在するが、フロントエンドから呼ぶフック・UIがない。 |
| Billing profile表示 | `backend/api/main.py`, `frontend/components/billing/**` | `/billing/me` は存在するがフロントエンドから呼ばれず、料金ページは現在プラン・契約状態を表示しない。 |
| プロジェクト更新・削除UI | `frontend/hooks/use-projects.ts`, `frontend/app/projects/page.tsx`, `frontend/app/projects/[projectId]/page.tsx` | update/remove mutationは存在するが、画面から呼ばれない。 |
| 需要コネクタログ表示 | `supabase/migrations/202605280006_demand_intelligence_validation_fit_monitoring_connectors.sql`, `backend/services/supabase/supabase_repository.py`, `backend/api/main.py` | `demand_connector_logs` は保存されるが、取得API・UI表示がない。 |
| X Ads公開イベント表示 | `supabase/migrations/202606070002_x_ads_release_workflow.sql`, `backend/services/x_ads/x_ads_service.py`, `frontend/components/x-ads/XAdsOperationsPanel.tsx` | 公開イベントは保存されるが、取得API・監査ログUIがない。 |
| クレジット取引履歴表示 | `supabase/migrations/202606030001_credit_billing.sql`, `frontend/components/billing/CreditBalanceCard.tsx` | 取引台帳は保存されるが、一覧取得API・画面がなく、残高集計だけを表示する。 |
| GitHub計画サービス | `backend/services/github/change_plan_to_pr_service.py`, `github_branch_service.py`, `github_commit_service.py` | クラスは存在するがAPI、ワークフロー、UIから参照されない。 |

## 不完全実装

| 機能 | 根拠ファイル | 内容 |
| --- | --- | --- |
| A/B Testing | `backend/services/product/ad_ab_test_service.py`, `frontend/app/ad-optimization/[projectId]/page.tsx` | 作成・状態変更・表示はできるが、媒体上での配信分割、期間制御、指標スナップショット紐付け、統計的有意差計算、勝者確定処理はない。現在値比較のみ。 |
| Improvement Outcomes | `backend/services/outcomes/improvement_outcome_service.py`, `frontend/hooks/use-improvement-outcomes.ts` | 作成・更新・表示はあるが、削除API/UIがない。指標は手入力中心で、通常の成果は媒体同期から自動更新されない。 |
| LP Analysis | `frontend/lib/api/lp.ts`, `frontend/app/lp/page.tsx`, `backend/services/product/asset_import_service.py` | 最新LPの保存値を表示するだけ。実ブラウザ計測、ページ速度計測、行動分析取得、FAQ抽出はない。URL取込もHTML文字列抽出中心。 |
| Ad Analysis | `backend/services/analysis/registered_pair_analysis_service.py` | 分析保存・表示はあるが、広告の実時系列やデバイス・ターゲティングデータを使わず、同一値複製・unknown値を含む。 |
| Demand Discovery | `frontend/app/demand-discovery/page.tsx`, `backend/services/product/demand_discovery_service.py` | チャット・保存・調査実行はあるが、過去セッション一覧・再開・削除がない。 |
| Demand Intelligence / Market Research | `backend/services/demand/**` | 取得・保存・表示は広範だが、検索需要・市場規模・埋め込み・一部トレンドが合成値で、X/Webコネクタも未接続。 |
| AI Orchestration / Agent Routing | `backend/services/orchestration/ai_orchestrator.py`, `backend/services/ai/providers/**` | ルーティング・保存・判断・スコアカードはあるが、実プロバイダー失敗をモックへ透過的に置換し、エージェント有効/無効の変更UI/APIがない。 |
| X Ads Integration | `backend/services/x_ads/x_ads_service.py`, `frontend/components/x-ads/XAdsOperationsPanel.tsx` | 接続・検証・同期はあるが、Revokeはローカル状態変更だけでX側トークン失効を呼ばない。同期・公開イベントの詳細表示もない。 |
| X Ads Publish | `backend/services/x_ads/x_ads_service.py`, `frontend/components/x-ads/**` | 外部公開処理は存在するが、line item IDは手入力、公開前プレビュー・権限詳細・公開イベント表示・失敗後の専用リトライUIがない。 |
| Stripe Billing | `frontend/app/api/stripe/**`, `frontend/components/billing/BillingResultPage.tsx` | Checkout・Portal・Webhookはあるが、成功ページは `session_id` を検証せず常に成功表示。返金・支払い失敗・非同期失敗によるクレジット/契約調整処理がない。 |
| Credit System | `backend/services/billing/credits.py`, `supabase/migrations/202606030001_credit_billing.sql` | 残高・消費・購入・付与はあるが、取引履歴UI、返金処理、管理調整UIがない。外部公開成功後のクレジット消費失敗を原子的に扱えない。 |
| GitHub Integration / PR Generation | `backend/services/github/**`, `backend/services/analytics/adflow_workflow_service.py`, `frontend/lib/api/improvements.ts`, `frontend/lib/api/prs.ts` | 実GitHub PR APIクライアントはあるが、ブランチ・コミット・ファイル変更を作らない。既存head branchが前提で、主要UIから未接続、PR結果も保存・一覧化されない。 |
| プロジェクトCRUD | `frontend/hooks/use-projects.ts`, `frontend/app/projects/**` | 作成・一覧はUI接続済み。更新・削除処理はフックにあるがUIがない。 |
| Demand Discovery調査のレート制限 | `backend/services/product/demand_discovery_service.py`, `backend/services/demand/rate_limit.py` | DBの直近要求件数で一部制限するが、共通レートリミッターは未使用。API全体・コネクタ単位の永続的な制限はない。 |
| 法務・問い合わせ公開情報 | `frontend/lib/legal-content.ts`, `frontend/locales/*.ts`, `frontend/components/marketing/ContactPageClient.tsx`, `docs/adflow-ui-audit.md` | 法務ページは表示されるが、問い合わせ送信が未実装。既存監査文書でも特商法のplaceholder差し替え確認が必要とされている。 |

## 疑似実装

| 機能 | 根拠ファイル | 内容 |
| --- | --- | --- |
| 改善提案Approve | `frontend/components/improvements/ApprovalDialog.tsx`, `frontend/lib/api/improvements.ts` | 成功トーストを表示するが、承認状態は保存されない。 |
| 改善提案Reject | `frontend/components/improvements/ApprovalDialog.tsx` | 「このレビューセッションで却下」とトースト表示するだけで、セッション内状態すら保持しない。 |
| 改善提案Create PR | `frontend/components/improvements/ApprovalDialog.tsx`, `frontend/lib/api/improvements.ts` | 成功トースト後に `/prs` へ移動するが、PRは作成されず一覧も空。 |
| GitHub branch/commit plan | `backend/services/github/github_branch_service.py`, `backend/services/github/github_commit_service.py` | ブランチ・コミットを作らず、planned状態の辞書を返す。 |
| Codex Task | `backend/services/orchestration/ai_orchestrator.py` | 汎用的な `frontend/app/...` 等のヒントを含むプロンプトをDBへ保存するだけで、実装処理は行わない。 |
| A/Bテスト開始・完了 | `backend/services/product/ad_ab_test_service.py` | `running`・`completed` の日時と状態を変更するだけで、配信や計測処理を開始・停止しない。 |
| X Ads接続Revoke | `backend/services/x_ads/x_ads_service.py` | DB上の接続状態を `revoked` に変更するだけで、X APIへのトークン失効要求は行わない。 |
| Billing success画面 | `frontend/app/billing/success/page.tsx`, `frontend/components/billing/BillingResultPage.tsx` | Checkoutセッション・支払い状態・Webhook反映状態を確認せず、URLへアクセスすると成功表示する。 |
| ヘッダー同期済み表示 | `frontend/components/layout/Header.tsx` | 実同期状態を取得せず、常に「synced」バッジを表示する。 |
| キャンペーン分析タブ | `frontend/app/campaigns/[campaignId]/page.tsx`, `frontend/lib/api/campaigns.ts` | AI問題・提案・LP整合性を表示するUIはあるが、データは空配列・固定値。 |

## 実装率推定

実装率は、現在のユーザーフローに必要な **UI / API / DB / 保存 / 取得 / 実行処理 / 外部連携 / エラー処理** の充足度を、コード監査上の目安として評価したものです。実サービス接続試験は含みません。

| 機能 | 実装率(%) | 理由 |
| --- | ---: | --- |
| Demand Discovery | 75% | チャット、セッション保存、メッセージ追加、調査起動、結果表示はある。履歴一覧・再開・削除が不足。 |
| Demand Intelligence | 68% | 多数のDB・API・表示が接続済み。ただし合成シグナル、ハッシュ埋め込み、未接続コネクタ、合成検索需要・市場規模が中核に含まれる。 |
| Market Research | 55% | 実ソース検索・Firecrawl取得はあるが、検索需要、市場規模、Suggest/PAA、トレンドの一部が合成推定。 |
| AI Orchestration | 70% | ルーティング、結果保存、判断、スコアカードは動く。実AI失敗時のモック透過、エージェント管理不足がある。 |
| Agent Routing | 72% | ルールルーティングとスコアカード順位付けはあるが、モック出力を実績として学習し得る。 |
| Codex Task | 25% | プロンプト生成・DB保存のみ。取得、管理、実行、コード変更、結果反映がない。 |
| X Ads Integration | 82% | OAuth、手動接続、検証、アカウント取得、同期、保存がある。外部Revokeと運用監査UIが不足。 |
| X Ads Publish | 78% | 承認分離、外部投稿・promoted tweet紐付け、保存、失敗状態がある。line item選択・イベント表示・運用UIが不足。 |
| A/B Testing | 42% | 作成、状態、比較表示はあるが、実験配信・自動計測・統計判定がない。 |
| Improvement Outcomes | 75% | 作成、更新、前後比較、学習連携はある。削除と通常フローでの自動計測が不足。 |
| LP Analysis | 38% | 保存済みLP値の表示はあるが、実計測・行動分析・継続取得を行わない。 |
| Ad Analysis | 65% | ペア分析、AI提案、保存、表示はあるが、実時系列・ターゲティング・デバイス情報が不足。 |
| Stripe Billing | 78% | Checkout、Portal、Webhook、契約保存はある。成功検証、失敗・返金イベント対応、契約状態表示が不足。 |
| Credit System | 82% | DB台帳、残高、購入、月次付与、消費がある。履歴UI、返金、原子性が不足。 |
| GitHub Integration | 28% | PR APIクライアントはあるが、主要UI未接続、ブランチ・コミット・差分適用・結果保存がない。 |
| PR Generation | 15% | 改善提案画面のPR作成は固定null。全体ワークフローのPR処理も既存head branch前提でUI未接続。 |
| Improvements UI | 35% | 分析結果表示はあるが、効果値・状態が固定で、Approve/Reject/Create PRが保存・実行されない。 |
| Campaign Analysis | 35% | 広告集計は動くが、トレンド・問題・提案・整合性・リスクが固定値。 |
| Project Management | 60% | 作成・一覧・参照はあるが、更新・削除UI、詳細集約表示がない。 |
| Contact / Sales Inquiry | 10% | UIのみで送信処理がない。Businessプラン導線の終点として機能しない。 |

## 今すぐ直すべき未完成機能 TOP20

優先順位は、ユーザー価値・収益影響・修正コストを合わせて評価しています。同程度の価値では、短期間で実ユーザーフローを成立させられるものを上位にしています。

| 順位 | 機能 | 優先理由 |
| ---: | --- | --- |
| 1 | 改善提案Approve / Reject / Create PRの実処理接続 | 現在は成功通知だけで、主要な改善ワークフローが成立していない。バックエンド判断APIを再利用できる。 |
| 2 | PR一覧・PR結果保存・GitHub連携接続 | Create PR後の確認先が常に空。改善から実装への収益価値を直接損なう。 |
| 3 | Contact / Business問い合わせ送信 | BusinessプランのCTA終点が無処理。収益機会を直接失う。 |
| 4 | AIモックフォールバックの明示と実績分離 | 実AI結果に見えるモックが判断・スコアカードへ混入し、プロダクト信頼性を損なう。 |
| 5 | Demand Intelligenceの合成値表示明示 | 検索需要・市場規模が実測に見える。意思決定機能の信頼性に直結する。 |
| 6 | GitHubブランチ・コミット・差分適用の実装 | 現在のGitHub PR処理は既存head branch前提で、コード変更を作らないため、PR生成フローが単独では成立しない。 |
| 7 | Stripe successページのセッション検証 | 未決済でも成功表示できる。課金信頼性とサポート負荷に直結する。 |
| 8 | Billing profile表示と現在プラン表示 | 課金APIはあるがUI未接続。契約ユーザーが状態を確認できない。 |
| 9 | A/Bテストを「現在値比較」と明示するか実験処理を実装 | 現UIは実験開始・完了に見えるが、状態変更しか行わない。誤判断リスクが高い。 |
| 10 | Codex Taskの一覧・詳細・状態管理 | 課金対象でDB保存されるタスクを生成後に再取得できない。 |
| 11 | Codex Task実行連携 | 「実装タスク」から実装へ進めない。プロダクトの実装ループが途切れる。 |
| 12 | X Ads Revokeの外部失効 | UI上で失効済みに見えても外部トークンは有効なまま。セキュリティ上重要。 |
| 13 | X Ads publish event監査UI | 外部公開機能に対して、詳細な成功・失敗イベントをユーザーが確認できない。 |
| 14 | クレジット消費と外部処理の整合性改善 | 外部処理成功後にクレジット消費が失敗する可能性があり、課金整合性が崩れる。 |
| 15 | Demand Discoveryセッション履歴・再開 | セッションは保存されるが再利用できず、保存価値がユーザーへ返っていない。 |
| 16 | プロジェクト更新・削除UI | 処理は既に存在し、比較的低コストで基本CRUDを完成できる。 |
| 17 | プロジェクト詳細を実データへ接続 | 固定説明文ページを、既存の集約APIまたはSupabase取得へ接続する。 |
| 18 | キャンペーン詳細の固定分析値除去 | AI分析画面に見えるが値が空・固定。既存分析データへ接続するか表示を外す必要がある。 |
| 19 | LP Analysisの実計測または表示範囲の明示 | 現在は保存値表示のみで、分析画面として誤解される。 |
| 20 | ヘッダーのダミー操作除去・接続 | 検索、同期、通知、プロジェクト切替が無反応。全画面で露出し、完成度を大きく損なう。 |

## 監査上の補足

- X Ads Publishは、外部X Ads APIへの投稿とpromoted tweet紐付け処理が実装されているため、疑似実装とは判定していません。
- Improvement OutcomesはDB保存・取得・更新・分析への再利用が接続されているため、主要部分は実装済みです。
- Stripe BillingとCredit Systemは主要経路が実装済みですが、実Stripe/Supabase環境での動作確認は本監査では実施していません。
- `docs/adflow-ai-complete-spec.md` 内の未実装記載は、対応コードが存在しないことを確認できた項目のみ根拠として採用しました。
- フロントエンドは直前の現状仕様調査で型チェックと本番ビルドが成功しています。バックエンドテストは調査環境に `pytest` がなく未実行です。
