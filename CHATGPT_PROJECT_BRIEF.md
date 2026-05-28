# AdFlow AI プロジェクト説明書

このドキュメントは、ChatGPTにこのプロジェクトの内容を説明するための日本語ブリーフです。  
`AdFlow AI` は、広告キャンペーンとランディングページのデータを収集し、AIで改善案を作成し、危険な変更をレビューしたうえで、GitHub Pull Request作成までつなげる「広告運用改善レビュー支援ツール」です。

## 一言でいうと

広告のパフォーマンス低下やLPとの訴求ズレを検知し、広告文・LP文言の改善案と差分案をAIに作らせ、人間が確認してからPR化するための管理ダッシュボードです。

## 想定ユーザー

- 広告運用担当者
- LP改善担当者
- グロース担当者
- マーケターとエンジニアの間で改善PRをレビューするチーム
- AI提案をそのまま反映せず、レビューゲートを挟みたい組織

## 主要な目的

このツールの目的は、広告改善の流れを次のように標準化することです。

1. 広告データを集める
2. LP構造・ユーザー行動・ページ速度を集める
3. CTR、CVR、直帰率、CTA強度、広告とLPの類似度などを特徴量化する
4. AIが広告改善案とLP改善案を生成する
5. AIが変更差分の「計画」を作る
6. AIレビューで誇張表現、ブランドリスク、UIリスク、危険な変更を確認する
7. 承認されたものだけGitHub PRとして作成する

## 技術スタック

### フロントエンド

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- TanStack React Query
- Zustand
- Zod
- React Hook Form
- Recharts
- Sonner
- Lucide React

### バックエンド

- Python
- FastAPI
- Pydantic
- OpenAI Responses API structured output
- GitHub REST API
- Supabase REST API
- requests

## ディレクトリ構成

```text
adflow-ai/
  backend/
    api/
      main.py
    core/
      config.py
    services/
      ads/
      ai/
      analytics/
      github/
      lp/
  frontend/
    app/
    components/
    hooks/
    lib/
    package.json
```

## フロントエンドの概要

フロントエンドは、広告改善のレビュー業務を行うダッシュボードです。ルートページはダッシュボードへつながり、左サイドバーで各画面を移動します。

### 画面一覧

| パス | 役割 |
| --- | --- |
| `/dashboard` | 広告KPI、リスク、改善案、PR状況を俯瞰する |
| `/campaigns` | キャンペーン一覧、検索、CTR/CPC/CVR/Spendを確認する |
| `/campaigns/[campaignId]` | 個別キャンペーンの広告クリエイティブ、推移、AI提案、LP整合性を見る |
| `/lp` | LPのヒーロー、CTA、FAQ、行動指標、ページ速度を見る |
| `/improvements` | AI改善案の一覧を見る |
| `/improvements/[improvementId]` | 差分案、レビュー警告、承認/却下/PR作成操作を行う |
| `/prs` | 作成済みPRの一覧を見る |
| `/settings` | API URL、GitHub、Supabase、X Ads状態、分析スケジュールをローカル検証する |

### フロントエンドのデータ取得

フロントエンドは `frontend/lib/api/client.ts` の `runWorkflow()` からバックエンドの `/workflow/run` をPOSTします。  
開発環境でバックエンド接続に失敗した場合は、`frontend/lib/mock-data.ts` の `fallbackWorkflow` を使って画面表示を継続します。

APIベースURLは次で決まります。

```text
NEXT_PUBLIC_API_BASE_URL
未設定時: http://127.0.0.1:8000
```

### 状態管理

- サーバーデータ: TanStack React Query
- UI状態: Zustand
- フォーム検証: Zod + React Hook Form

Zustandでは、選択中プロジェクト、選択中キャンペーン、選択中改善案、レビュー用ダイアログ状態、モバイルサイドバーの開閉を管理しています。

## バックエンドの概要

バックエンドはFastAPIアプリです。中心は `backend/api/main.py` の `/workflow/run` です。

### API

| メソッド | パス | 役割 |
| --- | --- | --- |
| GET | `/health` | ヘルスチェック |
| POST | `/workflow/run` | 広告/LP収集からAI改善、レビュー、保存、PR作成まで実行 |

### `/workflow/run` の処理フロー

`AdFlowWorkflowService.run()` が次の順で処理します。

1. `AdCollectorService` が広告データを収集、Pydanticで検証
2. `LPCollector` がLPデータを収集、Pydanticで検証
3. `CollectionStorage` が生データを保存
4. `FeatureExtractor` がAI入力用特徴量を作成
5. `AdImprovementService` が広告改善案を生成
6. `LPImprovementService` がLP改善案を生成
7. `DiffService` が変更差分計画を生成
8. `ReviewService` が危険パスやリスクを確認
9. レビューで `approved_for_pr` が true の場合のみ `PRService` がPRを作成

## 扱うデータ

### 広告データ

`backend/services/ads/ad_collector_service.py` で定義されています。

- Campaign: キャンペーンID、名前、予算、期間、ステータス
- AdGroup: ターゲティング、興味関心、年齢、性別、地域、デバイス
- AdCreative: 見出し、本文、CTA、画像、動画
- Performance: impressions、clicks、ctr、cpc、cvr、spend、conversions、reach、frequency
- TimeSnapshot: timestamp、hour、weekday

### LPデータ

`backend/services/lp/lp_collector.py` で定義されています。

- LPStructure: hero_title、hero_subtitle、CTA数、ボタン、FAQ
- LPBehavior: bounce_rate、session_duration、scroll_depth
- LPPerformance: page_speed、FCP、LCP

### AI特徴量

`backend/services/ai/feature_extractor.py` が以下を計算します。

