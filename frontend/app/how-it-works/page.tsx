import type { Metadata } from "next";

import { CTASection, ProblemSection, WorkflowSection } from "@/components/marketing/ConversionSections";
import { MarketingInfoPage } from "@/components/marketing/MarketingInfoPage";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "howItWorks");

export default function HowItWorksPage() {
  return (
    <MarketingInfoPage
      eyebrowKey="nav.howItWorks"
      titleKey="how.title"
      subtitleKey="how.subtitle"
      titleMetaKey="meta.howItWorks.title"
      descriptionMetaKey="meta.howItWorks.description"
    >
      <ProblemSection titleKey="how.problem.title" bodyKey="how.problem.body" />
      <WorkflowSection
        titleKey="home.workflow.title"
        bodyKey="home.workflow.body"
        items={[
          { titleKey: "how.signal.title", bodyKey: "how.signal.body" },
          { titleKey: "how.demand.title", bodyKey: "how.demand.body" },
          { titleKey: "how.pair.title", bodyKey: "how.pair.body" },
          { titleKey: "how.outcome.title", bodyKey: "how.outcome.body" },
          { titleKey: "how.implementation.title", bodyKey: "how.implementation.body" },
        ]}
      />
      <CTASection titleKey="how.cta.title" bodyKey="how.cta.body" />
    </MarketingInfoPage>
  );
}
