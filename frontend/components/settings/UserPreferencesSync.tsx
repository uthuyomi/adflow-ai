"use client";

import { useUserPreferences } from "@/hooks/use-user-preferences";

export function UserPreferencesSync() {
  useUserPreferences();
  return null;
}

