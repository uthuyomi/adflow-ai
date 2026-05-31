"use client";

import { useMutation } from "@tanstack/react-query";

import { compareIdeas } from "@/lib/api/client";

export function useIdeaCompare() {
  return useMutation({
    mutationFn: compareIdeas,
  });
}
