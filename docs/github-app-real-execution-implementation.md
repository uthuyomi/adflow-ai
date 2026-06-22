# GitHub App / REAL_EXECUTION 実装レポート

最終更新: 2026-06-23

## 実装結果

- GitHub OAuth AppとPersonal Access Token入力を新規接続経路から削除
- GitHub Appのinstallation callbackで`installation_id`とaccount情報を保存
- App JWTをRS256で生成し、処理ごとに短命なInstallation Access Tokenを発行
- `/installation/repositories`からGitHub Appで選択されたRepositoryだけを取得
- Branch、Commit、Pull Request作成とPR同期をInstallation Access Tokenへ移行
- GitHub Webhookの署名検証と、installationの削除・停止・復旧・Repository変更を同期
- REAL_EXECUTION開始時に選択Repositoryを実行専用の一時workspaceへclone
- Linux Productionでは実行ごとに一時UIDを割り当て、workspaceを`0700`に制限
- Codex子プロセスへ渡す環境変数をallowlist化し、GitHub、Supabase、Stripe等のsecretを除外
- 成功、失敗、timeoutの全経路で一時workspaceを削除
- Codexが生成した差分をDBへ保存し、PR作成時にBackendがCommitとPRを作成

## GitHub App設定

Repository permissions:

- Contents: Read and write
- Metadata: Read-only
- Pull requests: Read and write

Setup / Callback URL:

```text
https://<backend-host>/integrations/github/app/callback
```

Webhook URL:

```text
https://<backend-host>/integrations/github/webhook
```

購読イベント:

- Installation
- Installation repositories

Fly.io secrets:

```text
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
GITHUB_APP_CLIENT_ID
GITHUB_WEBHOOK_SECRET
GITHUB_APP_CALLBACK_URL
CODEX_API_KEY
```

secret値はコード、ログ、DB、ドキュメントへ保存しない。

## DB Migration

`supabase/migrations/202606200001_github_app_real_execution.sql`

- `github_connections`へinstallation、account、auth typeを追加
- 既存OAuth / PAT接続を`LEGACY_TOKEN`として保持し、再installを要求
- `github_app_install_sessions`を追加
- `codex_task_executions`へ対象Repositoryと`ISOLATED_CLONE`方式を保存

## 検証結果

- Backend: `108 passed`
- Frontend: `npm run lint`成功
- Frontend production build: 成功
- Backend Docker image build: 成功
- Container内Codex CLI: `0.141.0`
- Container内の一時UIDへの`setpriv`切り替え: 成功
- Container `/health`: `{"status":"ok"}`
- GitHub App JWTとInstallation Token発行: unit test成功
- installation限定Repository取得: unit test成功
- Branch / Commit / PRイベント保存: unit test成功
- Webhook署名不一致拒否: unit test成功
- 並列workspaceの一意性とcleanup: unit test成功
- Codex実行環境からapplication secretsを除外: unit test成功

## Production E2E証跡

2026-06-22にProduction E2Eを実施した。

- Repository: `uthuyomi/adflow-test`
- Improvement: `23dc6ce8-5527-4a7c-a9f5-d64d20427087`
- Codex Task: `be7bb659-6f11-4f5f-80cf-178ed1004812`
- Execution: `59d9e4f7-9368-400a-93b8-38998bc7a64e`
- Execution mode: `REAL_EXECUTION`
- Generated file: `docs/adflow-real-execution-proof-v2.md`
- Branch: `adflow/codex/be7bb659-6f11-4f5f-80cf-178ed1004812`
- Commit: `55131c7f68f939cb5efee8c0b09ad054737e3930`
- Pull Request: `https://github.com/uthuyomi/adflow-test/pull/1`
- PR status: `OPEN`
- Task status: `PR_CREATED`
- Workspace cleanup: `/tmp/adflow-codex`の残存task directoryは0件

DBで以下を再取得済み:

- Improvement: `GENERATED -> APPROVED -> APPLY_READY`
- Codex Task: `CREATED -> QUEUED -> RUNNING -> SUCCEEDED -> PR_CREATED`
- GitHub events: `creation_started -> commit_created -> pr_created`
- Credit transactions: Task 100、Execution 150、PR 40を冪等キー付きで消費

初回検証では、一時UIDで実行するGitプロセスの`safe.directory`エラーと、未追跡ディレクトリが`?? docs/`へ省略される問題を検出した。前者は明示的な`safe.directory`指定、後者は`git status --porcelain=v1 -uall`で修正し、失敗分のExecution creditを補償した。

Production E2E判定: **PASS**

## 未確認事項

- 複数REAL_EXECUTIONを同時にProductionで動かす負荷試験
- Fly.io 1GB shared CPU環境での同時実行上限
- GitHub API Rate Limitおよび長時間障害時の復旧試験
