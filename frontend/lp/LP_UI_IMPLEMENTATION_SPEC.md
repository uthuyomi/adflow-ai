# LP_UI_IMPLEMENTATION_SPEC.md

Version: 1.0
Status: Approved Source Of Truth

IMPORTANT

- LP_CONTENT_SPEC.md を唯一の文言ソースとする
- LP_POSITIONING_SPEC.md を唯一のポジショニングソースとする
- 独自デザイン提案禁止
- 独自レイアウト変更禁止
- AI風デザイン禁止
- 実画面中心
- SaaS業務ツールとしての信頼感を最優先する

====================================================
1. DESIGN GOAL
====================================================

ユーザーが最初の3秒で感じること

GOOD

- 本格的な業務ツール
- 信頼できそう
- SaaSとして成熟している
- 実際に使われていそう

BAD

- AIツール
- AIチャット
- AIおもちゃ
- AI画像生成サービス
- スタートアップの実験作品

====================================================
2. VISUAL REFERENCES
====================================================

デザイン方向

- Linear
- Stripe
- Vercel
- PostHog
- GitHub

参考にしない

- Midjourney LP
- AI画像生成LP
- NFTサイト
- Web3サイト
- Cryptoサイト

====================================================
3. COLOR SYSTEM
====================================================

BACKGROUND

#FFFFFF

SURFACE

#F8FAFC

PRIMARY

#2563EB

PRIMARY HOVER

#1D4ED8

TEXT PRIMARY

#111827

TEXT SECONDARY

#6B7280

BORDER

#E5E7EB

SUCCESS

#16A34A

WARNING

#CA8A04

ERROR

#DC2626

====================================================
4. TYPOGRAPHY
====================================================

FONT

Geist
Fallback: Inter

----------------------------------------------------

Hero Headline

64px
700
Line Height 1.05

----------------------------------------------------

Section Headline

48px
700

----------------------------------------------------

Section Label

14px
600
Uppercase
Letter Spacing 0.08em

----------------------------------------------------

Body

18px
400
Line Height 1.7

----------------------------------------------------

Small Text

14px

====================================================
5. LAYOUT SYSTEM
====================================================

MAX WIDTH

1440px

CONTENT WIDTH

1280px

SECTION PADDING TOP

120px

SECTION PADDING BOTTOM

120px

CONTAINER PADDING

32px

GRID

12 Column

GAP

32px

====================================================
6. HEADER
====================================================

Sticky Header

Height

72px

Background

rgba(255,255,255,0.9)

Backdrop Blur

enabled

Left

Logo

Center

Navigation

- Features
- Workflow
- Pricing
- FAQ

Right

Start Free

====================================================
7. HERO SECTION
====================================================

LAYOUT

2 Columns

Left 45%

Right 55%

----------------------------------------------------

Left

Label

Headline

Subheadline

CTA Group

Trust Text

----------------------------------------------------

Right

Large Product Screenshot

No Illustration

No AI Art

No Fake Dashboard

Must represent actual product structure

====================================================
8. SCREENSHOT RULES
====================================================

Priority

1. Real Screenshots
2. High Fidelity Product Mockups

Forbidden

- AI generated people
- AI generated landscapes
- AI generated robots
- AI generated abstract graphics

Allowed

- Product UI
- Charts
- Tables
- Dashboards
- Workflow Visuals

====================================================
9. CARD DESIGN
====================================================

Radius

16px

Border

1px solid #E5E7EB

Background

#FFFFFF

Shadow

0 1px 2px rgba(0,0,0,0.04)

Hover

Very subtle

====================================================
10. WORKFLOW DIAGRAM
====================================================

Style

Clean Enterprise SaaS

Horizontal Flow

Evidence

↓

Pair Analysis

↓

Improvements

↓

Review

↓

Execution

↓

Outcome

↓

Learning

Use Cards

Do not use illustrations

====================================================
11. COMPARISON SECTION
====================================================

Layout

Two Columns

Left

Current Workflow

Right

AdFlow AI

Use checklist style

Green indicators only

No marketing gimmicks

====================================================
12. PRICING SECTION
====================================================

Centered

Maximum Width

1100px

Cards

Equal Height

Highlight

Middle Plan Only

No animated pricing

No fake discounts

====================================================
13. FAQ SECTION
====================================================

Accordion

Single Open Item

Minimal Design

====================================================
14. BUTTONS
====================================================

Primary

Height

48px

Background

#2563EB

Text

White

Radius

12px

----------------------------------------------------

Secondary

Border

#E5E7EB

Background

White

Text

#111827

====================================================
15. ANIMATION RULES
====================================================

Allowed

- Fade In
- Slide Up
- Opacity Transition

Duration

200ms - 400ms

Forbidden

- Parallax
- Floating Objects
- Rotating Objects
- Glowing Effects
- Particle Effects

====================================================
16. MOBILE DESIGN
====================================================

Breakpoint

768px

Hero

Single Column

Screenshot Below Text

Workflow

Vertical Layout

Cards

Stacked

Buttons

Full Width

====================================================
17. FORBIDDEN DESIGN ELEMENTS
====================================================

禁止

- 紫グラデーション背景
- 宇宙背景
- サイバー演出
- ネオン
- AI球体
- AI脳
- AIロボット
- AI人物
- NFT風アート
- Web3風演出
- ガラスモーフィズム乱用
- 過剰アニメーション

====================================================
18. SEO REQUIREMENTS
====================================================

H1

1つのみ

Section Headings

H2

Subsections

H3

Proper hierarchy required

====================================================
19. PERFORMANCE REQUIREMENTS
====================================================

Target

Lighthouse

Performance >= 90

Accessibility >= 90

Best Practices >= 90

SEO >= 90

CLS < 0.1

LCP < 2.5s

====================================================
20. IMPLEMENTATION ACCEPTANCE CRITERIA
====================================================

- LP_CONTENT_SPEC.mdの文言を完全一致で使用
- LP_POSITIONING_SPEC.mdのポジショニングに従う
- AI感を排除する
- 実画面中心
- デザインは業務ツール優先
- レスポンシブ対応
- SEO維持
- i18n対応可能構造
- コンポーネント再利用可能構造

END OF DOCUMENT