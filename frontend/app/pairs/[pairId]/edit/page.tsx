"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PairForm, type PairFormValues } from "@/components/registered/PairForm";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useAdLpPair, useAdLpPairMutations } from "@/hooks/use-ad-lp-pairs";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useTwitterAds } from "@/hooks/use-twitter-ads";

export default function EditPairPage() {
  const params = useParams<{ pairId: string }>();
  const router = useRouter();
  const pair = useAdLpPair(params.pairId);
  const ads = useTwitterAds();
  const lps = useLandingPages();
  const mutations = useAdLpPairMutations();

  const submit = async (values: PairFormValues) => {
    try {
      await mutations.update.mutateAsync({ id: params.pairId, payload: values });
      toast.success("Pair updated.");
      router.push("/pairs");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  };

  if (pair.isLoading || ads.isLoading || lps.isLoading) return <PageSkeleton />;
  if (pair.isError || ads.isError || lps.isError || !pair.data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Edit Ad LP Pair" description="Pair changes are stored as before/after history." />
      <PairForm
        ads={ads.data ?? []}
        lps={lps.data ?? []}
        initialValue={pair.data}
        submitLabel="Save pair"
        isPending={mutations.update.isPending}
        onSubmit={submit}
      />
    </div>
  );
}
