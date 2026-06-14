==================================================
PRICING SECTION
==================================================

SECTION ID

pricing

==================================================
GOAL
==================================================

Reduce signup friction.

Encourage first project creation.

Do NOT aggressively sell enterprise plans.

==================================================
HEADLINE
==================================================

EN

Start Making Better Build Decisions For Free

--------------------------------------------------

JA

無料で開発判断を始める

==================================================
DESCRIPTION
==================================================

EN

Validate ideas before investing months of development time.

--------------------------------------------------

JA

何ヶ月も開発する前に
アイデアを検証する。

==================================================
LAYOUT
==================================================

Desktop

3 Columns

--------------------------------------------------

Free

Starter

Pro

==================================================
VISUAL PRIORITY
==================================================

Starter Plan

must be highlighted.

Only Starter receives accent styling.

==================================================
FREE
==================================================

EN

Free

Test your first ideas.

--------------------------------------------------

JA

無料

最初のアイデアを試す

==================================================
STARTER
==================================================

EN

Starter

Validate multiple opportunities.

--------------------------------------------------

JA

スターター

複数のアイデアを検証する

==================================================
PRO
==================================================

EN

Pro

Make build decisions part of your workflow.

--------------------------------------------------

JA

プロ

継続的に開発判断を行う

==================================================
IMPORTANT
==================================================

Use actual implemented pricing.

Do NOT invent plans.

Do NOT invent credits.

Do NOT invent features.

Current billing implementation is source of truth.

==================================================
FAQ SECTION
==================================================

SECTION ID

faq

==================================================
COMPONENT
==================================================

Use:

shadcn/ui Accordion

==================================================
HEADLINE
==================================================

EN

Frequently Asked Questions

--------------------------------------------------

JA

よくある質問

==================================================
FAQ 1
==================================================

EN

How is this different from ChatGPT?

--------------------------------------------------

Answer

ChatGPT helps brainstorm.

AdFlow-AI provides a structured workflow built around evidence, opportunities, positioning, and recommendations.

--------------------------------------------------

JA

ChatGPTとの違いは何ですか？

--------------------------------------------------

回答

ChatGPTはアイデア出しを支援します。

AdFlow-AIは証拠・市場機会・ポジショニング・推奨アクションを含む意思決定ワークフローを提供します。

==================================================
FAQ 2
==================================================

EN

Does AdFlow-AI guarantee success?

--------------------------------------------------

Answer

No.

It reduces blind guessing and helps you make more informed build decisions.

--------------------------------------------------

JA

成功を保証しますか？

--------------------------------------------------

回答

いいえ。

AdFlow-AIは推測を減らし、
より良い開発判断を支援します。

==================================================
FAQ 3
==================================================

EN

What sources are analyzed?

--------------------------------------------------

Answer

Search results

Reviews

Community discussions

Competitor pages

Use actual implemented sources.

--------------------------------------------------

JA

どのようなデータを分析しますか？

--------------------------------------------------

回答

検索結果

レビュー

コミュニティ投稿

競合ページ

実装済みソースのみ表示すること。

==================================================
FAQ 4
==================================================

EN

Who is it for?

--------------------------------------------------

Answer

Indie Hackers

Solo Founders

SaaS Builders

Small Product Teams

--------------------------------------------------

JA

誰向けですか？

--------------------------------------------------

回答

個人開発者

ソロ創業者

SaaS開発者

小規模プロダクトチーム

==================================================
FAQ 5
==================================================

EN

Can I use it after launch?

--------------------------------------------------

Answer

If implemented:

Yes.

Use it to refine positioning, monitor competitors, and improve product decisions.

--------------------------------------------------

JA

リリース後にも利用できますか？

--------------------------------------------------

回答

実装済みの場合のみ表示。

ポジショニング改善や競合監視に利用できます。

==================================================
FINAL CTA
==================================================

SECTION ID

final-cta

==================================================
LAYOUT
==================================================

Full Width

--------------------------------------------------

Large CTA Banner

