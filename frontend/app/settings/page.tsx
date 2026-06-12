"use client";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { GitHubConnectionCard } from "@/components/settings/GitHubConnectionCard";
import { useI18n } from "@/hooks/use-i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <SectionHeader title={t("nav.settings")} description={t("settings.description")} />
      <SettingsForm />
      <GitHubConnectionCard />
    </div>
  );
}
