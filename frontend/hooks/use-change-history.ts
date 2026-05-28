"use client";

import { useQuery } from "@tanstack/react-query";

import { listChangeHistory, listPairHistory } from "@/lib/supabase/adflow-repository";
import type { AdLpPair } from "@/lib/types/adflow";

export function useChangeHistory() {
  return useQuery({ queryKey: ["change-history"], queryFn: listChangeHistory });
}

export function usePairChangeHistory(pair: AdLpPair | undefined) {
  return useQuery({
    queryKey: ["change-history", "pair", pair?.id],
    queryFn: () => listPairHistory(pair as AdLpPair),
    enabled: Boolean(pair),
  });
}
