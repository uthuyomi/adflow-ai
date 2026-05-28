"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
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

type SettingsValues = z.infer<typeof SettingsSchema>;

export function SettingsForm() {
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
