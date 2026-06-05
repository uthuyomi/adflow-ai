# `/orchestration`

## 目的

AI Review Center。AI提案、router runs、scorecards、recent proposalsを確認し、人間レビュー前提の改善ループを監査する。

## 現在UIに表示される主な内容

- Page header
  - `AI Review Center`
  - `Human-reviewed AI recommendations. Not autonomous execution.`
- Metrics
  - Enabled agents
  - Router runs
  - Scorecards
  - Review layer: Separated
- Notice
  - provider fallbackは開発支援用で、実装はhuman reviewとapply-ready判断で制御される旨
- Tabs
  - Specialized AI
  - Router Runs
  - AI Comparison
- Specialized AI
  - agent display name
  - provider badge
  - role
  - strengths
  - default tasks
- Router Runs
  - objective
  - route reason
  - router version
  - route plan
- AI Comparison
  - agent key
  - metric
  - provider/platform
  - average score
  - progress bar
  - samples / accepted / rejected / apply-ready
  - confidence
  - router score
- Improvement Loop Position
  - Register
  - Analyze
  - Route
  - Review
  - Diff
  - Measure
- Recent AI Proposals
  - agent key
  - decision status
  - summary

## 主なユーザー操作

- タブ切り替え
- AI結果確認
- Sidebar navigation

## Empty State

```text
No AI agents
No router runs
No AI comparison data
```

## スクリーンショット

未確認。
