import type { Metadata } from "next";

import { HomePageClient } from "@/components/marketing/HomePageClient";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "home");

export default function HomePage() {
  return <HomePageClient />;
}