- `ctr_trend`: 最初と最後のCTRから算出した変化率
- `bounce_rate`: LP直帰率
- `hero_similarity`: 広告文とLPヒーロー文言のトークン類似度
- `cta_strength`: CTA数、アクションワード、スクロール深度から算出
- `device`: 最頻出デバイス
- `weekday`: 最頻出曜日

## AI処理

AIクライアントは2種類あります。

### モックAI

`DeterministicLLMClient` は固定レスポンスを返します。  
環境変数を設定しない場合はこのモードで動くため、OpenAI APIキーなしでも開発できます。

### OpenAI連携

`OpenAIJSONClient` はOpenAI Responses APIのstructured outputを使い、Pydanticモデルに合うJSONだけを受け取る設計です。  
利用するには環境変数が必要です。

```text
ADFLOW_AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

## PR作成

PR作成クライアントは2種類あります。

### メモリ内PR

`InMemoryPullRequestClient` は実際のGitHubには送信せず、ダミーのPR URLを返します。

### GitHub PR

`GitHubPRClient` はGitHub REST APIでPull Requestを作成します。  
利用するには環境変数が必要です。

```text
ADFLOW_GITHUB_PROVIDER=github
GITHUB_REPOSITORY=owner/repo
GITHUB_TOKEN=...
```

注意点として、この実装はPRを作るだけで、差分のコミット作成やブランチへのpushは行っていません。既存の `head_branch` が存在し、必要な変更が入っている前提のPR作成APIになっています。

## データ保存

保存先は2種類あります。

### メモリ保存

デフォルトでは `InMemoryCollectionStorage` が使われます。プロセス内だけの保存です。

### Supabase保存

`SupabaseCollectionStorage` はSupabase REST APIへ広告/LPの生データを保存します。

```text
ADFLOW_STORAGE_PROVIDER=supabase
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADFLOW_SUPABASE_TABLE=adflow_runs
```

`SUPABASE_SERVICE_ROLE_KEY` がない場合は `SUPABASE_ANON_KEY` を使います。

## 安全設計

このプロジェクトは「AIに直接変更を反映させない」方針です。

- 差分は実ファイルへ適用せず、`DiffResult` という変更計画として生成する
- `allowed_paths` 以外のファイル差分は拒否する
- `.env`、`secrets`、`credentials`、`node_modules`、`.git` を含むパスは危険として拒否する
- レビュー結果が `approved_for_pr` の場合だけPR作成へ進む
- フロントエンドにも「PR creation stays manual. No merge or push controls are exposed.」という説明がある
- マージやpush操作は画面に存在しない

## 現在の実装状態

実装済みです。

- Next.jsの管理画面
- FastAPIのワークフローAPI
- Pydanticによる入力/出力検証
- 広告/LPのモックデータ入力
- AI改善案生成の抽象化
- OpenAI structured output対応
- 差分計画生成
- レビュー判定
- メモリ/Supabase保存の切り替え
- メモリ/GitHub PR作成の切り替え
- フロントエンドのフォールバックモック

一方で、以下は未完成または簡易実装です。

- X Adsなど実広告媒体からの実データ取得は未実装
- LPの実URLクロールやDOM解析は未実装
- AIが作った差分を実ファイルへ適用する機能はない
- GitHubブランチ作成やコミット作成はない
- Settings画面はローカル検証のみで、設定値を永続化しない
- Approve/Reject操作はフロント側のセッション的な動作で、バックエンドに状態保存しない
- PR一覧はワークフロー結果から生成した表示用データ
- バックエンドの依存関係ファイル、起動スクリプト、テストは見当たらない

## 開発時の起動方法

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

現在の環境ではNext.jsが `http://localhost:3001` で起動しています。`3000` が使用中の場合は自動で別ポートになります。

### バックエンド

バックエンドは `backend/api/main.py` に `uvicorn.run()` があるため、依存関係を入れたPython環境で次のように起動する想定です。

```bash
python -m backend.api.main
```

または次の形でも起動できます。

```bash
uvicorn backend.api.main:app --host 127.0.0.1 --port 8000
```

## ChatGPTに依頼するときの要約文

このプロジェクトは、広告キャンペーンとLPのデータをもとに、AIが広告文・LP改善案・変更差分計画を生成し、安全レビューを通過したものだけGitHub PR作成へ進めるレビュー重視の広告改善支援ツールです。フロントエンドはNext.jsの管理ダッシュボードで、キャンペーン、LP分析、改善案、差分レビュー、PR一覧、設定画面を持ちます。バックエンドはFastAPIで、広告/LPデータ収集、特徴量抽出、AI改善案生成、差分計画生成、リスクレビュー、保存、PR作成を一括実行する `/workflow/run` を提供します。OpenAI、GitHub、Supabaseは環境変数で本番連携に切り替え可能ですが、デフォルトではモックAI、メモリ保存、メモリPRでローカル開発できます。現状はプロトタイプ寄りで、実広告媒体連携、LPクロール、差分適用、ブランチ/コミット作成、設定永続化は未実装です。

## 解析時に気づいた注意点

- `backend/services/ai/feature_extractor.py` の日本語アクションワードらしき文字列とトークン正規表現に文字化けが見られます。
- `frontend/components/layout/Sidebar.tsx` のモバイル閉じるボタンの表示文字にも文字化けらしき箇所があります。
- ルートに `.git` は見当たらず、現時点ではGit管理外の作業ディレクトリに見えます。
- `frontend/node_modules` と `.next` は存在しますが、生成物なので解析対象からは除外すべきです。
- バックエンドには `requirements.txt` や `pyproject.toml` がないため、別環境で再現するには依存関係の整理が必要です。
