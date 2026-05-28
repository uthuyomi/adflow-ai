"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { LpForm, type LpFormValues } from "@/components/registered/LpForm";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useLandingPage, useLandingPageMutations } from "@/hooks/use-landing-pages";

export default function EditLpPage() {
  const params = useParams<{ lpId: string }>();
  const router = useRouter();
  const lp = useLandingPage(params.lpId);
  const mutations = useLandingPageMutations();

  const submit = async (values: LpFormValues) => {
    try {
      await mutations.update.mutateAsync({ id: params.lpId, payload: values });
      toast.success("LP updated.");
      router.push("/lps");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  };

  if (lp.isLoading) return <PageSkeleton />;
  if (lp.isError || !lp.data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Edit Landing Page" description="Changes are stored as before/after history." />
      <LpForm initialValue={lp.data} submitLabel="Save LP" isPending={mutations.update.isPending} onSubmit={submit} />
    </div>
  );
}
