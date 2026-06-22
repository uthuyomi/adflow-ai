# 進捗棚卸し 2026-06-20

調査実施日: 2026-06-22

本書はコード読解、ローカル実行、Fly.io / VercelへのHTTP確認、Supabase実DB再取得、外部APIへの実リクエストを区別して記録する。secretの値は記載しない。

## テスト実行結果

### Backend

実行:

```text
py -3.12 -m pytest backend/tests -v
```

最終出力:

```text
======================= 108 passed, 4 warnings in 8.65s =======================
```

4件はFastAPIの`on_event`非推奨警告で、失敗ではない。

### Frontend型チェック

実行:

```text
cd frontend
npm run lint
```

出力:

```text
> adflow-ai-frontend@0.1.0 lint
> next typegen && tsc --noEmit

Generating route types...
✓ Route types generated successfully
```

### npm audit

実行:

```text
cd frontend
npm audit
```

出力:

```text
found 0 vulnerabilities
```

### i18n監査

追加確認として`npm run i18n:audit`を実行した。

```text
Visible hard-coded UI strings (117):
```

終了コードは1。前回資料の114件から117件へ増加している。

## Dirty Worktree一覧

`git status`の要点:

```text
On branch main
Your branch is ahead of 'origin/main' by 4 commits.
```

先行4コミットはすべて`auto-commit`という件名で、リリース内容をコミット名から判別できない。

`git diff --stat`:

```text
18 files changed, 624 insertions(+), 276 deletions(-)
```

未追跡6ファイルは上記statに含まれない。`git diff --check`は問題なし。追跡対象ファイルから秘密鍵、Webhook secret、Stripe secretの固定値は検出されなかった。

| 変更 | 内容 | リリース要否 | リスク |
| --- | --- | --- | --- |
| `CLAUDE.md` | GitHub App / REAL_EXECUTION等の開発ガイド更新 | 必要 | コードとの最終整合確認が必要 |
| `backend/.env.example` | GitHub App / Codex環境変数定義 | 必要 | 値は空で、secret埋め込みなし |
| `backend/Dockerfile` | Codex CLI、git、`setpriv`、実行ユーザー導入 | 必要 | CLIバージョン固定。イメージサイズと供給元更新を継続監視 |
| `backend/api/main.py` | GitHub App callback、claim、REAL実行API等 | 必要 | 影響範囲が広い |
| `backend/core/config.py` | GitHub App / Codex設定とProduction検証 | 必要 | 旧`GITHUB_TOKEN`設定項目が残存 |
| `backend/fly.toml` | GitHub App / isolated workspace本番設定 | 必要 | 1GB shared CPUで同時REAL実行時の余力未計測 |
| `backend/services/codex/codex_task_service.py` | isolated cloneでのREAL実行、差分取得、PR接続 | 必要 | 同時実行はunit testのみ |
| `backend/services/github/github_api_client.py` | Installation token対応API処理 | 必要 | GitHub API失敗時の本番長時間試験なし |
| `backend/services/github/github_integration_service.py` | Installation保存、Repository選択、Webhook同期 | 必要 | 旧Legacy selectionがDBに残る |
| `backend/tests/test_phase3_github_integration.py` | GitHub App経路のテスト更新 | 必要 | なし |
| `docs/ai-context-master.md` | 技術現状更新 | 必要 | コードとの差分確認が必要 |
| `frontend/.env.example` | 旧GitHub設定削除 | 必要 | なし |
| `frontend/app/codex-tasks/[taskId]/page.tsx` | Repository選択付きREAL実行 / PR UI | 必要 | hard-coded英語を含む |
| `frontend/components/improvements/GitHubPrPanel.tsx` | GitHub App接続導線 | 必要 | hard-coded英語を含む |
| `frontend/components/settings/GitHubConnectionCard.tsx` | GitHub App install / claim UI | 必要 | hard-coded英語を含む |
| `frontend/hooks/use-codex-tasks.ts` | REAL実行payload更新 | 必要 | なし |
| `frontend/lib/api/codex.ts` | Repository selection付きAPI契約 | 必要 | なし |
| `frontend/lib/api/prs.ts` | GitHub App install / claim API | 必要 | なし |
| `backend/services/codex/isolated_workspace.py` | タスク別workspace、UID分離、secret allowlist、cleanup | 必要 | 未追跡のため、このままでは通常のcloneに含まれない |
| `backend/services/github/github_app_auth.py` | App JWTと短命Installation token発行 | 必要 | 未追跡 |
| `backend/tests/test_codex_isolated_workspace.py` | 並列分離、cleanup、secret除外テスト | 必要 | 未追跡 |
| `backend/tests/test_github_app_auth.py` | JWT / tokenオンデマンド発行テスト | 必要 | 未追跡 |
| `docs/github-app-real-execution-implementation.md` | 実装・E2E証跡 | 判断必要 | 現在文字化けしており、そのまま公開不可 |
| `supabase/migrations/202606200001_github_app_real_execution.sql` | Installation / install session / execution metadata | 必要 | 未追跡。適用済みDBとの履歴不一致を防ぐため必ず管理対象にする |

