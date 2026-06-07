"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField, SelectField } from "@/components/registered/FormField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import type { AdLpPair, LandingPage, TwitterAd } from "@/lib/types/adflow";

const schema = z.object({
  name: z.string().min(1, "Name is required."),
  twitter_ad_id: z.string().min(1, "Select an ad."),
  landing_page_id: z.string().min(1, "Select an LP."),
  status: z.string().min(1),
});

export type PairFormValues = z.infer<typeof schema>;

export function PairForm({
  ads,
  lps,
  initialValue,
  isPending,
  submitLabel,
  onSubmit,
}: {
  ads: TwitterAd[];
  lps: LandingPage[];
  initialValue?: Partial<AdLpPair>;
  isPending?: boolean;
  submitLabel: string;
  onSubmit: (values: PairFormValues) => void;
}) {
  const { t } = useI18n();
  const form = useForm<PairFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValue?.name ?? "",
      twitter_ad_id: initialValue?.twitter_ad_id ?? "",
      landing_page_id: initialValue?.landing_page_id ?? "",
      status: initialValue?.status ?? "active",
    },
  });

  return (
    <Card className="p-5">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label={t("form.pairName")} registration={form.register("name")} error={form.formState.errors.name} />
        <SelectField label={t("form.status")} registration={form.register("status")} error={form.formState.errors.status}>
          <option value="active">{t("status.active")}</option>
          <option value="paused">{t("status.paused")}</option>
          <option value="draft">{t("status.draft")}</option>
        </SelectField>
        <SelectField label="X ad" registration={form.register("twitter_ad_id")} error={form.formState.errors.twitter_ad_id}>
          <option value="">{t("form.selectAd")}</option>
          {ads.map((ad) => (
            <option key={ad.id} value={ad.id}>
              {ad.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Landing page" registration={form.register("landing_page_id")} error={form.formState.errors.landing_page_id}>
          <option value="">{t("form.selectLp")}</option>
          {lps.map((lp) => (
            <option key={lp.id} value={lp.id}>
              {lp.name}
            </option>
          ))}
        </SelectField>
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? t("common.saving") : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
