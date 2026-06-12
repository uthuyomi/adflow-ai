# Phase1 Audit Report

## 2026-06-12 実環境再監査結果

Supabase migration 適用後、接続中のSupabase実DBとStripe test modeを使って再監査しました。

### Supabase実DB保存

| 確認項目 | 結果 |
| --- | --- |
| `contact_inquiries` 保存・取得・削除 | PASS |
| `stripe_webhook_events` 保存・取得・削除 | PASS |
| `ai_agent_results` のAI出所列 | PASS |
| `analysis_runs` のAI出所列 | PASS |
| 需要関連6テーブルの `data_source_type` 列 | PASS |
| `refund_purchased_credits` の購入クレジット返金と台帳保存 | PASS |

### Stripe test mode実連携

設定済みクレジット価格が `livemode=false` であることを確認し、実Stripe test modeオブジェクト、署名済みWebhook、Supabase実DBを使って検証しました。

| 確認項目 | 結果 |
| --- | --- |
| Checkout成功Webhookによる1,000クレジット付与 | PASS |
| 同一Webhook再送時の冪等性 | PASS。残高は二重加算されない |
| `invoice.payment_failed` による `past_due` 保存 | PASS |
| 実PaymentIntentの返金と400クレジット返却台帳 | PASS |
| `customer.subscription.deleted` によるFreeプラン移行 | PASS |
| キャンセル時の月次Freeクレジット500へのリセット | PASS |
| Webhookイベント台帳への完了状態保存 | PASS |
| 未完了Checkout SessionでSuccess画面を開いた場合 | PASS。成功表示せず、未検証表示になる |

再監査中、支払い失敗時にStripe上の現在状態を再取得すると `past_due` が保存されない可能性と、Checkout Sessionを持たない返金でクレジット返金先を特定できない問題を発見しました。`frontend/app/api/stripe/webhook/route.ts` を修正し、上記実連携試験で修正後のDB反映を確認しました。

### 再監査後のPhase2判定

**YES**

Phase1の完了条件であるSupabase実DB保存、Stripe test modeの成功・失敗・返金・キャンセル、Webhook冪等性、未完了Checkoutの成功表示防止を確認できました。実AIプロバイダーごとの外部接続試験は引き続き運用確認事項ですが、Phase1の信頼性実装を妨げる未接続箇所ではありません。

実施日: 2026-06-12

対象:

- AIモック結果の識別
- 合成需要データの識別
- Stripe課金整合性
- 問い合わせ送信

判定方針:

- UI表示だけでなく、生成経路、API、DB保存、学習利用、Webhook、実保存先まで追跡した。
- 既存データの出所を推測でREAL扱いしない。
- 外部環境で確認できなかった項目は完了扱いにしない。

## 現状問題一覧

| 領域 | 発見した問題 | 影響 | 修正内容 |
| --- | --- | --- | --- |
| AI | OpenAI、Grok、Geminiの未設定・失敗時にMock Providerへ切り替わるが、実プロバイダー名のまま保存されていた | ユーザーが実AI結果と誤認し、Scorecardと学習へ混入する | `provider_type`、`failure_reason`、`source_provider` を生成・保存・表示へ追加 |
| AI | Provider Registryなしのfallbackと決定論的LLMの出所表示がなかった | ペア分析本体も実AI結果に見える | fallbackと決定論的LLMを明示的にMOCK扱いへ変更 |
| AI | MOCK結果がScorecard、Codexタスク、Outcome、Outcome Learningの入力になり得た | モック結果がルーティングと学習を汚染する | MOCKのScorecard更新・再計算・Codex・Outcome作成を禁止し、Outcome Learningから除外 |
| AI | 既存結果の出所を判定できなかった | 既存Scorecardを信頼できない | 既存結果を安全側でMOCK扱いにし、既存Scorecardと該当学習リンクを削除するmigrationを追加 |
| 需要 | シグナルはconnectorで判別できたが、DBに統一された出所列がなかった | 実測・合成の横断判定が困難 | 対象テーブルへ `data_source_type` を追加 |
| 需要 | 検索需要、市場規模、埋め込み、成長率、クラスタ、監視値が合成・算式由来でも統一表示されなかった | 参考推定値を実測値と誤認する | DB保存時にSYNTHETICを保持し、主要UIへ「参考推定値」を表示 |
| 需要 | Demand Discoveryの実ソース・合成ソース表示はあったが、派生クラスタの推定表示が弱かった | 派生値の性質が分かりにくい | ソース種別とクラスタへ「実測値」「参考推定値」を明示 |
| Stripe | `/billing/success` を直接開くだけで成功表示された | 未決済でも成功したように見える | Checkout Sessionを取得し、`status=complete` の場合だけ成功表示 |
| Stripe | Webhook全体の処理記録がなく、返金・支払い失敗処理がなかった | 課金状態とクレジットの不整合を追跡・補正できない | Webhookイベント台帳、重複完了判定、失敗記録、返金クレジット調整、支払い失敗時の契約同期を追加 |
| Stripe | キャンセル処理は存在したが、Webhook処理単位の監査がなかった | 再送・失敗の状態を確認できない | `stripe_webhook_events` に処理状態を保存 |
| 問い合わせ | Contactフォームに送信処理がなかった | 問い合わせが一切保存・送信されない | `/api/contact`、`contact_inquiries`、フォーム送信・成功・失敗表示を追加 |
| 問い合わせ | 公開フォームのバリデーション・スパム対策がなかった | 不正入力・大量送信のリスク | 長さ・メール検証、honeypot、最低入力時間、IPハッシュ・メール単位のDBレート制限を追加 |