結論: commitもdiscardも実施していない。現状は再現可能なリリースソースとして未整理。

## ドメイン別実装状況

### 1. GitHub App連携

判定: **完成（今回確認した単一Repository接続とPR作成経路）**

確認方法:

- コード確認: App JWT、Installation token、callback、claim、Repository列挙、Webhook署名検証を確認。
- 実API: Installation tokenを実発行。
- 実API: `/installation/repositories`は`uthuyomi/adflow-test`だけを返し、`total_count=1`。
- 実DB: `auth_type=GITHUB_APP`、`installation_id`、`repository_selection_mode=selected`、`status=active`を再取得。
- 実Production: Branch、Commit、PR作成済み。

実証跡:

```text
Repository: uthuyomi/adflow-test
PR: https://github.com/uthuyomi/adflow-test/pull/1
Commit: 55131c7f68f939cb5efee8c0b09ad054737e3930
PR status: OPEN
```

残課題:

- Fly.ioには旧`GITHUB_TOKEN`と`GITHUB_REPOSITORY` secret名が残る。新経路では不要なので削除判断が必要。
- 過去の`LEGACY_TOKEN` connectionとRepository selectionがDBに残る。現在のApp connectionとは分離されているが、運用上の整理が必要。
- 会話中に扱ったWebhook secretは、リリース前にローテーションするのが安全。

### 2. Codex REAL_EXECUTION

判定: **部分実装**

確認方法:

- コード確認: Dockerfileに`@openai/codex@0.141.0`、git、`setpriv`を導入。
- コード確認: 実行ごとにUUID付きclone、Linuxでは一時UID、workspace `0700`、環境変数allowlist、`finally` cleanup。
- unit test: 並列workspaceの一意性、cleanup、secret除外を含め成功。
- 実Production: `REAL_EXECUTION`が成功し、DB再取得できた。

実証跡:

```text
Task: be7bb659-6f11-4f5f-80cf-178ed1004812
Execution: 59d9e4f7-9368-400a-93b8-38998bc7a64e
Mode: REAL_EXECUTION
Status: SUCCEEDED
Workspace strategy: ISOLATED_CLONE
Generated: docs/adflow-real-execution-proof-v2.md
Task status: PR_CREATED
```

MANUAL_EXECUTIONとの切り替え経路もコードとテストに存在する。

部分実装とする理由:

- 複数REAL_EXECUTIONの同時Production実行は未実施。並列性はunit testのみ。
- Fly.io VMはshared CPU 1、memory 1GB。同時実行時のメモリ不足・timeout・キュー制御を実測していない。
- DBの`diff_summary`は成功Executionでも`?? docs/`のまま。個別ファイルは保存できているが、監査表示として粗い。

### 3. プラン別Feature Gating

判定: **完成**

確認方法:

- unit test: Free / Starter / Growth / Business / inactive状態を確認。
- 実Production API: 監査用一時ユーザー3名を作成し、試験後に全員削除。

Production結果:

| Plan | Pair Analysis | Experiment作成 | 保存上限 |
| --- | --- | --- | --- |
| Free | 403、Starter要求 | 403、Growth要求 | 10件成功、11件目403 |
| Starter | Plan gate通過後、存在しないPairで400 | 403、Growth要求 | 上限なし |
| Growth | Plan gate通過後、存在しないPairで400 | Plan gate通過後、無効Adで400 | 上限なし |

Starter / Growthの許可側が403ではなく後段validationへ進んだことも確認した。MigrationのDB triggerとBackend APIの二重防御がある。

### 4. Stripe

判定: **部分実装**

確認方法:

- コード確認: Checkout、Portal、署名検証、Webhook冪等記録、返金処理が存在。
- Stripe API: ローカル設定はTest Mode。
- Stripe API: Vercel Webhook endpointは`enabled`、購読イベント7件。
- 実イベント: `customer.subscription.deleted`をStripe CLIから発火。
- 実DB: 同イベントは`completed`として保存・再取得。

