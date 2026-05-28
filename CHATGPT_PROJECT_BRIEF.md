# AdFlow AI 短縮ブリーフ

`AdFlow AI` は、広告とLPをセットで登録し、編集履歴・分析結果・AI別レビューを蓄積しながら広告改善ループを管理する「AI広告運用OS」です。単なるAI広告生成ではなく、複数AIを専門部署のように分担させる思想です。

## コア思想

- 広告とLPは必ずペアで評価する
- create/update/deleteの編集履歴を保存し、AI入力に含める
- 提案AIとレビューAIを分離する
- Router AIは「誰に仕事を振るか」を決める
- Codexは戦略ではなく実装/Diff担当
- 将来的にAI別成果比較、Router学習、ABテスト、自動PRへ拡張する

## AI役割

- Grok: X/Twitter広告コピー、CTR寄り
- Gemini: Google検索意図、SEO、検索広告
- ChatGPT: LP改善、構造分析、履歴分析、リスクレビュー
- Codex: React/Tailwind修正、Diff生成、実装

Grok/GeminiはProvider入口あり。env未設定または失敗時はmock fallback。AI OrchestrationはルールベースRouterとログ基盤が中心。

## 技術

- Frontend: Next.js 15, React 19, TypeScript, Tailwind, React Query, Zustand, Zod, React Hook Form, Supabase Browser Client, Sonner, Lucide
- Backend: Python, FastAPI, Pydantic, OpenAI structured output, Supabase REST, GitHub REST, requests

## 主な画面

- `/login`: Googleログイン
- `/dashboard`: 既存KPIダッシュボード
- `/projects`: プロジェクト管理
- `/ads`, `/ads/new`, `/ads/[adId]/edit`: X広告CRUD
- `/lps`, `/lps/new`, `/lps/[lpId]/edit`: LP CRUD
- `/pairs`, `/pairs/new`, `/pairs/[pairId]`, `/pairs/[pairId]/edit`: 広告LPペア管理、分析、AI OSログ
- `/history`: 編集履歴
- `/orchestration`: AI Router、Agent、AI比較スコアカード
- `/improvements`, `/prs`, `/settings`: 既存機能

## DB

登録・分析:

- `ad_projects`
- `twitter_ads`
- `landing_pages`
- `ad_lp_pairs`
- `change_history`
- `analysis_runs`
- `landing_page_versions`

AI Orchestration:

- `ai_agents`
- `ai_orchestration_runs`
- `ai_agent_results`
- `ai_agent_scorecards`
- `codex_task_prompts`

全テーブルRLS有効。`auth.uid() = user_id` のデータだけ操作可能。

Migration:

- `supabase/migrations/202605280001_registered_adflow_entities.sql`
- `supabase/migrations/202605280002_ai_orchestration_os.sql`
- `supabase/migrations/202605280003_decisions_lp_versions_codex_tasks.sql`

## API

既存:

- `GET /health`
- `POST /workflow/run`

登録済みペア分析:

- `POST /analysis/pairs/{pair_id}/run`
- `GET /analysis/pairs/{pair_id}/runs`
- `GET /analysis/pairs/{pair_id}/latest`

AI Orchestration:

- `GET /orchestration/agents`
- `GET /orchestration/runs`
- `GET /orchestration/runs/{run_id}/results`
- `GET /orchestration/scorecards`
- `POST /orchestration/results/{result_id}/decision`
- `POST /orchestration/results/{result_id}/codex-task`

`/analysis/*` と `/orchestration/*` はSupabase Bearer token必須。

## 主要フロー

Googleログイン → 広告登録 → LP登録/version保存 → ペア化 → 編集履歴保存 → ペア分析 → message_match算出 → AI RouterがAgentへ振り分け → Side-by-side比較 → Accept/Reject/apply-ready保存 → scorecard更新 → apply-readyからCodex task prompt生成。

## 重要ファイル

```text
backend/api/main.py
backend/services/analysis/registered_pair_analysis_service.py
backend/services/orchestration/ai_orchestrator.py
backend/services/ai/provider_registry.py
backend/services/ai/providers/
backend/services/history/change_history_service.py
backend/services/supabase/supabase_repository.py
backend/services/github/change_plan_to_pr_service.py
backend/services/github/github_branch_service.py
backend/services/github/github_commit_service.py
backend/services/ai/feature_extractor.py

frontend/app/orchestration/page.tsx
frontend/app/pairs/[pairId]/page.tsx
frontend/lib/supabase/adflow-repository.ts
frontend/lib/types/adflow.ts
frontend/hooks/use-orchestration.ts
frontend/hooks/use-analysis-runs.ts
```

## 環境変数

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

ADFLOW_AI_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=
GROK_API_KEY=
GROK_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=

ADFLOW_GITHUB_PROVIDER=memory
GITHUB_REPOSITORY=
GITHUB_TOKEN=

ADFLOW_STORAGE_PROVIDER=memory
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ADFLOW_SUPABASE_TABLE=adflow_runs
```

## 起動

```bash
cd frontend
npm install
npm run dev -- --port 3001
```

```bash
python -m backend.api.main
```

## 実装済み

Googleログイン、認証ガード、ユーザー別データ分離、X広告CRUD、LP CRUD、LP versioning、広告LPペアCRUD、編集履歴保存、ペア分析、Side-by-side AI比較、Accept/Reject/apply-ready、履歴込みAI改善提案、AI Router、Grok/Gemini Provider入口、mock fallback、AI Agentログ、AI別スコアカード、Codex task prompt生成、AI OS画面、既存 `/workflow/run` 互換、OpenAI structured output、メモリ/GitHub PR切り替え。

## 未実装

実X Ads API、実Google Ads API、LPクロール、AB test tracking、実成果ベースRouter学習、AI差分の実ファイル適用、GitHubブランチ/コミット作成、Settings永続化、バックエンド依存関係ファイル、自動テスト。

## 注意

- `backend/services/ai/feature_extractor.py` に文字化け由来の日本語アクションワードが残っている
- `frontend/node_modules` と `.next` は解析対象外
- バックエンドに `requirements.txt` / `pyproject.toml` はまだない