## モック・合成経路監査結果

### AIモック経路

| 経路 | 修正後の扱い |
| --- | --- |
| `MockProvider`直接利用 | `provider_type=MOCK`、理由と元providerを保存 |
| OpenAI未設定 | MOCK、`OpenAI is not configured.` を保存 |
| OpenAI API失敗 | MOCK、例外種別をfailure reasonへ保存 |
| Grok未設定・API失敗 | MOCK、理由を保存 |
| Gemini未設定・API失敗 | MOCK、理由を保存 |
| Provider RegistryなしのOrchestrator fallback | MOCK、理由を保存 |
| Codex provider | Mock ProviderとしてMOCK保存 |
| 決定論的LLM | MOCK、`deterministic`をsource providerとして保存 |

### 需要データ経路

| データ | 修正後の扱い |
| --- | --- |
| Google Custom Search、Firecrawl Search、Firecrawl、X、Web Page由来シグナル | REAL |
| Synthetic Connector由来シグナル | SYNTHETIC |
| 決定論的ハッシュ埋め込み | SYNTHETIC |
| 内部算式によるクラスタ成長率・クラスタ値 | SYNTHETIC |
| Search Demand Layerの検索量・CPC・Suggest・PAA・trend | SYNTHETIC |
| Market Size Layerの市場規模・市場スコア | SYNTHETIC |
| 内部算式によるMonitoring snapshot | SYNTHETIC |

## 実装変更一覧

### DB・migration

- `supabase/migrations/202606120001_phase1_trust_and_reliability.sql`
  - AI結果・分析結果の出所列
  - 需要データの出所列
  - Stripe Webhookイベント台帳
  - 問い合わせ保存テーブル
  - 返金クレジットRPC
  - 既存の出所不明Scorecard・該当Outcome Learningリンクの除去

### バックエンド

- `backend/services/ai/providers/**`
  - REAL / MOCKメタデータを全Provider結果へ付与
- `backend/services/ai/deterministic_llm_client.py`
- `backend/services/ai/openai_json_client.py`
  - ペア分析本体の出所を明示
- `backend/services/orchestration/ai_orchestrator.py`
  - 出所保存、MOCKのScorecard除外、Codexタスク禁止
- `backend/services/analysis/registered_pair_analysis_service.py`
  - 分析結果の出所保存
- `backend/services/outcomes/improvement_outcome_service.py`
  - MOCK由来Outcome作成・学習利用を禁止
- `backend/services/demand/demand_intelligence_service.py`
  - 需要データ出所保存、MOCK由来Outcomeの学習除外
- `backend/services/demand/outcome_feedback_learning.py`
  - MOCK由来Outcome除外
- `backend/tests/test_phase1_trust.py`
  - AI・Scorecard・Outcome Learning・需要出所テスト

### フロントエンド

- `frontend/app/pairs/[pairId]/page.tsx`
- `frontend/app/orchestration/page.tsx`
- `frontend/components/x-ads/XAdsPublishDraftDialog.tsx`
  - 「実AI結果」「モック結果」「実測値」「参考推定値」を表示
- `frontend/app/demand-discovery/page.tsx`
  - 実ソース・参考推定値を明示
- `frontend/app/billing/success/page.tsx`
- `frontend/components/billing/BillingResultPage.tsx`
  - Checkout Session完了時のみ成功表示
- `frontend/app/api/stripe/webhook/route.ts`
  - Webhook監査、失敗、返金、キャンセル処理
- `frontend/lib/billing/stripe-policy.ts`
- `frontend/lib/billing/stripe-policy.test.ts`
  - Stripe判定ロジックと成功・失敗・返金・キャンセルテスト
