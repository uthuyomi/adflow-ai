# adflow-ai 現状仕様ドキュメント

最終更新: 2026年6月19日

リリース判定、Productionとの差分、Feature Gate、残課題は
`docs/adflow-ai-release-source-of-truth-ja.md` を優先してください。

本書はPhase1〜Phase8実装後のコード、Supabase migration、API、画面、自動テスト、実DB統合試験を根拠とする現行仕様です。

## 1. アプリ概要

AdFlow-AIは、需要調査から広告・LP改善、承認、Codex実行、GitHub PR、公開、効果測定、実験、学習までを一つの追跡可能な運用ループとして管理するWebアプリです。

主な処理単位はProject、Demand Discovery Session、広告、LP、広告・LP Pair、Improvement、Codex Task、GitHub PR、Outcome、Experimentです。

## 2. 実装済み機能一覧

- Supabase Authによる認証
- Project作成・編集・複製・一時停止・アーカイブ・復元・論理削除
- Demand Discoveryセッション作成・一覧・再開・検索・お気に入り・削除
- 実コネクタ由来のDemand Evidence、Competitor、Demand Score、Learning Context保存
- 広告・LP・Pairの登録、分析、改善提案
- REAL / MOCK AI結果の識別と、MOCK結果のLearning除外
- Improvementの承認・却下・Apply Ready・Applied・Failed状態管理
- Codex Task一覧・詳細・実行・手動実行結果登録・状態履歴
- GitHub OAuth、Repository選択、Branch・Commit・PR作成、状態同期
- Outcome作成・測定・評価・Learning保存
- X Ads接続・同期・公開要求・承認・公開
- Experiment作成、Variant管理、Traffic allocation、LP Runtime Analytics
- X Ads / LPイベントの測定集計、Winner Detection
- Experiment Learning、Revenue Impact、Insight、Alert
- Stripe Checkout、Portal、Webhook冪等処理、返金・失敗・キャンセル処理
- Credit残高・購入・消費・返金台帳
- Global Search、Notification Center、Background Jobs、Activity Timeline
- Operations Dashboard、Executive Experiment Dashboard
- 問い合わせフォームのバリデーション・スパム対策・DB保存
- 日本語・英語切り替え
- Free / Starter / Growth / BusinessのFeature Gate
- Free保存アイテム合計10件制限
- Starter以上の広告・LPペア分析
- Growth以上のExperiment作成

## 3. 画面・ページ構成

主要な認証後ルート:

| ルート | 内容 |
| --- | --- |
| `/dashboard` | 運用状況、Outcome、Experiment、Revenue Impactの概要 |
| `/projects` | Project管理 |
| `/demand-discovery` | 需要調査セッション管理・実行 |
| `/ad-optimization` | 広告最適化Project一覧 |
| `/ad-optimization/[projectId]` | 広告、LP、Pair、改善、X Ads、Experiment |
| `/improvements` | 改善提案一覧・状態管理 |
| `/codex-tasks` | Codex Task一覧・実行管理 |
| `/prs` | GitHub PR一覧・同期 |
| `/outcomes` | Outcome一覧・測定・Learning |
| `/experiments` | Experiment一覧、Executive指標、Insight |
| `/experiments/[experimentId]` | 状態遷移、測定収集、評価、監査履歴 |
| `/operations` | 通知、Background Job、Activity、Saved View |
| `/settings` | GitHub、課金、Workspace設定 |

公開ルートにはLP、機能説明、価格、問い合わせ、法務、Stripe結果ページがあります。

## 4. ユーザーができること

1. Projectを作成し、Demand Discoveryで市場課題を調査する。
2. Evidence付きDemand Intelligence、Competitor、Demand Scoreを確認する。
3. 広告とLPを登録してPair分析を実行する。
4. REAL / MOCK表示を確認し、改善案を承認・却下する。
5. Apply Ready改善案からCodex Taskを作成・実行する。
6. GitHub Branch、Commit、PRを生成して状態を同期する。
7. Outcomeを作成し、Before / AfterまたはConnector測定値を記録する。
8. Experimentを作成し、VariantへTrafficを割り当てる。
9. LPイベントまたはX Ads指標を収集してWinnerを評価する。
10. Winner、Learning、Revenue Impact、Insightを次回改善へ利用する。