同じfixtureが生成した`invoice.paid`は、テスト用価格がAdFlowの価格カタログにないため`failed`となった。

残課題:

- 本番ModeのPrice、Webhook、Portalは未設定・未確認。
- Production DBに実課金由来のWebhook成功履歴はない。
- 有効なAdFlow Priceを使うCheckout完了からplan反映までのTest Mode E2Eを未実施。

### 5. コアループ

判定: **部分実装**

確認方法:

- 実DB: Demand runはcompleted、Evidence 44件、Demand Score、Pair紐付きを再取得。
- 実Production: REALなImprovementからCodex Task、REAL_EXECUTION、PR作成まで成功。
- ローカル: Frontend / Backendを起動し、主要routeとhealthはHTTP 200。

未成立点:

- 最新Demand runのユーザーと、GitHub App / Production PR証跡のユーザーは異なる。
- Production PR証跡のImprovementにはPair紐付けがない。
- よって`Demand Discovery -> Pair Analysis -> Improvement -> Approval -> Codex -> PR`を、同一ユーザー・同一データ系列で一気通貫に通した証跡はない。
- ローカルで同じフローを再実行するには、GitHub App installation所有ユーザーの認証セッション、十分なCredit、対象Pairが必要で、今回の棚卸しでは新規実行していない。

### 6. LP・公開フロント

判定: **部分実装**

確認方法:

- Playwright ChromiumでProduction LPを表示。
- HTTP 200、titleとHero H1取得成功、console error 0。
- ローカルLPもHTTP 200、console error 0。
- Production問い合わせAPIへ実送信しHTTP 201。
- Supabaseから同じInquiry IDを`status=new`で再取得。

Production表示:

```text
title=AdFlow AI | Ad Optimization Workspace
h1=改善が止まる理由は広告ではありません。 ワークフローです。
```

残課題:

- i18n auditは117件で失敗。アプリ全体を完全な日英対応としてはリリース不可。
- 問い合わせの送信中表示`Sending...`を含め、公開画面にもhard-coded stringが残る。

### 7. X Ads

判定: **未確認（実アカウント受入試験なし）**

確認方法:

- コード確認: OAuth、Account同期、指標保存、承認、公開、Outcome / Experiment接続が存在。
- Fly secret名: Consumer key / secret、token encryption key、callback URLは存在。
- 実DB: connectionは1件あるが`invalid`で、`Audit fixture; not an external X connection.`と明記。
- 実DB: Account 0件、Publish Event 0件。

`published`状態のfixture requestとmetric snapshot 2件は存在するが、外部Xへの実公開証跡ではない。実アカウントでの受入試験は未確認。

## Production環境状態

### Backend

```text
GET https://adflow-ai-api.fly.dev/health
HTTP/1.1 200 OK
{"status":"ok"}
```

```text
GET https://adflow-ai-api.fly.dev/ready
HTTP/1.1 200 OK
{"status":"ready","environment":"production","storage_provider":"supabase","ai_provider":"openai"}
```

Fly Machineはstarted、health checkは1/1 passing。確認時のMachine versionは22。

### Frontend

```text
https://adflow-ai-wine.vercel.app
HTTP 200
Content-Type: text/html; charset=utf-8
```

Chromium実表示でもHTTP 200、Hero表示成功、console error 0。直近Vercel Production deploymentはReady。

### ローカル

```text
http://127.0.0.1:8000/health HTTP 200
http://127.0.0.1:8000/ready HTTP 200
http://127.0.0.1:3000/ HTTP 200
http://127.0.0.1:3000/settings HTTP 200
http://127.0.0.1:3000/demand-discovery HTTP 200
http://127.0.0.1:3000/improvements HTTP 200
http://127.0.0.1:3000/codex-tasks HTTP 200
http://127.0.0.1:3000/prs HTTP 200
```

認証後routeのHTTP 200はNext.js shellの起動確認であり、各画面操作の完了証明ではない。

### Fly.io secrets変数名

値は取得・記載していない。

