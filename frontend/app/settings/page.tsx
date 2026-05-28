import { SectionHeader } from "@/components/shared/SectionHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Configure backend, X Ads, GitHub, Supabase, and analysis schedule visibility." />
      <SettingsForm />
    </div>
  );
}
