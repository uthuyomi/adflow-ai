import type { Metadata } from "next";

import { CTASection, ProblemSection } from "@/components/marketing/ConversionSections";
import { MarketingInfoPage, InfoGrid } from "@/components/marketing/MarketingInfoPage";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "whyAdflow");

export default function WhyAdflowPage() {
  return (
    <MarketingInfoPage
      eyebrowKey="nav.whyAdflow"
      titleKey="why.title"
      subtitleKey="why.subtitle"
      titleMetaKey="meta.whyAdflow.title"
      descriptionMetaKey="meta.whyAdflow.description"
    >
      <ProblemSection titleKey="why.problem.title" bodyKey="why.problem.body" />
      <InfoGrid
        items={[
          { titleKey: "why.evidence.title", bodyKey: "why.evidence.body" },
          { titleKey: "why.review.title", bodyKey: "why.review.body" },
          { titleKey: "why.outcome.title", bodyKey: "why.outcome.body" },
        ]}
      />
      <CTASection titleKey="why.cta.title" bodyKey="why.cta.body" />
    </MarketingInfoPage>
  );
}