## 5. 技術スタック

| 領域 | 技術 |
| --- | --- |
| Frontend | Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、TanStack Query、Zustand、Recharts |
| Backend | FastAPI、Pydantic、Python |
| DB / Auth / Realtime | Supabase PostgreSQL、Supabase Auth、RLS、Supabase Realtime |
| 課金 | Stripe Checkout、Billing Portal、Webhook |
| AI | OpenAI、xAI Grok、Google Gemini、Codex CLI / Manual Execution |
| 外部データ | Google Custom Search、Firecrawl、Reddit、X / X Ads |
| 開発連携 | GitHub OAuth / REST API |

## 6. データ構造

主要テーブル群:

- 基本管理: `ad_projects`, `twitter_ads`, `landing_pages`, `ad_lp_pairs`
- AI / Improvement: `ai_agents`, `ai_agent_results`, `improvement_status_history`
- Codex / GitHub: `codex_task_prompts`, `codex_task_executions`, `github_connections`, `github_pull_requests`, `github_pr_events`
- Demand: `demand_discovery_sessions`, `demand_intelligence_runs`, `demand_evidence`, `demand_competitors`, `demand_scores`, `demand_learning_contexts`
- Outcome / Learning: `improvement_outcomes`, `outcome_status_history`, `outcome_learning_data`
- Experiment: `ad_ab_tests`, `ad_ab_test_variants`, `lp_analytics_events`, `experiment_measurements`, `experiment_evaluations`, `experiment_learning_data`, `revenue_impacts`, `experiment_insights`
- Operations: `user_notifications`, `background_jobs`, `activity_events`, `saved_views`, `user_workspace_settings`
- Billing: `user_billing_profiles`, `user_credit_balances`, `credit_transactions`, `stripe_webhook_events`

## 7. 外部サービス連携

- Supabase: DB、Auth、RLS、Realtime
- Stripe: 契約、追加Credit、Portal、Webhook
- GitHub: OAuth、Repository、Branch、Commit、PR、状態同期
- X Ads: OAuth、広告・指標同期、公開
- OpenAI / Grok / Gemini: AI提案・レビュー
- Codex: CLIによるREAL_EXECUTION、またはMANUAL_EXECUTION
- Google Custom Search / Firecrawl / Reddit / X: Demand Evidence収集

外部認証情報が未設定の場合、該当ConnectorやREAL実行はUnavailableまたは明示エラーになります。MOCK結果を実結果としてLearningへ混入させません。

## 8. 現状の制限・未確認点

- 実外部サービスの本番アカウントごとの権限・Rate Limit・長時間障害試験は環境依存です。
- RedditはAPI利用審査・認証情報が必要です。
- Google Suggest、Related Search、PAA、YouTubeコメント専用取得は確認できませんでした。
- Experimentの連続値指標には高度な分散推定を実装していません。
- 複数Backend instanceでの定期Experiment評価には排他制御が必要です。
- LP公開tracking tokenのローテーション・失効UIは確認できませんでした。
- Team / Organization単位の権限管理は確認できませんでした。

## 9. 開発者向け補足

- Frontend: `cd frontend && npm install && npm run dev`
- Backend: Python依存を導入後、FastAPIアプリを起動
- DB: `supabase/migrations` を番号順に適用
- 必要な環境変数は `frontend/.env.example` と `backend/.env.example` を参照

検証済み:

- Backend全テスト: 101 passed
- Frontend型チェック: 成功
- Frontend production build: 成功
- Phase1〜8の主要実DBフロー: 保存・再取得確認済み
- Feature Gate: DB直接書込とAPIの両方でFree / Starter / Growthを確認済み

## 主な根拠ファイル

- `backend/api/main.py`
- `backend/services/**`
- `frontend/app/**`
- `frontend/hooks/**`
- `frontend/lib/api/**`
- `supabase/migrations/**`
- `docs/phase1-audit-report.md` 〜 `docs/phase8-audit-report.md`
