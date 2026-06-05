import type { Metadata } from "next";

import { ContactPageClient } from "@/components/marketing/ContactPageClient";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "contact");

export default function ContactPage() {
  return <ContactPageClient />;
}
