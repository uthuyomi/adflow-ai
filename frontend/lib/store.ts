"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type DialogMode = "approve" | "reject" | "pr" | null;
export type AnalysisAIMode = "openai_only" | "multi_provider";

type UiState = {
  selectedProject: string;
  selectedCampaignId: string | null;
  selectedImprovementId: string | null;
  reviewDialogMode: DialogMode;
  sidebarOpen: boolean;
  analysisAIMode: AnalysisAIMode;
  setSelectedProject: (project: string) => void;
  setSelectedCampaignId: (campaignId: string | null) => void;
  setSelectedImprovementId: (improvementId: string | null) => void;
  setReviewDialogMode: (mode: DialogMode) => void;
  setSidebarOpen: (open: boolean) => void;
  setAnalysisAIMode: (mode: AnalysisAIMode) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedProject: "Route Automation Launch",
      selectedCampaignId: "cmp_001",
      selectedImprovementId: "imp_1",
      reviewDialogMode: null,
      sidebarOpen: false,
      analysisAIMode: "openai_only",
      setSelectedProject: (project) => set({ selectedProject: project }),
      setSelectedCampaignId: (campaignId) => set({ selectedCampaignId: campaignId }),
      setSelectedImprovementId: (improvementId) => set({ selectedImprovementId: improvementId }),
      setReviewDialogMode: (mode) => set({ reviewDialogMode: mode }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setAnalysisAIMode: (mode) => set({ analysisAIMode: mode }),
    }),
    {
      name: "adflow-ui-settings",
      partialize: (state) => ({
        analysisAIMode: state.analysisAIMode,
        selectedProject: state.selectedProject,
      }),
    },
  ),
);