--------------------------------------------------

Border Radius

24px

--------------------------------------------------

Padding

80px Desktop

48px Mobile

==================================================
HEADLINE
==================================================

EN

Build Less.
Decide Better.

--------------------------------------------------

JA

作る前に判断する。

==================================================
SUBHEADLINE
==================================================

EN

Stop guessing what the market wants.

Start with evidence before writing more code.

--------------------------------------------------

JA

市場を推測するのではなく、

証拠をもとに意思決定しよう。

==================================================
BUTTONS
==================================================

Primary

Start Free

--------------------------------------------------

Secondary

See Example Report

==================================================
I18N IMPLEMENTATION
==================================================

Required File

src/lib/i18n/lp.ts

==================================================
STRUCTURE
==================================================

export const lp = {
  en: {},
  ja: {}
}

==================================================
RULES
==================================================

No hardcoded strings.

All LP text must come from translation keys.

==================================================
LANGUAGE TOGGLE
==================================================

Desktop

Navbar Right

--------------------------------------------------

EN | 日本語

--------------------------------------------------

Mobile

Drawer Menu

==================================================
COMPONENT STRUCTURE
==================================================

Create

src/components/landing/

==================================================

HeroSection.tsx

ProblemSection.tsx

WorkflowSection.tsx

ExampleReportSection.tsx

ChatGPTComparisonSection.tsx

FeaturesSection.tsx

BuiltForSection.tsx

PricingSection.tsx

FaqSection.tsx

FinalCTASection.tsx

==================================================
PAGE STRUCTURE
==================================================

src/app/page.tsx

--------------------------------------------------

Hero

Problem

Workflow

ExampleReport

ChatGPTComparison

Features

BuiltFor

Pricing

FAQ

FinalCTA

==================================================
ANIMATION RULES
==================================================

Use Framer Motion.

--------------------------------------------------

Allowed

Fade Up

Fade In

Small Scale

--------------------------------------------------

Duration

0.4s

to

0.6s

==================================================
FORBIDDEN
==================================================

Parallax

3D Effects

Rotating Objects

Particle Effects

Heavy Motion

==================================================
MOBILE RULES
==================================================

Mobile First

==================================================

Hero becomes single column

--------------------------------------------------

Report Preview stacks vertically

--------------------------------------------------

Buttons become full width

--------------------------------------------------

Workflow becomes vertical timeline

--------------------------------------------------

Comparison becomes stacked cards

==================================================
ANTI-PATTERNS
==================================================

Reject implementation if LP resembles:

- Google Analytics
- Ahrefs
- SEMrush
- BI Dashboard
- Generic AI SaaS
- SEO Tool

==================================================
REJECT IF
==================================================

Demand Score

is larger than

Build Decision

--------------------------------------------------

Charts

are larger than

Recommended Next Action

--------------------------------------------------

Evidence Summary

is more prominent than

Build Decision

==================================================
SCREENSHOT RULE
==================================================

The Example Report screenshot is the most important asset on the LP.

More important than:

- Pricing
- Features
- FAQ

==================================================
WITHIN 3 SECONDS
==================================================

The screenshot must communicate:

1. What decision was made

2. Why the decision was made

3. What opportunity exists

4. What should be done next

==================================================
FINAL ACCEPTANCE TEST
==================================================

3 Seconds

User says:

"This helps me decide what to build."

--------------------------------------------------

5 Seconds

User says:

"This gives me recommendations."

--------------------------------------------------

10 Seconds

User says:

"The main output is a build decision."

--------------------------------------------------

30 Seconds

User understands:

- Who it is for
- What output it provides
- Why ChatGPT is different
- Why it saves time
- Why it reduces bad build decisions

==================================================
FINAL PRINCIPLE
==================================================

Users are NOT buying:

Research

Analysis

Reports

Data

==================================================

Users ARE buying:

Confidence In Their Next Build Decision

==================================================

Every section, component, visual, label, animation, and screenshot must reinforce that outcome.

END OF SPECIFICATION