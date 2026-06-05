import type { Metadata } from "next";

import { LegalSectionsPage } from "@/components/legal/LegalSectionsPage";
import { getStaticMetadata } from "@/lib/i18n";
import { privacySections } from "@/lib/legal-content";

export const metadata: Metadata = getStaticMetadata("en", "privacy");

export default function LegalPrivacyPage() {
  return (
    <LegalSectionsPage
      titleKey="legal.privacy.title"
      titleMetaKey="meta.privacy.title"
      descriptionMetaKey="meta.privacy.description"
      sections={privacySections}
    />
  );
}
