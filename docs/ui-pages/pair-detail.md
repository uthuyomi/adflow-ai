# `/pairs/[pairId]`

> **履歴UI資料:** このページ文書は初期UI監査時点の記録です。現在の画面・接続状態は [`../adflow-ai-current-state.md`](../adflow-ai-current-state.md) を参照してください。


## 目的

広告LPペアの分析、Demand Intelligence、AI比較、Outcome、履歴、LP version、AIレビューを統合表示する最重要詳細画面。

## 現在UIに表示される主な内容

- Page header
  - Pair name
  - `Inspect the registered ad, LP, history, and pair-level AI recommendations.`
  - AI mode badge
  - AI settings button
  - Run analysis button
- Metrics
  - Score
  - Hero similarity
  - CTA strength
  - Bounce rate
- Active analysis route card
  - OpenAI API only
  - AI Review Center router
- Mode switch
  - Beginner Mode
  - Advanced Mode

## Beginner Modeで表示される内容

- Beginner workflow説明
- Latest Result
  - score
  - risk
- Top Recommendations
  - 上位提案
  - Run analysis button
- Visual summary
  - Strengths
  - Risks
  - Recommendations
  - Priority Actions
- Recent Outcomes
  - outcome title
  - outcome summary/status

## Advanced Modeで表示される内容

- Tabs
  - Overview
  - Analysis
  - AI Comparison
  - Demand Intelligence
  - Outcomes
  - Versions
  - History
  - AI Review Center
  - AI Recommendations
- Overview
  - X ad card
  - Landing page card
  - headline/body/CTA
- Analysis
  - analysis run cards
  - score / hero / CTA / bounce
  - risk badge
- AI Comparison
  - AI proposal comparison
  - decision buttons
  - Generate Codex Task
  - Create Outcome Draft
- Demand Intelligence
  - Run demand scan
  - Demand query input
  - Source Collection Status
  - Signal Validation
  - Solution Fit
  - Demand Monitoring
  - Search Demand
  - Market Size
  - Outcome Learning
  - Evidence / clusters
- Outcomes
  - Outcome title
  - Description
  - Create outcome
  - Edit outcome metrics
  - Before metrics JSON
  - After metrics JSON
  - Learning notes
  - Save measured outcome
- Versions
  - LP version timeline
- History
  - change history cards
- AI Recommendations
  - overall diagnosis
  - likely problem
  - ad recommendations
  - LP recommendations
  - market opportunities
  - outcome learnings

## 主なユーザー操作

- Run analysis
- Beginner / Advanced mode切り替え
- Run demand scan
- Run fit
- Rebuild outcome learning
- AI result decision
  - accepted
  - rejected
  - needs_review
  - apply_ready
- Generate Codex Task
- Create Outcome Draft
- Create outcome
- Edit metrics
- Save measured outcome

## Empty State

```text
No analysis runs
No AI proposals
No demand intelligence
No source runs
No validation data
No solution fit results yet.
No monitoring snapshots
No search demand
No market size estimates
No outcome learning
No clusters
No outcomes
No history
No orchestration log
No AI recommendation
No LP versions
```

## スクリーンショット

未確認。
