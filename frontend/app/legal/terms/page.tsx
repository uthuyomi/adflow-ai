import type { Metadata } from "next";

import { LegalSectionsPage } from "@/components/legal/LegalSectionsPage";
import { getStaticMetadata } from "@/lib/i18n";
import { termsSections } from "@/lib/legal-content";

export const metadata: Metadata = getStaticMetadata("en", "terms");

export default function LegalTermsPage() {
  return (
    <LegalSectionsPage
      titleKey="legal.terms.title"
      titleMetaKey="meta.terms.title"
      descriptionMetaKey="meta.terms.description"
      sections={termsSections}
    />
  );
}
