"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdForm, type AdFormValues } from "@/components/registered/AdForm";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useTwitterAd, useTwitterAdMutations } from "@/hooks/use-twitter-ads";

export default function EditAdPage() {
  const params = useParams<{ adId: string }>();
  const router = useRouter();
  const ad = useTwitterAd(params.adId);
  const mutations = useTwitterAdMutations();

  const submit = async (values: AdFormValues) => {
    const clicks = values.clicks || 0;
    const impressions = values.impressions || 0;
    const conversions = values.conversions || 0;
    const spend = values.spend || 0;
    try {
      await mutations.update.mutateAsync({
        id: params.adId,
        payload: {
          ...values,
          ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
          cpc: clicks ? Number((spend / clicks).toFixed(2)) : 0,
          cvr: clicks ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
        },
      });
      toast.success("Ad updated.");
      router.push("/ads");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  };

  if (ad.isLoading) return <PageSkeleton />;
  if (ad.isError || !ad.data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Edit X Ad" description="Changes are stored as before/after history." />
      <AdForm initialValue={ad.data} submitLabel="Save ad" isPending={mutations.update.isPending} onSubmit={submit} />
    </div>
  );
}