- `frontend/app/api/contact/route.ts`
- `frontend/components/marketing/ContactPageClient.tsx`
- `frontend/lib/contact/validation.ts`
- `frontend/lib/contact/validation.test.ts`
  - 問い合わせ保存API、送信UI、検証、スパム対策、テスト

## 動作確認結果

### Task1 AIモック結果識別

確認結果:

- Mock Providerと全fallback経路が `provider_type=MOCK`、`failure_reason`、`source_provider` を返すことをコード追跡した。
- 実Provider成功時は `provider_type=REAL` を返す。
- Orchestratorと分析結果のDB payloadに出所情報が含まれる。
- MOCK結果はScorecard更新・再計算対象外。
- MOCK結果からCodexタスク・Learning Outcomeを作成できない。
- MOCK由来OutcomeはOutcome Learning対象外。
- ペア詳細、Orchestration、X Ads公開ドラフトでAI種別を表示する。
- バックエンドPhase1テスト成功。

### Task2 合成需要データ識別

確認結果:

- シグナル、埋め込み、クラスタ、検索需要、市場規模、監視スナップショットの保存payloadに `data_source_type` を追加した。
- 実コネクタだけをREALとし、不明なコネクタは安全側でSYNTHETIC扱いにする。
- 検索需要、市場規模、クラスタ派生値は「参考推定値」と表示する。
- EvidenceシグナルはREAL / SYNTHETICを個別表示する。
- Demand Discoveryは実ソースの場合のみ「実測値」と表示し、それ以外を「参考推定値」と表示する。

### Task3 Stripe課金整合性

確認結果:

- Session IDなしの `/billing/success` を実サーバーで開き、HTTP 200で「Payment could not be verified」と表示されることを確認した。
- Success判定は `Checkout Session.status === complete` のみ。
- Webhook完了イベントは再処理しない。
- 処理失敗はfailedとして保存し、HTTP 500でStripe再送対象にする。
- `invoice.payment_failed`、`charge.refunded`、`customer.subscription.deleted` を処理する。
- 返金クレジットRPCはStripe event IDで冪等化する。
- 成功、失敗、返金、キャンセルのポリシーテストが成功した。

### Task4 問い合わせフォーム

確認結果:

- フォームから `/api/contact` を呼ぶ処理を実装した。
- APIは `contact_inquiries` へ保存する。
- 入力検証、honeypot、最低入力時間、15分あたり3件のDBレート制限を実装した。
- UIに送信中、成功、失敗表示を実装した。
- 実サーバーで無効入力をPOSTし、HTTP 400と検証エラーを確認した。
- 接続先Supabaseへの一時レコード保存・削除試験は、migration未適用のため `PGRST205: contact_inquiries table not found` で失敗した。

### 実行コマンド結果

| 確認 | 結果 |
| --- | --- |
| `py -m unittest discover -s backend/tests -v` | 39件成功 |
| `npm run test:phase1` | 6件成功 |
| `npm run lint` | 成功 |
| `npm run build` | 成功 |
| `git diff --check` | 成功 |
| `/billing/success` Session IDなしスモーク | 成功。未検証表示 |
| `/api/contact` 無効入力スモーク | 成功。HTTP 400 |
| Supabase問い合わせ実保存・削除 | 失敗。migration未適用 |

## 未解決事項

1. **新規Supabase migrationが接続先DBへ未適用**
   - `contact_inquiries` が存在せず、問い合わせ実保存確認は失敗した。
   - AI・需要出所列、Webhookイベント台帳、返金RPCも接続先DBでは未確認。
   - ローカル環境にSupabase CLIとpsqlがなく、本タスク内でmigrationを適用できなかった。

2. **Stripe実イベントによる外部結合試験は未実施**
   - コード、型、ビルド、ポリシーテストは成功した。
   - Stripe test modeでの実Checkout、payment failure、refund、subscription cancellation Webhook送信は確認できていない。

3. **実AI Provider成功・失敗の外部結合試験は未実施**
   - 全経路のコード追跡とMockテストは完了した。
   - OpenAI、Grok、Geminiの実認証情報を使った成功・失敗試験は未実施。

## Phase2へ進めるか判定

**NO（初回監査時。Supabase migration適用前の判定。上記の実環境再監査によりYESへ更新）**

理由:

- Phase1のコード実装、単体テスト、型チェック、ビルド、ローカルスモークは完了した。
- しかし、信頼性担保の中核となるmigrationが接続先Supabaseへ未適用で、問い合わせの実保存、AI・需要出所の実DB保存、Stripe Webhook監査・返金RPCを実環境で確認できていない。
- migration適用後に、問い合わせ保存、実AI/Mock保存、REAL/SYNTHETIC保存、Stripe test modeの成功・失敗・返金・キャンセルを再確認するまでPhase1完了とは判定しない。
