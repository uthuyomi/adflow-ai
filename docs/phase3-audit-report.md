# Phase3 Audit Report

実施日: 2026-06-12

## 現状問題一覧

| 問題 | 影響 | 修正内容 |
| --- | --- | --- |
| 旧Branch・Commitサービスは`planned`を返すだけだった | GitHubへ変更が作成されない | GitHub Git Data APIを使う実処理へ置換 |
| 旧PR既定経路はメモリ実装だった | PR番号0・空URLを返し得た | モック経路を削除し、未設定時は明示エラー化 |
| GitHub接続・Repository選択・PR結果の永続化がなかった | ユーザー別管理、再読込、監査ができない | Phase3テーブルとAPIを実装 |
| 再接続時に接続テーブルの一意制約へ衝突した | Revoke後に再接続できない | 同じGitHubユーザーの接続レコードを再有効化 |
| OAuthセッション期限を検証していなかった | 期限切れstateを利用できた | callback時の期限検証と`expired`保存を追加 |
| Repository消失・権限喪失がFAILEDレコードを残さない場合があった | 異常系の監査証跡が欠落する | PRレコードを先に作り、失敗時に`FAILED`とイベントを保存 |
| 一部GitHub API例外がHTTP 500へ漏れた | UIが異常理由を扱いにくい | GitHub関連APIで明示的にHTTP 400へ変換 |
| PR一覧に定期同期がなかった | GitHub上の状態変更がDBへ反映されない | PR一覧表示中は60秒ごとに`sync-all`とDB再取得を実行 |
| 画面を開いていない間は同期されなかった | 長時間運用でDB状態が古くなる | FastAPI起動中に全ユーザーの追跡対象PRを定期同期 |
| CLOSED状態を同期対象外にしていた | GitHubでReopenされたPRを検知できない | OPEN・CLOSEDを追跡し、ReopenもDBへ反映 |
| 切断済み接続を定期同期すると失敗ログが増え続ける | 不要な監査イベントとAPI呼び出しが発生する | active接続だけをサーバー定期同期対象に限定 |

## GitHub統合設計

### 認証方式

- GitHub OAuth Appによる`repo read:user`接続経路を実装。
- OAuth未設定環境向けに、GitHub tokenを検証して接続する経路を実装。
- tokenはFernet暗号化後に`github_connections`へ保存する。
- 接続解除後は`revoked`となり、API利用を拒否する。再接続時は同じ接続レコードを再有効化する。
- OAuth App未設定時は利用不能なOAuthボタンを非表示にし、token接続を利用する。

### 権限・Repository管理

- `/user`でGitHub認証情報を検証する。
- Repository選択時とPR作成時に、Repository存在確認とpush権限確認を行う。
- 選択したRepository、GitHub repository ID、default branch、権限、検証時刻をDB保存する。

### PR生成方式

1. DB上の改善提案が`APPLY_READY`であることを検証する。
2. 改善提案からレビュー用Markdown差分を生成し、`diff_payload`へ保存する。
3. GitHub上でBlob、Tree、Commitを作成する。
4. `adflow/{improvement_id}` Branchを作成する。
5. Pull Requestを作成する。
6. Branch、Commit SHA、PR番号、URL、状態、監査イベントをDB保存する。

## 実装変更一覧

- `supabase/migrations/202606120003_phase3_github_pr_workflow.sql`
- `backend/services/github/github_api_client.py`
- `backend/services/github/github_integration_service.py`
- `backend/api/main.py`
- `backend/core/config.py`
- `backend/tests/test_phase3_github_integration.py`
- `frontend/lib/api/prs.ts`
- `frontend/hooks/usePrs.ts`
- `frontend/components/improvements/GitHubPrPanel.tsx`
- `frontend/components/settings/GitHubConnectionCard.tsx`
- `frontend/app/prs/page.tsx`
- `frontend/app/results/page.tsx`
- `frontend/app/settings/page.tsx`

旧疑似実装の`github_branch_service.py`、`github_commit_service.py`、`in_memory_pr_client.py`は削除しました。

## 動作確認結果

