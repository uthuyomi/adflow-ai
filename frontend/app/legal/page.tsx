import type { Metadata } from "next";

import { LegalIndexPageClient } from "@/components/legal/LegalIndexPageClient";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "legal");

export default function LegalPage() {
  return <LegalIndexPageClient />;
}
