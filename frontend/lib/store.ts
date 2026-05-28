"use client";

import { create } from "zustand";

type DialogMode = "approve" | "reject" | "pr" | null;

type UiState = {
  selectedProject: string;
  selectedCampaignId: string | null;
  selectedImprovementId: string | null;
  reviewDialogMode: DialogMode;
  sidebarOpen: boolean;
  setSelectedProject: (project: string) => void;
  setSelectedCampaignId: (campaignId: string | null) => void;
  setSelectedImprovementId: (improvementId: string | null) => void;
  setReviewDialogMode: (mode: DialogMode) => void;
  setSidebarOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedProject: "Route Automation Launch",
  selectedCampaignId: "cmp_001",
  selectedImprovementId: "imp_1",
  reviewDialogMode: null,
  sidebarOpen: false,
  setSelectedProject: (project) => set({ selectedProject: project }),
  setSelectedCampaignId: (campaignId) => set({ selectedCampaignId: campaignId }),
  setSelectedImprovementId: (improvementId) => set({ selectedImprovementId: improvementId }),
  setReviewDialogMode: (mode) => set({ reviewDialogMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
