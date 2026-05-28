"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, SelectField } from "@/components/registered/FormField";
import type { TwitterAd } from "@/lib/types/adflow";

const schema = z.object({
  name: z.string().min(1, "Name is required."),
  campaign_name: z.string().nullable(),
  ad_group_name: z.string().nullable(),
  headline: z.string().nullable(),
  body: z.string().nullable(),
  cta: z.string().nullable(),
  destination_url: z.string().url("Enter a valid URL."),
  image_url: z.string().url("Enter a valid URL.").or(z.literal("")).nullable(),
  video_url: z.string().url("Enter a valid URL.").or(z.literal("")).nullable(),
  impressions: z.coerce.number().int().min(0),
  clicks: z.coerce.number().int().min(0),
  conversions: z.coerce.number().int().min(0),
  spend: z.coerce.number().min(0),
  status: z.string().min(1),
});

export type AdFormValues = z.infer<typeof schema>;

export function AdForm({
  initialValue,
  isPending,
  submitLabel,
  onSubmit,
}: {
  initialValue?: Partial<TwitterAd>;
  isPending?: boolean;
  submitLabel: string;
  onSubmit: (values: AdFormValues) => void;
}) {
  const form = useForm<AdFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValue?.name ?? "",
      campaign_name: initialValue?.campaign_name ?? "",
      ad_group_name: initialValue?.ad_group_name ?? "",
      headline: initialValue?.headline ?? "",
      body: initialValue?.body ?? "",
      cta: initialValue?.cta ?? "",
      destination_url: initialValue?.destination_url ?? "",
      image_url: initialValue?.image_url ?? "",
      video_url: initialValue?.video_url ?? "",
      impressions: initialValue?.impressions ?? 0,
      clicks: initialValue?.clicks ?? 0,
      conversions: initialValue?.conversions ?? 0,
      spend: initialValue?.spend ?? 0,
      status: initialValue?.status ?? "active",
    },
  });

  return (
    <Card className="p-5">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Name" registration={form.register("name")} error={form.formState.errors.name} />
        <FormField label="Destination URL" registration={form.register("destination_url")} error={form.formState.errors.destination_url} />
        <FormField label="Campaign" registration={form.register("campaign_name")} error={form.formState.errors.campaign_name} />
        <FormField label="Ad group" registration={form.register("ad_group_name")} error={form.formState.errors.ad_group_name} />
        <FormField label="Headline" registration={form.register("headline")} error={form.formState.errors.headline} />
        <FormField label="CTA" registration={form.register("cta")} error={form.formState.errors.cta} />
        <div className="md:col-span-2">
          <FormField label="Body" textarea registration={form.register("body")} error={form.formState.errors.body} />
        </div>
        <FormField label="Image URL" registration={form.register("image_url")} error={form.formState.errors.image_url} />
        <FormField label="Video URL" registration={form.register("video_url")} error={form.formState.errors.video_url} />
        <FormField label="Impressions" type="number" registration={form.register("impressions")} error={form.formState.errors.impressions} />
        <FormField label="Clicks" type="number" registration={form.register("clicks")} error={form.formState.errors.clicks} />
        <FormField label="Conversions" type="number" registration={form.register("conversions")} error={form.formState.errors.conversions} />
        <FormField label="Spend" type="number" registration={form.register("spend")} error={form.formState.errors.spend} />
        <SelectField label="Status" registration={form.register("status")} error={form.formState.errors.status}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
        </SelectField>
        <div className="flex items-end justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
