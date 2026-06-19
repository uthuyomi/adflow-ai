# AdFlow-AI Documentation

最終更新: 2026年6月19日

## 現在の正本

現状を確認する場合は、次の文書を優先してください。

1. [実装・リリース Source of Truth](adflow-ai-release-source-of-truth-ja.md)
2. [現状仕様](adflow-ai-current-state.md)
3. [プロダクト概要](adflow-ai-product-overview-ja.md)
4. [残存未実装監査](unimplemented-features-audit.md)
5. [LP制作ソース・オブ・トゥルース](lp-creation-source-of-truth-ja.md)

## 現行運用ガイド

- [X Ads Release Workflow](x-ads-release-workflow.md)

## 履歴資料

`phase1-audit-report.md` から `phase7-audit-report.md` は、各Phase完了時点の監査履歴です。文中の「現状問題一覧」はそのPhase開始時点の問題であり、現在も未解決という意味ではありません。

次の文書はPhase実装前に作成された履歴・設計資料です。現状判断には使用しないでください。

- `adflow-ai-complete-spec.md`
- `adflow-current-ui-map.md`
- `adflow-ui-audit.md`
- `adflow-pricing-system-audit.md`
- `ui-pages/**`

## 現在の検証状態

- Backend: 101 tests passed
- Frontend型チェック: 成功
- Frontend production build: 成功
- Feature Gate: DB / APIでFree・Starter・Growthを実証済み
- Supabase migration: `202606190001`適用済み
- Production: Frontend / Backend稼働中
- 最新Feature Gateコード: Fly.io / Vercelへの再デプロイ待ち
- Stripe: Test Mode
- 有料一般公開判定: NOT READY
