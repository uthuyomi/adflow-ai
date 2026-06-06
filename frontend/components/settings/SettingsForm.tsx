"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Languages, Save, UserRound } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import type { Locale } from "@/lib/i18n";
import { SettingsSchema } from "@/lib/schemas";
import { getApiBaseUrl } from "@/lib/api/client";
import type { AnalysisAIMode } from "@/lib/store";

type SettingsValues = z.infer<typeof SettingsSchema>;

export function SettingsForm() {
  const { t } = useI18n();
  const { preferences, savePreferences, isLoading: preferencesLoading } = useUserPreferences();
  const [personalLocale, setPersonalLocale] = useState<Locale>(preferences.locale);
  const [personalAIMode, setPersonalAIMode] = useState<AnalysisAIMode>(preferences.analysisAIMode);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const form = useForm<SettingsValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      apiBaseUrl: getApiBaseUrl(),
      githubRepository: "owner/repo",
      supabaseProject: "adflow-prod",
      xAdsStatus: "pending",
      analysisSchedule: "Every weekday 09:00",
    },
  });

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
      toast.error(error instanceof Error ? error.message : "Personal settings could not be saved.");
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
                <option value="ja">日本語</option>
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

      <Card>
        <CardHeader>
          <CardTitle>Connection settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-5 md:grid-cols-2"
            onSubmit={form.handleSubmit(() => toast.success("Settings validated locally."))}
          >
            <Field label="Backend API URL" error={form.formState.errors.apiBaseUrl?.message}>
              <Input {...form.register("apiBaseUrl")} />
            </Field>
            <Field label="GitHub repository" error={form.formState.errors.githubRepository?.message}>
              <Input {...form.register("githubRepository")} />
            </Field>
            <Field label="Supabase project" error={form.formState.errors.supabaseProject?.message}>
              <Input {...form.register("supabaseProject")} />
            </Field>
            <Field label="X Ads connection status" error={form.formState.errors.xAdsStatus?.message}>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("xAdsStatus")}
              >
                <option value="connected">Connected</option>
                <option value="pending">Pending</option>
                <option value="not_connected">Not connected</option>
              </select>
            </Field>
            <Field label="Analysis schedule" error={form.formState.errors.analysisSchedule?.message}>
              <Input {...form.register("analysisSchedule")} />
            </Field>
            <div className="flex items-end">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save settings
              </Button>
            </div>
          </form>
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
