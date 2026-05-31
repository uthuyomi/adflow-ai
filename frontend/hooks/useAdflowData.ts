import { useQuery } from "@tanstack/react-query";

import { runWorkflow } from "@/lib/api/client";
import { listHighPriorityProductBacklog, listOpenIntelligenceAlerts, listRecentImprovementOutcomes, listRecentLearningPatterns, listRecentMarketResearchRuns, listRecentProductReviewRuns, listRecentRoadmaps, listTopEvidenceClusters } from "@/lib/supabase/adflow-repository";

export const queryKeys = {
  workflow: ["workflow"] as const,
  campaigns: ["campaigns"] as const,
  campaign: (id: string) => ["campaign", id] as const,
  lp: ["lp-analysis"] as const,
  improvements: ["improvements"] as const,
  improvement: (id: string) => ["improvement", id] as const,
  prs: ["pull-requests"] as const,
  marketResearch: ["market-research-dashboard"] as const,
  outcomes: ["outcomes-dashboard"] as const,
  productReviews: ["product-reviews-dashboard"] as const,
  productBacklog: ["product-backlog-dashboard"] as const,
  evidenceClusters: ["evidence-clusters-dashboard"] as const,
  roadmaps: ["roadmaps-dashboard"] as const,
  alerts: ["alerts-dashboard"] as const,
  learningPatterns: ["learning-patterns-dashboard"] as const,
};

export function useWorkflow() {
  return useQuery({
    queryKey: queryKeys.workflow,
    queryFn: runWorkflow,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useMarketResearchDashboard() {
  return useQuery({
    queryKey: queryKeys.marketResearch,
    queryFn: () => listRecentMarketResearchRuns(10),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useOutcomesDashboard() {
  return useQuery({
    queryKey: queryKeys.outcomes,
    queryFn: () => listRecentImprovementOutcomes(20),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useProductReviewsDashboard() {
  return useQuery({
    queryKey: queryKeys.productReviews,
    queryFn: () => listRecentProductReviewRuns(10),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useProductBacklogDashboard() {
  return useQuery({
    queryKey: queryKeys.productBacklog,
    queryFn: () => listHighPriorityProductBacklog(10),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useEvidenceClustersDashboard() {
  return useQuery({
    queryKey: queryKeys.evidenceClusters,
    queryFn: () => listTopEvidenceClusters(10),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useRoadmapsDashboard() {
  return useQuery({
    queryKey: queryKeys.roadmaps,
    queryFn: () => listRecentRoadmaps(10),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAlertsDashboard() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () => listOpenIntelligenceAlerts(10),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useLearningPatternsDashboard() {
  return useQuery({
    queryKey: queryKeys.learningPatterns,
    queryFn: () => listRecentLearningPatterns(10),
    staleTime: 60_000,
    retry: 1,
  });
}
