import type { Metadata } from "next";

import { CTASection, FeatureDeepDiveSection, ProblemSection } from "@/components/marketing/ConversionSections";
import { InfoGrid, MarketingInfoPage } from "@/components/marketing/MarketingInfoPage";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "features");

const items = [
  { titleKey: "features.demand.title", bodyKey: "features.demand.copy" },
  { titleKey: "features.pair.title", bodyKey: "features.pair.copy" },
  { titleKey: "features.review.title", bodyKey: "features.review.copy" },
  { titleKey: "features.outcome.title", bodyKey: "features.outcome.copy" },
  { titleKey: "features.reviewCenter.title", bodyKey: "features.reviewCenter.copy" },
] as const;

export default function FeaturesPage() {
  return (
    <MarketingInfoPage
      eyebrowKey="features.eyebrow"
      titleKey="features.title"
      subtitleKey="features.subtitle"
      titleMetaKey="meta.features.title"
      descriptionMetaKey="meta.features.description"
    >
      <InfoGrid items={[...items]} />
      <ProblemSection titleKey="features.problem.title" bodyKey="features.problem.body" />
      <FeatureDeepDiveSection
        items={[
          {
            titleKey: "features.demand.title",
            problemKey: "features.deep.demand.problem",
            doesKey: "features.deep.demand.does",
            outputKey: "features.deep.demand.output",
            benefitKey: "features.deep.demand.benefit",
            exampleKey: "features.deep.demand.example",
          },
          {
            titleKey: "features.pair.title",
            problemKey: "features.deep.pair.problem",
            doesKey: "features.deep.pair.does",
            outputKey: "features.deep.pair.output",
            benefitKey: "features.deep.pair.benefit",
            exampleKey: "features.deep.pair.example",
          },
          {
            titleKey: "home.preview.evidence.title",
            problemKey: "features.deep.evidence.problem",
            doesKey: "features.deep.evidence.does",
            outputKey: "features.deep.evidence.output",
            benefitKey: "features.deep.evidence.benefit",
            exampleKey: "features.deep.evidence.example",
          },
          {
            titleKey: "features.outcome.title",
            problemKey: "features.deep.outcome.problem",
            doesKey: "features.deep.outcome.does",
            outputKey: "features.deep.outcome.output",
            benefitKey: "features.deep.outcome.benefit",
            exampleKey: "features.deep.outcome.example",
          },
          {
            titleKey: "features.reviewCenter.title",
            problemKey: "features.deep.review.problem",
            doesKey: "features.deep.review.does",
            outputKey: "features.deep.review.output",
            benefitKey: "features.deep.review.benefit",
            exampleKey: "features.deep.review.example",
          },
        ]}
      />
      <CTASection titleKey="home.cta.title" bodyKey="home.cta.body" />
    </MarketingInfoPage>
  );
}
