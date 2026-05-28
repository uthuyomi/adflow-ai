"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PairForm, type PairFormValues } from "@/components/registered/PairForm";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useAdLpPairMutations } from "@/hooks/use-ad-lp-pairs";
import { useLandingPages } from "@/hooks/use-landing-pages";
import { useTwitterAds } from "@/hooks/use-twitter-ads";

export default function NewPairPage() {
  const router = useRouter();
  const ads = useTwitterAds();
  const lps = useLandingPages();
  const mutations = useAdLpPairMutations();

  const submit = async (values: PairFormValues) => {
    try {
      await mutations.create.mutateAsync(values);
      toast.success("Pair created.");
      router.push("/pairs");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed.");
    }
  };

  if (ads.isLoading || lps.isLoading) return <PageSkeleton />;
  if (ads.isError || lps.isError) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="New Ad LP Pair" description="Choose one registered X ad and one registered LP as an evaluation unit." />
      <PairForm ads={ads.data ?? []} lps={lps.data ?? []} submitLabel="Create pair" isPending={mutations.create.isPending} onSubmit={submit} />
    </div>
  );
}
