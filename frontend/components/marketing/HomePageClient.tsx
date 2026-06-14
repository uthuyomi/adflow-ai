"use client";

import { LocalizedMetadata } from "@/components/i18n/LocalizedMetadata";
import { BuiltForSection } from "@/components/landing/BuiltForSection";
import { ChatGPTComparisonSection } from "@/components/landing/ChatGPTComparisonSection";
import { ExampleReportSection } from "@/components/landing/ExampleReportSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { HeroSection } from "@/components/landing/HeroSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { useI18n } from "@/hooks/use-i18n";
import { lp } from "@/lib/i18n/lp";

export function HomePageClient() {
  const { locale } = useI18n();
  const c = lp[locale];

  return (
    <div className="bg-white text-[#111111]">
      <LocalizedMetadata titleKey="meta.home.title" descriptionKey="meta.home.description" />
      <HeroSection c={c} />
      <ProblemSection c={c} />
      <WorkflowSection c={c} />
      <ExampleReportSection c={c} />
      <ChatGPTComparisonSection c={c} />
      <FeaturesSection c={c} />
      <BuiltForSection c={c} />
      <PricingSection c={c} locale={locale} />
      <FaqSection c={c} />
      <FinalCTASection c={c} />
    </div>
  );
}
