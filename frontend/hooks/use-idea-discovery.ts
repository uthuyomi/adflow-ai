"use client";

import { useMutation } from "@tanstack/react-query";

import { discoverIdeas } from "@/lib/api/client";

export function useIdeaDiscovery() {
  return useMutation({
    mutationFn: discoverIdeas,
  });
}
