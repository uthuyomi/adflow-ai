"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, KeyRound, Save } from "lucide-react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSchema } from "@/lib/schemas";
import { getApiBaseUrl } from "@/lib/api/client";
import { useUiStore, type AnalysisAIMode } from "@/lib/store";

type SettingsValues = z.infer<typeof SettingsSchema>;

export function SettingsForm() {
  const analysisAIMode = useUiStore((state) => state.analysisAIMode);
  const setAnalysisAIMode = useUiStore((state) => state.setAnalysisAIMode);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account AI settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            <ModeButton
              active={analysisAIMode === "openai_only"}
              icon={<KeyRound className="mr-2 h-4 w-4" />}
              label="OpenAI only"
              mode="openai_only"
              onSelect={setAnalysisAIMode}
            />
            <ModeButton
              active={analysisAIMode === "multi_provider"}
              icon={<BrainCircuit className="mr-2 h-4 w-4" />}
              label="Multi AI"
              mode="multi_provider"
              onSelect={setAnalysisAIMode}
            />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            This account setting controls pair analysis. OpenAI only is the default; Multi AI routes work across specialized providers.
          </p>
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

function ModeButton({
  active,
  icon,
  label,
  mode,
  onSelect,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  mode: AnalysisAIMode;
  onSelect: (mode: AnalysisAIMode) => void;
}) {
  return (
    <Button
      className="h-9 px-3"
      onClick={() => onSelect(mode)}
      type="button"
      variant={active ? "secondary" : "ghost"}
    >
      {icon}
      {label}
    </Button>
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
