# Phase8 Audit Report

## 現状問題一覧

監査開始時点のA/B Testingは、登録済み広告の現在値を比較して暫定勝者を表示する実装だった。状態は小文字の `draft / running / completed / archived` のみで、割当、期間別測定、統計判定、監査ログ、Revenue Impact、Experiment Learningとの接続はなかった。

OutcomeとOutcome Learning、X Ads metric snapshotsは実装済みだったため、Phase8ではこれらを置換せず、実験結果の下流として接続した。

## Experiment設計

### 状態モデル

`DRAFT → READY → RUNNING → PAUSED → RUNNING → COMPLETED → ARCHIVED`

失敗時は `READY / RUNNING / PAUSED → FAILED → READY` を許可する。`COMPLETED` は、保存済み測定値から統計的に有意な勝者が検出された場合だけ許可する。遷移はBackendとDB triggerの両方で検証する。

### Variant設計

Variantは広告、LP、または構造化された変更設定を保持できる。A/B/C以上に対応し、allocation、状態、設定、関連広告・LPを保存する。実験開始前は追加・編集・削除が可能で、実行中はallocation変更のみ許可する。

### トラフィック設計

Experimentごとに公開tracking tokenを発行する。公開割当APIはExperiment IDとsession IDのSHA-256値を使い、同じsessionを常に同じVariantへ安定割当する。allocation合計が100%でないExperimentはREADYへ移行できない。

## Measurement設計

LP Runtime AnalyticsはPage View、Session、Bounce、Scroll Depth、Time On Page、CTA Click、Form Submit、Conversion、Revenueを冪等保存する。外部LPからは公開tracking tokenを使って送信する。

広告指標は既存の `x_ads_metric_snapshots` を集計し、CTR、CVR、CPC、CPA、Spend、Revenue、ROASをExperiment measurementへ保存する。データが存在しない場合は0件として保存し、勝者を生成しない。

二値指標は二標本比率検定でconfidenceを算出する。各Variantがminimum sample sizeを満たさない場合は `INSUFFICIENT_DATA`、confidence thresholdを満たさない場合は `NO_WINNER` とする。

## Learning統合設計

勝者検出時のみ `experiment_learning_data` を保存する。winner pattern、loser pattern、impact score、confidence scoreを保持する。関連Outcomeがある場合は実験のBefore/AfterをOutcome measurementへ流し、既存Outcome Learningへ保存する。

Outcome Learning contextはExperiment Learningも返すよう変更したため、次回の広告・LP分析で過去の実測Experiment patternを参照できる。

## 実装変更一覧

### DB migration

- `supabase/migrations/202606150003_phase8_experiment_measurement_learning.sql`
- Experiment正式状態、Variant拡張、監査ログ
- LP analytics events、measurements、evaluations
- Experiment Learning、Revenue Impact、Evidence付きInsight
- RLS、index、状態遷移trigger、Executive dashboard RPC

### Backend

- `backend/services/product/ad_ab_test_service.py`
  - Experiment CRUD、Variant管理、allocation、公開traffic assignment
  - LP event取込、X Ads集計、測定保存、統計評価
  - Winner、Learning、Revenue Impact、Insight、Alert、Outcome接続
  - RUNNING Experiment定期評価
- `backend/services/outcomes/outcome_learning_engine.py`
  - Experiment Learningを次回提案コンテキストへ接続
- `backend/services/x_ads/x_ads_service.py`
  - X Ads公開時のExperiment状態遷移とOutcome関連付け
- `backend/api/main.py`
  - Experiment、Variant、Traffic、Analytics、Measurement、Evaluation、Dashboard API
  - 定期Experiment評価ループ

### Frontend

- `/experiments`: Experiment一覧、状態絞り込み、Executive指標、Insight
- `/experiments/[experimentId]`: 状態遷移、測定収集、評価、監査履歴
- Dashboard: Active Experiment、Winner/Loser、成功率、改善率、Revenue Impact
- Sidebar: Experiment導線

## 動作確認結果

