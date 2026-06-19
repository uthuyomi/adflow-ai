# 未実装機能監査レポート

最終更新: 2026年6月15日

Phase1〜Phase8実装後の残課題だけを記載します。過去に未完成だったImprovement、GitHub、Codex、Outcome、Experiment、検索、通知、問い合わせ、Stripe整合性は現在のコードと実DB試験で接続済みです。

## 完全未実装

| 機能 | 根拠 | 内容 |
| --- | --- | --- |
| Google Suggest / Related Search / PAA専用実取得 | `backend/services/demand/search_demand_layer.py` | 現在はEvidence Connector結果と参考推定を利用し、各Google専用取得経路は確認できない |
| YouTubeコメント専用Connector | `backend/services/demand/**` | 専用取得・保存経路は確認できない |
| Team / Organization権限管理 | DB migrations、認証コード | ユーザー単位RLSはあるが組織・役割モデルは確認できない |
| LP tracking tokenローテーションUI | Phase8 Experiment実装 | token発行・利用はあるが、失効・再発行画面は確認できない |

## モック実装

本番デフォルトとして利用され、実結果に見えるモック処理は確認されていません。

AIのMOCK経路自体は開発・フォールバック用途として残っていますが、`provider_type=MOCK`、`failure_reason`、`source_provider`を保存・表示し、Scorecard、Codex、Outcome Learning対象から除外します。

## 接続漏れ

| 機能 | 内容 |
| --- | --- |
| Reddit実取得 | Connectorは実装済み。実運用にはReddit API審査と認証情報設定が必要 |
| 本番LP Analytics送信 | 公開割当・イベントAPIは実装済み。各配信LPへtracking呼び出しを組み込む必要がある |
| 複数Backend instanceのExperiment定期評価 | 単一instance内の定期評価は実装済み。複数instance向け分散ロックは未実装 |

## 不完全実装

| 機能 | 内容 |
| --- | --- |
| 連続値Experiment統計 | 二値指標は二標本比率検定を利用。連続値の高度な分散推定・ベイズ評価は未実装 |
| 外部Connector障害耐性 | 状態保存・エラー表示は実装済み。本番Rate Limitや長時間障害の継続試験は環境依存 |
| LP実ブラウザ計測 | Runtime event計測は実装済み。Core Web Vitalsやブラウザレンダリング監査の専用実行基盤は限定的 |

## 疑似実装

現行の主要ユーザーフローに、成功通知だけを返す疑似実装は確認されていません。

## 主要機能の現在評価

| 機能 | 現在評価 | 根拠 |
| --- | ---: | --- |
| Demand Discovery / Intelligence | 90% | 実Evidence、Competitor、Score、Learning Contextを実DB保存・再取得確認 |
| Improvement Workflow | 95% | 状態遷移、理由、監査履歴、統計を実DB確認 |
| GitHub Integration / PR | 90% | OAuth、Repository、Branch、Commit、PR、同期、保存を実装 |
| Codex Task | 90% | 一覧、詳細、実行、手動登録、結果、PR / Outcome接続 |
| Outcome / Learning | 95% | 実測、評価、Learning保存、次回分析利用を実DB確認 |
| Experiment / Measurement | 95% | Traffic、LPイベント、Winner、Learning、Revenue Impactを実DB確認 |
| X Ads | 90% | 接続、同期、公開、測定経路を実装 |
| Stripe / Credit | 95% | 成功・失敗・返金・キャンセル・冪等性をtest mode確認 |
| Operations Workspace | 95% | Search、通知、Job、Timeline、Realtime、再接続を実DB確認 |

## 今すぐ直すべき残課題

1. 複数Backend instance向けExperiment定期評価ロック
2. LP tracking tokenのローテーション・失効
3. 本番LPへのAnalytics SDK組み込みと監視
4. 外部ConnectorのRate Limit・長時間障害試験
5. Team / Organization権限モデル
6. 連続値Experiment向け統計評価
7. Reddit審査完了後の実接続試験
8. Core Web Vitals・実ブラウザLP監査の拡張

## 判定

主要なDiscover → Improve → Implement → Measure → Learnループは、コード、自動テスト、実Supabase統合試験で成立しています。残課題は運用成熟、外部認証、統計高度化、複数instance対応が中心です。
