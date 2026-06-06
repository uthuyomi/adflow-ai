"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { isLocale, LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUiStore, type AnalysisAIMode } from "@/lib/store";

export type UserPreferences = {
  locale: Locale;
  analysisAIMode: AnalysisAIMode;
};

export function useUserPreferences() {
  const { user } = useAuth();
  const locale = useUiStore((state) => state.locale);
  const analysisAIMode = useUiStore((state) => state.analysisAIMode);
  const setLocale = useUiStore((state) => state.setLocale);
  const setAnalysisAIMode = useUiStore((state) => state.setAnalysisAIMode);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const loadPreferences = async () => {
      try {
        const { data } = await supabase
          .from("user_preferences")
          .select("locale,analysis_ai_mode")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!mounted || !data) return;
        if (isLocale(data.locale)) {
          setLocale(data.locale);
          window.localStorage.setItem(LOCALE_STORAGE_KEY, data.locale);
        }
        if (data.analysis_ai_mode === "openai_only" || data.analysis_ai_mode === "multi_provider") {
          setAnalysisAIMode(data.analysis_ai_mode);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void loadPreferences();

    return () => {
      mounted = false;
    };
  }, [setAnalysisAIMode, setLocale, user]);

  const savePreferences = useCallback(
    async (preferences: UserPreferences) => {
      if (!user) throw new Error("Sign in before saving personal settings.");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          locale: preferences.locale,
          analysis_ai_mode: preferences.analysisAIMode,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;

      setLocale(preferences.locale);
      setAnalysisAIMode(preferences.analysisAIMode);
      window.localStorage.setItem(LOCALE_STORAGE_KEY, preferences.locale);
    },
    [setAnalysisAIMode, setLocale, user],
  );

  return {
    preferences: { locale, analysisAIMode },
    savePreferences,
    isLoading,
  };
}
