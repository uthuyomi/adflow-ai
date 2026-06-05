import type { Metadata } from "next";

import { ComparisonSection, CTASection, ProblemSection } from "@/components/marketing/ConversionSections";
import { MarketingInfoPage } from "@/components/marketing/MarketingInfoPage";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "compare");

export default function ComparePage() {
  return (
    <MarketingInfoPage
      eyebrowKey="nav.compare"
      titleKey="compare.title"
      subtitleKey="compare.subtitle"
      titleMetaKey="meta.compare.title"
      descriptionMetaKey="meta.compare.description"
    >
      <ProblemSection titleKey="compare.problem.title" bodyKey="compare.problem.body" />
      <ComparisonSection
        titleKey="home.compare.title"
        bodyKey="home.compare.body"
        leftTitleKey="compare.leftTitle"
        rightTitleKey="compare.rightTitle"
        rows={[
          { leftKey: "compare.chatgpt.left", rightKey: "compare.chatgpt.right" },
          { leftKey: "compare.semrush.left", rightKey: "compare.semrush.right" },
          { leftKey: "compare.ahrefs.left", rightKey: "compare.ahrefs.right" },
          { leftKey: "compare.adflow.left", rightKey: "compare.adflow.right" },
        ]}
      />
      <CTASection titleKey="compare.cta.title" bodyKey="compare.cta.body" />
    </MarketingInfoPage>
  );
}
