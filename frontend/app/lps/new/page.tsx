"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LpForm, type LpFormValues } from "@/components/registered/LpForm";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useLandingPageMutations } from "@/hooks/use-landing-pages";

export default function NewLpPage() {
  const router = useRouter();
  const mutations = useLandingPageMutations();

  const submit = async (values: LpFormValues) => {
    try {
      await mutations.create.mutateAsync(values);
      toast.success("LP created.");
      router.push("/lps");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="New Landing Page" description="Register LP structure, behavior, and performance values." />
      <LpForm submitLabel="Create LP" isPending={mutations.create.isPending} onSubmit={submit} />
    </div>
  );
}
