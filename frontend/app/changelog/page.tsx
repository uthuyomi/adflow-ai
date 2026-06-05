import type { Metadata } from "next";

import { ChangelogList } from "@/components/marketing/ChangelogList";
import { MarketingInfoPage } from "@/components/marketing/MarketingInfoPage";
import { getStaticMetadata } from "@/lib/i18n";

export const metadata: Metadata = getStaticMetadata("en", "changelog");

export default function ChangelogPage() {
  return (
    <MarketingInfoPage
      eyebrowKey="changelog.eyebrow"
      titleKey="changelog.title"
      subtitleKey="changelog.subtitle"
      titleMetaKey="meta.changelog.title"
      descriptionMetaKey="meta.changelog.description"
    >
      <ChangelogList />
    </MarketingInfoPage>
  );
}
