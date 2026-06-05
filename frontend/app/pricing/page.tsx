import type { Metadata } from "next";

import { PricingPageClient } from "@/components/billing/PricingPageClient";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "pricing");

export default function PricingPage() {
  return <PricingPageClient />;
}
