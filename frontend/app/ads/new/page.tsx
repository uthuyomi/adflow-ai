"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdForm, type AdFormValues } from "@/components/registered/AdForm";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useTwitterAdMutations } from "@/hooks/use-twitter-ads";

export default function NewAdPage() {
  const router = useRouter();
  const mutations = useTwitterAdMutations();
  const submit = async (values: AdFormValues) => {
    const clicks = values.clicks || 0;
    const impressions = values.impressions || 0;
    const conversions = values.conversions || 0;
    const spend = values.spend || 0;
    try {
      await mutations.create.mutateAsync({
        ...values,
        ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        cpc: clicks ? Number((spend / clicks).toFixed(2)) : 0,
        cvr: clicks ? Number(((conversions / clicks) * 100).toFixed(2)) : 0,
      });
      toast.success("Ad created.");
      router.push("/ads");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="New X Ad" description="Register the ad copy, destination, creative URLs, and current metrics." />
      <AdForm submitLabel="Create ad" isPending={mutations.create.isPending} onSubmit={submit} />
    </div>
  );
}
