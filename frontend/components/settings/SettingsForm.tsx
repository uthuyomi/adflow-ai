"use client";

import { Languages, Save, UserRound } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import type { Locale } from "@/lib/i18n";
import type { AnalysisAIMode } from "@/lib/store";

export function SettingsForm() {
  const { t } = useI18n();
  const { preferences, savePreferences, isLoading: preferencesLoading } = useUserPreferences();
  const [personalLocale, setPersonalLocale] = useState<Locale>(preferences.locale);
  const [personalAIMode, setPersonalAIMode] = useState<AnalysisAIMode>(preferences.analysisAIMode);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    setPersonalLocale(preferences.locale);
    setPersonalAIMode(preferences.analysisAIMode);
  }, [preferences.analysisAIMode, preferences.locale]);

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      await savePreferences({ locale: personalLocale, analysisAIMode: personalAIMode });
      toast.success(t("settings.personal.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("settings.personal.saveFailed"));
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            {t("settings.personal.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label={t("common.language")}>
            <div className="relative">
              <Languages className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                onChange={(event) => setPersonalLocale(event.target.value as Locale)}
                value={personalLocale}
              >
                <option value="ja">{t("common.japanese")}</option>
                <option value="en">English</option>
              </select>
            </div>
          </Field>
          <Field label={t("settings.personal.aiMode")}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => setPersonalAIMode(event.target.value as AnalysisAIMode)}
              value={personalAIMode}
            >
              <option value="openai_only">OpenAI only</option>
              <option value="multi_provider">Multi AI</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              {t("settings.personal.description")}
            </p>
            <Button disabled={preferencesLoading || savingPreferences} onClick={handleSavePreferences} type="button">
              <Save className="mr-2 h-4 w-4" />
              {savingPreferences ? t("settings.personal.saving") : t("settings.personal.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