| 項目 | 結果 |
| --- | --- |
| Phase3 DB migration | PASS。5テーブルを実DB REST APIから取得 |
| token接続 | PASS。実GitHubアカウント`uthuyomi`を検証・暗号化保存 |
| 接続解除・再接続 | PASS。`active → revoked → active`、解除中のRepository取得はHTTP 400 |
| OAuthロジック | 単体テストPASS。期限切れsessionを`expired`として拒否 |
| OAuth可用性UI | PASS。OAuth App未設定時はOAuthボタンを非表示 |
| Repository取得 | PASS。実APIから15件取得 |
| Repository選択・権限 | PASS。`uthuyomi/adflow-ai`、push権限確認 |
| Branch取得 | PASS。実GitHub APIから取得 |
| Branch生成 | PASS。実GitHub上で確認 |
| Commit生成 | PASS。実GitHub上で確認 |
| PR生成 | PASS。実GitHub PR #2を作成 |
| API一覧取得 | PASS。Bearer認証付きHTTP APIからDB保存PRを再取得 |
| 再読込維持 | PASS。DB再取得後も`OPEN`、同期後も`CLOSED`を維持 |
| 手動同期 | PASS。GitHubでClose後、DBを`CLOSED`へ更新 |
| UI定期同期 | PASS。PR一覧表示中は60秒間隔で`sync-all` |
| サーバー定期同期 | PASS。実時間検証で`CLOSED → OPEN → CLOSED`をDBへ自動反映 |
| OPEN / CLOSED同期 | 実GitHubと実DBでPASS |
| MERGED同期 | PASS。一時base branch向けPRを実Mergeし、DBを`MERGED`へ更新 |
| FAILED保存 | PASS。存在しないRepositoryで`FAILED`と監査イベントを実DB保存 |
| API異常応答 | PASS。無効接続・存在しないRepositoryはHTTP 400 |
| Backendテスト | 52件PASS |
| Backend import | PASS |
| Frontend型チェック | PASS |
| Frontend本番ビルド | PASS |
| `git diff --check` | PASS |

## GitHub実証結果

| 項目 | 実証値 |
| --- | --- |
| Repository | `uthuyomi/adflow-ai` |
| Improvement ID | `ac52ac5d-69c1-4a8b-8a03-950df564b242` |
| Branch | `adflow/ac52ac5d-69c1-4a8b-8a03-950df564b242` |
| Commit SHA | `2876c0102971d0966a094231ea9fc466b939e552` |
| PR URL | https://github.com/uthuyomi/adflow-ai/pull/2 |
| PR番号 | `2` |
| 検証後状態 | `CLOSED` |
| Changed file | `docs/adflow-improvements/ac52ac5d-69c1-4a8b-8a03-950df564b242.md` |
| Additions | 18 |

スクリーンショットは上記PR URLを開き、OverviewでBranch・Commit、Files changedで生成文書を表示して取得できます。

MERGED同期実証:

| 項目 | 実証値 |
| --- | --- |
| PR URL | https://github.com/uthuyomi/adflow-ai/pull/3 |
| PR番号 | `3` |
| Branch | `adflow/67305bdf-f22c-40d9-95f2-350d57eceec2` |
| Commit SHA | `8ba20bbf4fdee81f0fce35f13e84429a2e34ce47` |
| Merge Commit | `f2930bab00e457784b97a9ad59d8fc7c75f73a66` |
| DB同期状態 | `MERGED` |
| main SHA | 検証前後とも`7b9b2b372343f2d7d32cc5a9adbf65b4b8438f8e` |
| 後処理 | 一時base branch・head branchを削除 |

## DB確認結果

検証ユーザーに対する最終確認時の件数:

| テーブル | 件数 | 状態 |
| --- | ---: | --- |
| `github_connections` | 1 | 検証完了後に`revoked` |
| `github_repository_selections` | 1 | `active` |
| `github_pull_requests` | 3 | `CLOSED`、`FAILED`、`MERGED`各1件 |
| `github_pr_events` | 13 | 作成開始、Commit作成、PR作成、定期同期、Merge同期、失敗を保存 |

成功サンプル:

- `github_pull_requests.id`: `7b2fccba-e89b-4548-a337-928311aa0587`
- `status`: `CLOSED`
- `commit_sha`: `2876c0102971d0966a094231ea9fc466b939e552`
- `pr_number`: `2`
- `pr_url`: `https://github.com/uthuyomi/adflow-ai/pull/2`

異常系サンプル:

- `github_pull_requests.id`: `428ca790-e23c-43c6-bd22-0ccc111ea7ca`
- `status`: `FAILED`
- 原因: 存在しないRepositoryへのGitHub API 404
- 保存イベント: `creation_started`、`creation_failed`

## 未解決事項

1. 実GitHub OAuth Appのclient ID・secretは環境に未設定です。OAuthコード経路と期限検証はテスト済みで、未設定時はUIを非表示にします。実接続はtoken方式で検証済みです。
2. 現在生成する差分は、改善内容をレビューするMarkdown実装ブリーフです。プロダクトソースコード自体の変更生成・実装はCodex実行フェーズの対象です。
3. GitHub接続解除はAdFlow-AI内の利用停止です。ユーザーがGitHub側で発行したtoken自体の失効はGitHub設定で行います。

## Phase4へ進めるか判定

**YES**

`APPLY_READY`改善提案から実GitHub RepositoryへBranch・Commit・Pull Requestを作成し、Diff・PR結果・監査イベントをDB保存する経路を実証しました。

さらに、実GitHub上のOPEN・CLOSED・MERGEDをDBへ同期し、Repository消失時のFAILED保存、手動同期、UI定期同期、画面非表示時のサーバー定期同期、切断・再接続まで確認済みです。Phase3の完了条件を満たしたため、Phase4へ進めます。
