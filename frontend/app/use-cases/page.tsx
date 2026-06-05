import type { Metadata } from "next";

import { CTASection, WorkflowSection } from "@/components/marketing/ConversionSections";
import { InfoGrid, MarketingInfoPage } from "@/components/marketing/MarketingInfoPage";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "useCases");

const items = [
  { titleKey: "useCases.builder.title", bodyKey: "useCases.builder.copy" },
  { titleKey: "useCases.saas.title", bodyKey: "useCases.saas.copy" },
  { titleKey: "useCases.agency.title", bodyKey: "useCases.agency.copy" },
  { titleKey: "useCases.indie.title", bodyKey: "useCases.indie.outcome" },
  { titleKey: "useCases.founder.title", bodyKey: "useCases.founder.outcome" },
  { titleKey: "useCases.marketing.title", bodyKey: "useCases.marketing.outcome" },
  { titleKey: "useCases.agencies.title", bodyKey: "useCases.agencies.outcome" },
] as const;

export default function UseCasesPage() {
  return (
    <MarketingInfoPage
      eyebrowKey="useCases.eyebrow"
      titleKey="useCases.title"
      subtitleKey="useCases.subtitle"
      titleMetaKey="meta.useCases.title"
      descriptionMetaKey="meta.useCases.description"
    >
      <InfoGrid items={[...items]} />
      <WorkflowSection
        titleKey="useCases.workflow.title"
        bodyKey="useCases.workflow.body"
        items={[
          { titleKey: "useCases.workflow.step1.title", bodyKey: "useCases.workflow.step1.body" },
          { titleKey: "useCases.workflow.step2.title", bodyKey: "useCases.workflow.step2.body" },
          { titleKey: "useCases.workflow.step3.title", bodyKey: "useCases.workflow.step3.body" },
          { titleKey: "useCases.workflow.step4.title", bodyKey: "useCases.workflow.step4.body" },
        ]}
      />
      <CTASection titleKey="home.cta.title" bodyKey="home.cta.body" />
    </MarketingInfoPage>
  );
}
