"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "@/components/registered/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LandingPage } from "@/lib/types/adflow";

const schema = z.object({
  name: z.string().min(1, "Name is required."),
  url: z.string().url("Enter a valid URL."),
  hero_title: z.string().nullable(),
  hero_subtitle: z.string().nullable(),
  primary_cta: z.string().nullable(),
  secondary_cta: z.string().nullable(),
  offer_text: z.string().nullable(),
  target_audience: z.string().nullable(),
  bounce_rate: z.coerce.number().min(0).max(100).nullable(),
  session_duration: z.coerce.number().min(0).nullable(),
  scroll_depth: z.coerce.number().min(0).max(100).nullable(),
  page_speed: z.coerce.number().min(0).nullable(),
  fcp: z.coerce.number().min(0).nullable(),
  lcp: z.coerce.number().min(0).nullable(),
  notes: z.string().nullable(),
});

export type LpFormValues = z.infer<typeof schema>;

export function LpForm({
  initialValue,
  isPending,
  submitLabel,
  onSubmit,
}: {
  initialValue?: Partial<LandingPage>;
  isPending?: boolean;
  submitLabel: string;
  onSubmit: (values: LpFormValues) => void;
}) {
  const form = useForm<LpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValue?.name ?? "",
      url: initialValue?.url ?? "",
      hero_title: initialValue?.hero_title ?? "",
      hero_subtitle: initialValue?.hero_subtitle ?? "",
      primary_cta: initialValue?.primary_cta ?? "",
      secondary_cta: initialValue?.secondary_cta ?? "",
      offer_text: initialValue?.offer_text ?? "",
      target_audience: initialValue?.target_audience ?? "",
      bounce_rate: initialValue?.bounce_rate ?? 0,
      session_duration: initialValue?.session_duration ?? 0,
      scroll_depth: initialValue?.scroll_depth ?? 0,
      page_speed: initialValue?.page_speed ?? 0,
      fcp: initialValue?.fcp ?? 0,
      lcp: initialValue?.lcp ?? 0,
      notes: initialValue?.notes ?? "",
    },
  });

  return (
    <Card className="p-5">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Name" registration={form.register("name")} error={form.formState.errors.name} />
        <FormField label="URL" registration={form.register("url")} error={form.formState.errors.url} />
        <FormField label="Hero title" registration={form.register("hero_title")} error={form.formState.errors.hero_title} />
        <FormField label="Hero subtitle" registration={form.register("hero_subtitle")} error={form.formState.errors.hero_subtitle} />
        <FormField label="Primary CTA" registration={form.register("primary_cta")} error={form.formState.errors.primary_cta} />
        <FormField label="Secondary CTA" registration={form.register("secondary_cta")} error={form.formState.errors.secondary_cta} />
        <FormField label="Offer text" registration={form.register("offer_text")} error={form.formState.errors.offer_text} />
        <FormField label="Target audience" registration={form.register("target_audience")} error={form.formState.errors.target_audience} />
        <FormField label="Bounce rate" type="number" registration={form.register("bounce_rate")} error={form.formState.errors.bounce_rate} />
        <FormField label="Session duration" type="number" registration={form.register("session_duration")} error={form.formState.errors.session_duration} />
        <FormField label="Scroll depth" type="number" registration={form.register("scroll_depth")} error={form.formState.errors.scroll_depth} />
        <FormField label="Page speed" type="number" registration={form.register("page_speed")} error={form.formState.errors.page_speed} />
        <FormField label="FCP" type="number" registration={form.register("fcp")} error={form.formState.errors.fcp} />
        <FormField label="LCP" type="number" registration={form.register("lcp")} error={form.formState.errors.lcp} />
        <div className="md:col-span-2">
          <FormField label="Notes" textarea registration={form.register("notes")} error={form.formState.errors.notes} />
        </div>
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
