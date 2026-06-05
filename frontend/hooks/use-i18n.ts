"use client";

import { useEffect } from "react";

import {
  getBrowserDefaultLocale,
  isLocale,
  LOCALE_STORAGE_KEY,
  translate,
  type Locale,
} from "@/lib/i18n";
import { useUiStore } from "@/lib/store";

export function useI18n() {
  const locale = useUiStore((state) => state.locale);
  const setStoreLocale = useUiStore((state) => state.setLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const next = isLocale(stored) ? stored : getBrowserDefaultLocale(window.navigator.language);
    setStoreLocale(next);
  }, [setStoreLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && isLocale(event.newValue)) {
        setStoreLocale(event.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [setStoreLocale]);

  const setLocale = (next: Locale) => {
    setStoreLocale(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };

  return {
    locale,
    setLocale,
    t: (key: string) => translate(locale, key),
  };
}
