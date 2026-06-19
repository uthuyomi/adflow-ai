# Phase7 Audit Report

> **時点監査資料:** この文書の「現状問題一覧」は当該Phase開始時点の記録です。現在の状態は [`adflow-ai-current-state.md`](adflow-ai-current-state.md) と [`phase8-audit-report.md`](phase8-audit-report.md) を参照してください。


## 現状問題一覧

Phase7着手時点では、Projectは作成と一覧表示だけが画面接続され、更新・削除フックは存在しても利用されていませんでした。Demand Discoveryセッションは保存されていましたが、一覧・再開・お気に入り・検索・削除の操作がありませんでした。

Headerの検索、Project切替、Sync、通知はUIだけで、検索API、通知保存、既読管理、同期処理へ接続されていませんでした。また、Background Job、横断Activity、Saved View、Workspace設定を保存するテーブルとAPIは存在しませんでした。

## UX設計

### 画面構成

- `/projects`: Project作成、検索、状態フィルタ、Pause、Archive、Restore、Soft Delete、複製
- `/projects/[projectId]`: Project編集、Project単位Activity Timeline
- `/demand-discovery`: セッション一覧、検索、再開、お気に入り、Soft Delete
- `/operations`: Background Job、再試行、横断Activity、Saved View
- `/dashboard`: Active Project、未処理Improvement、Codex、Open PR、測定待ちOutcome、失敗Job、最新Activity
- `/settings`: タイムゾーン、表示密度、デフォルト画面、通知設定
- 共通Header: 横断検索、Project切替、手動同期、通知センター

### 検索構造

`global_workspace_search` RPCで、Projects、Discovery、Research、Competitors、Improvements、Codex Tasks、Outcomes、Learningをユーザー単位で横断検索します。検索結果は種別、タイトル、概要、遷移先URL、更新日時を返します。

### 通知構造

Demand/Research完了、Improvement生成、Codex状態変更、GitHub PR状態変更、Outcome更新、Learning更新、Billing取引をDBトリガーから通知・Activityへ保存します。通知設定が無効な場合、通知は作成せずActivityだけを記録します。

## Dashboard設計

Dashboard集約RPCは、Active Project、最新Discovery、最新Research、未処理Improvement、Codex Task、Open PR、測定待ちOutcome、未読通知、失敗Job、最新Activityを1回で取得します。既存の複数機能別集計に加え、運用キューと最新Activityを表示します。

## 実装変更一覧

### DB migration

- `supabase/migrations/202606150001_phase7_operations_workspace.sql`
  - Project状態、Discovery管理列
  - `user_notifications`
  - `background_jobs`
  - `activity_events`
  - `saved_views`
  - `user_workspace_settings`
  - 横断検索RPC、Dashboard集約RPC
  - 通知・Activity・Job同期トリガー
  - Realtime publication登録

### Backend

- `backend/services/operations/workspace_service.py`
  - Project CRUD、複製、検索、Dashboard、通知、Job、Activity、Saved View、設定
- `backend/services/product/demand_discovery_service.py`
  - セッション一覧条件、検索、お気に入り、Project関連、状態更新、削除状態
- `backend/services/supabase/supabase_repository.py`
  - ユーザー所有レコードの汎用削除
- `backend/api/main.py`
  - `/operations/**` API群
  - Discovery Session管理API

### Frontend

- Headerを横断検索、Project切替、手動同期、Realtime通知センターへ接続
- Project一覧・詳細を運用CRUDとActivityへ接続
- Demand Discoveryへセッション履歴管理を追加
- Dashboardへ統合運用集計を追加
- `/operations` を追加
- Workspace設定UIを追加
- Supabase Realtimeで通知、Job、Activity変更時にQueryを再取得

## 動作確認結果

| 対象 | 結果 |
| --- | --- |
| Project CRUD / 状態 / 複製 | サービス単体テスト成功、UI型チェック・ビルド成功 |
| Discovery Sessions | API・UI接続を確認、UI型チェック・ビルド成功 |
| Search | RPC・API・Header接続をコード追跡で確認 |
| Notifications | DBトリガー・API・Realtime・UI接続をコード追跡で確認 |
| Timeline | DBトリガー・API・Project/Operations画面接続を確認 |
| Dashboard | 集約RPC・API・画面接続を確認 |
| Sync | Supabase Realtime購読と手動再取得を確認 |
| Settings | DB・API・設定画面接続を確認 |
| 異常系 | 不正Project状態、失敗Job以外の再試行、最大再試行を拒否 |
| 実DB保存・再取得 | Project、Discovery、Saved View、通知、Job、設定で成功 |
| 認証API | 一時Supabase AuthユーザーからFastAPI経由で全対象API成功 |
| RLS | 一時ユーザーが自分のProjectだけを取得することを確認 |
| Job実再試行 | FAILED Demand Runから新規Runを作成し、JobがSUCCEEDEDへ更新 |
| Realtime WebSocket | 通知・Activity・Jobを約1.1秒で即時受信 |
| 切断時同期 | Realtime切断中の通知を10秒ポーリングで約10.3秒後に取得 |
| 再接続 | 保存済み認証セッションを復元したクライアントで再購読し、約1.0秒でActivityを受信 |

自動テスト結果:

- Backend: **82 passed**
- Frontend TypeScript: **成功**
- Frontend production build: **成功**
- Phase1 billing/contact tests: **6 passed**
- `git diff --check`: **成功**

## パフォーマンス確認

- 横断検索は最大100件、通常30件へ制限
- Dashboardは複数一覧取得ではなく集約RPC 1回
- Activity、通知、Job、Saved Viewにユーザー・状態・日時Indexを追加
- Frontend Queryは15秒から30秒のstale timeを設定
- Realtimeイベント時は関連するOperations Queryだけを無効化

実DB APIの計測結果:

- 横断検索RPC: **309.5ms**
- Dashboard集約RPC: **251.9ms**

## DB確認結果

2026年6月15日時点で接続済みSupabaseに対し、以下を実DBで確認しました。

- Phase7テーブルとRPCが利用可能
- Projectの作成、Pause、Archive、Restore、再取得
- 不正Project状態のDB制約拒否
- Discovery SessionのProject紐付け、お気に入り、再取得
- Saved View、通知既読、Workspace設定、Job状態の保存・再取得
- ProjectおよびDiscoveryのActivityトリガー保存
- 横断検索で作成Projectを取得
- Dashboard集約へ作成Projectが反映
- FastAPI認証経由のProject、Discovery、検索、Dashboard、設定、Saved View、Activity、通知API
- RLSによるユーザー分離
- FAILED Demand Jobの再試行で、新規Demand Runを生成してSUCCEEDEDへ更新

検証には一時ユーザーと一時レコードを使用し、終了後に削除しました。

## 未解決事項

- Supabase CLIが環境に存在しないため、ローカルDB lintは未実行
- 既存のi18n監査は、Phase7以前を含むハードコード文字列を検出して失敗する

## Phase8へ進めるか判定

**YES**

実DB保存、API、RLS、検索、通知、履歴、Job実再試行、パフォーマンス、Realtime即時受信、切断時ポーリング、認証セッション復元後の再接続を確認しました。Phase7の完了条件を満たしたため、Phase8へ進めます。
