import type { Metadata } from "next";

import { CTASection, FAQSection } from "@/components/marketing/ConversionSections";
import { MarketingInfoPage } from "@/components/marketing/MarketingInfoPage";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "faq");

const items = [
  { questionKey: "faq.q1", answerKey: "faq.a1" },
  { questionKey: "faq.q2", answerKey: "faq.a2" },
  { questionKey: "faq.q3", answerKey: "faq.a3" },
  { questionKey: "faq.q4", answerKey: "faq.a4" },
  { questionKey: "faq.q5", answerKey: "faq.a5" },
  { questionKey: "faq.q6", answerKey: "faq.a6" },
  { questionKey: "faq.q7", answerKey: "faq.a7" },
  { questionKey: "faq.q8", answerKey: "faq.a8" },
  { questionKey: "faq.q9", answerKey: "faq.a9" },
  { questionKey: "faq.q10", answerKey: "faq.a10" },
  { questionKey: "faq.q11", answerKey: "faq.a11" },
] as const;

export default function FaqPage() {
  return (
    <MarketingInfoPage
      eyebrowKey="faq.eyebrow"
      titleKey="faq.title"
      subtitleKey="faq.subtitle"
      titleMetaKey="meta.faq.title"
      descriptionMetaKey="meta.faq.description"
    >
      <FAQSection titleKey="faq.eyebrow" items={[...items]} />
      <CTASection titleKey="home.cta.title" bodyKey="home.cta.body" />
    </MarketingInfoPage>
  );
}