```text
ADFLOW_AI_PROVIDER
ADFLOW_GITHUB_PROVIDER
ADFLOW_STORAGE_PROVIDER
ADFLOW_SUPABASE_TABLE
ADFLOW_AUTO_TOP_UP_CREDIT_AMOUNT
ADFLOW_AUTO_TOP_UP_CREDIT_EMAILS
ADFLOW_CORS_ORIGINS
ADFLOW_FRONTEND_APP_URL
ADFLOW_ENV
ADFLOW_EXPERIMENT_SYNC_ENABLED
CODEX_API_KEY
DEMAND_REAL_SOURCES_ENABLED
DEMAND_SYNTHETIC_FALLBACK
EVIDENCE_COLLECTION_PROVIDER
EVIDENCE_EMBEDDING_PROVIDER
EVIDENCE_MAX_ITEMS_DEEP
EVIDENCE_MAX_ITEMS_DEFAULT
GEMINI_API_KEY
GEMINI_MODEL
GITHUB_APP_CALLBACK_URL
GITHUB_APP_CLIENT_ID
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
GITHUB_REPOSITORY
GITHUB_TOKEN
GITHUB_WEBHOOK_SECRET
GROK_API_KEY
GROK_MODEL
MONITORING_ENABLE_AUTO_RUN
OPENAI_API_KEY
OPENAI_DEEP_MODEL
OPENAI_EMBEDDING_MODEL
OPENAI_FAST_MODEL
OPENAI_MODEL
PRODUCT_REVIEW_ENABLE_WEB_STUB
PRODUCT_REVIEW_MIN_EVIDENCE_FOR_HIGH_CONFIDENCE
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
X_ADS_API_BASE_URL
X_ADS_CONSUMER_KEY
X_ADS_CONSUMER_SECRET
X_ADS_OAUTH_CALLBACK_URL
X_ADS_TOKEN_ENCRYPTION_KEY
```

Production Fly secretsにはGoogle Custom Search、Firecrawl、Reddit、X Demand Bearer Tokenの変数名が見当たらない。ローカルにはGoogle Custom Search、Firecrawl、X Bearer Tokenが設定され、Redditは未設定。過去のDemand実DB証跡は存在するが、現在のFly Productionで同じ実ソース構成を再現できるとは確認できない。

## リリースブロッカーまとめ

1. **Gitのリリース状態が未整理**  
   `main`がoriginより4コミット先行し、必要な実装6ファイルが未追跡、18ファイルが未コミット。現在のProductionとGitHub上の再現可能なソースが一致している保証がない。

2. **同一系列のフルコアループE2Eがない**  
   DemandからPRまでの各区間は動作証跡があるが、同一ユーザー・同一Pair・同一Improvementで全工程を通していない。

3. **StripeはTest Modeのみ**  
   有料リリースにはLive ModeのProduct / Price / Webhook / Portal設定と少額実決済検証が必要。

4. **アプリ全体i18n監査が117件で失敗**  
   完全な日英対応を販売条件に含める場合はBlocker。LP主要部のみ日英対応と明示するなら提供範囲を修正する必要がある。

5. **X Ads実アカウント受入試験がない**  
   X Adsをリリース機能として販売する場合はBlocker。beta / unavailable扱いにするなら表示上の明示が必要。

6. **Production Demand connector secrets不足**  
   Fly上でGoogle Custom Search、Firecrawl、Reddit、X Demand APIの設定名を確認できない。実市場データ機能を本番提供するなら、connectorごとのProduction再実行が必要。

7. **GitHub Webhook secretのローテーション未実施**  
   secretを扱った経緯があるため、本番公開前のローテーションを推奨する。

## 次のアクション候補

1. GitHub App / REAL_EXECUTION変更をレビューし、未追跡ファイルを含めて意図的なコミットに整理してoriginへpushする。
2. 同一テストユーザーで`Demand -> Pair -> REAL Improvement -> Approval -> Codex -> PR`を1回通し、ID系列を一本のE2E証跡として保存する。
3. Stripe Test ModeでAdFlowの実Priceを使うCheckout / Webhook / plan反映を通した後、Live Modeを設定して少額決済・返金を確認する。
4. Production Demand connectorを設定し、Fly上からEvidence付きDemand runを再実行する。Redditは審査完了まで`unavailable`を明示する。
5. X Ads実アカウント受入試験を行うか、初回リリース対象外としてUIとLPから明示的に外す。
6. i18n 117件を解消するか、「LP主要部のみ日英、アプリ本体は日本語優先」など提供範囲を明文化する。
7. GitHub Webhook secretをローテーションし、不要なLegacy GitHub secretsをFlyから削除する。
8. `docs/github-app-real-execution-implementation.md`の文字化けを修正する。
