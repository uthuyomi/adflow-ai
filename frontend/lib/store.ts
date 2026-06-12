"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type DialogMode = "approve" | "reject" | "pr" | "applied" | "failed" | null;
export type AnalysisAIMode = "openai_only" | "multi_provider";
export type Locale = "en" | "ja";

type UiState = {
  selectedProject: string;
  selectedCampaignId: string | null;
  selectedImprovementId: string | null;
  reviewDialogMode: DialogMode;
  sidebarOpen: boolean;
  analysisAIMode: AnalysisAIMode;
  locale: Locale;
  setSelectedProject: (project: string) => void;
  setSelectedCampaignId: (campaignId: string | null) => void;
  setSelectedImprovementId: (improvementId: string | null) => void;
  setReviewDialogMode: (mode: DialogMode) => void;
  setSidebarOpen: (open: boolean) => void;
  setAnalysisAIMode: (mode: AnalysisAIMode) => void;
  setLocale: (locale: Locale) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedProject: "",
      selectedCampaignId: null,
      selectedImprovementId: null,
      reviewDialogMode: null,
      sidebarOpen: false,
      analysisAIMode: "openai_only",
      locale: "en",
      setSelectedProject: (project) => set({ selectedProject: project }),
      setSelectedCampaignId: (campaignId) => set({ selectedCampaignId: campaignId }),
      setSelectedImprovementId: (improvementId) => set({ selectedImprovementId: improvementId }),
      setReviewDialogMode: (mode) => set({ reviewDialogMode: mode }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setAnalysisAIMode: (mode) => set({ analysisAIMode: mode }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "adflow-ui-settings",
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<Pick<UiState, "analysisAIMode" | "selectedProject" | "locale">>;
        return {
          analysisAIMode: state.analysisAIMode ?? "openai_only",
          selectedProject: state.selectedProject === "Route Automation Launch" ? "" : (state.selectedProject ?? ""),
          locale: state.locale ?? "en",
        };
      },
      partialize: (state) => ({
        analysisAIMode: state.analysisAIMode,
        selectedProject: state.selectedProject,
        locale: state.locale,
      }),
    },
  ),
);
