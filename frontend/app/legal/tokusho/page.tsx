import type { Metadata } from "next";

import { LegalTablePage } from "@/components/legal/LegalSectionsPage";
import { getStaticMetadata } from "@/lib/i18n";
import { tokushoRows } from "@/lib/legal-content";

export const metadata: Metadata = getStaticMetadata("en", "legal");

export default function TokushoPage() {
  return (
    <LegalTablePage
      titleKey="legal.tokusho.title"
      titleMetaKey="meta.legal.title"
      descriptionMetaKey="meta.legal.description"
      rows={tokushoRows}
    />
  );
}
