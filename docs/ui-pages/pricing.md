# `/pricing`

## 目的

料金、クレジット残高、月額プラン、追加クレジット、JPY/USD切り替え、Stripe Checkout導線を表示する。

## 現在UIに表示される主な内容

- Hero
  - Eyebrow: `Credit billing`
  - Headline: `Simple credit-based pricing.`
  - Subtitle: `Only pay for the analysis you actually use.`
- Header actions
  - Currency toggle: `Japan / JPY`, `Global / USD`
  - `Manage billing`
- Credit balance card
  - Credit balance
  - Total
  - Monthly
  - Purchased
  - Lifetime used
- How credits are used
  - Demand Scan: 50 credits
  - Competitor Analysis: 100 credits
  - Pair Analysis: 150 credits
  - Full Workflow: 300 credits
- ROI example
  - Starter supports about 60 demand scans or 20 full workflows.
- Pricing cards
  - Free
  - Starter
  - Pro
  - Business
  - Recommended badge
  - `/ month`
  - `Choose Plan` / `Start free`
- Plan comparison table
  - Demand Scan
  - Competitor Analysis
  - Pair Analysis
  - Outcome Learning
  - Exports
  - Priority Processing
  - Team Usage
- Additional Credits
  - 1,000 credits
  - 5,000 credits
  - 20,000 credits
  - 50,000 credits
  - `Buy Credits`
- FAQ
  - What are credits?
  - Do monthly credits roll over?
  - Can I pay in yen or dollars?
  - What happens when I cancel?
  - When are purchased credits reflected?
  - Can teams share credits?
  - Can I upgrade later?
  - Do purchased credits expire?
- Final CTA

## 主なユーザー操作

- 通貨切り替え
- プラン選択
- 追加クレジット購入
- Billing Portalを開く
- ログイン
- 言語切り替え

## Empty State

- billing profile未取得時は未契約/Free相当として表示される想定。
- Stripe環境変数未設定時はCheckout APIが失敗する可能性がある。

## スクリーンショット

未確認。