| 対象 | 結果 |
| --- | --- |
| Experiment状態遷移・不正遷移 | 自動テスト成功 |
| Variant複数対応・allocation検証 | コード・自動テスト確認 |
| Traffic安定割当 | 同一sessionの同一Variant割当テスト成功 |
| LP Runtime Analytics | 実イベント集計テスト成功 |
| データ不足 | 勝者を生成せず `INSUFFICIENT_DATA` になることを確認 |
| Winner Detection | 実イベント件数から勝者・confidenceを生成するテスト成功 |
| Learning / Revenue / Alert | 勝者検出時の保存テスト成功 |
| Outcome接続 | 既存Outcome measurement / Learning経路へ接続 |
| Backend全テスト | 87 passed |
| Frontend型チェック | 成功 |
| Frontend production build | 成功 |
| `git diff --check` | 成功 |
| 実DB状態遷移 | `DRAFT → READY → RUNNING → COMPLETED` と再取得を確認 |
| 実DB不正遷移 | `DRAFT → COMPLETED` がHTTP 400で拒否されることを確認 |
| 公開Traffic / Analytics | 同一sessionの安定割当と公開LPイベント保存を確認 |
| Winner / Learning / Revenue | 実DB保存・API再取得・RLS再取得を確認 |

## データ確認結果

2026年6月15日にPhase8 migration適用後の実Supabaseで、一時ユーザーを用いた通し試験を実施した。検証後は一時ユーザーを削除し、関連データが全テーブルからcascade削除されたことを確認した。

| テーブル | 通し試験中の保存件数 | 確認内容 |
| --- | ---: | --- |
| `lp_analytics_events` | 451 | 公開APIイベント1件と実験用Page View/Form Submitを保存 |
| `experiment_measurements` | 4 | 2 Variantの収集と評価時スナップショットを保存 |
| `experiment_evaluations` | 1 | `WINNER_FOUND`、sample size 401、confidence 0.999995 |
| `experiment_learning_data` | 1 | Variant Bをwinner pattern、Variant Aをloser patternとして保存 |
| `revenue_impacts` | 1 | baseline 1,000、measured 4,000、incremental revenue 3,000 |
| `experiment_insights` | 1 | Evidence付きWinner Insightを保存 |
| `experiment_status_history` | 4 | 作成、READY、RUNNING、COMPLETEDを保存 |
| `user_notifications` | 1 | Winner確定通知を保存 |

検証ExperimentではControlのForm Submit率が約4.98%、Candidateが20%となり、Candidateを勝者として検出した。改善率は302%、Executive dashboardのsuccess rateは100%、Revenue Impactは3,000として再取得できた。認証ユーザーJWTによるRLS経由のLearning再取得も成功した。

再読込相当のExperiment詳細API再取得後も状態は`COMPLETED`で維持された。検証後の一時ユーザー、Project、Experiment、Analytics、Measurement、Evaluation、Learning、Revenue Impact、Insightの残存件数は全て0件だった。

## 最終プロダクト監査

Phase1からPhase7の既存実装へ、Phase8のExperiment・Measurement・Winner Detection・Learning・Revenue Impactのコード経路を接続した。固定レスポンスやMock Experimentは追加していない。測定データが不足する場合は、勝者やRevenue Impactを仮生成しない。

### 未実装・未確認

- 実X Adsアカウントから取得したmetric snapshotsを使う長期間の本番評価
- 複数API instance運用時のbackground evaluation排他制御
- 長時間運用でのRate Limit、ネットワーク障害、外部Analytics障害試験
- 統計手法は二値指標の比率検定が中心。連続値の高度な分散推定は未実装

### 技術的負債

- FastAPI `on_event` はdeprecated warningがあり、lifespanへの移行が必要
- Experiment定期評価は単一APIプロセス内ループであり、複数instanceではジョブロックが必要
- LP公開tracking tokenのローテーション・失効UIは未実装

## リリース判定

**READY**

Phase8 migration、実DB保存、公開Analytics取込、Experiment状態遷移、不正遷移拒否、Winner Detection、Learning、Revenue Impact、Insight、通知、RLS再取得、ページ再読込後の状態維持を実Supabaseで確認した。Backend全87テスト、Frontend型チェック・本番ビルドも成功している。

本番リリース時は、外部X Ads/Analyticsの長時間運用監視と、複数API instanceでの定期評価排他制御を運用課題として継続管理する。
