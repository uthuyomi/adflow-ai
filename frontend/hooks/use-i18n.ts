"use client";

import { useEffect, useState } from "react";

import {
  getBrowserDefaultLocale,
  isLocale,
  LOCALE_STORAGE_KEY,
  translate,
  type Locale,
} from "@/lib/i18n";
import { useUiStore } from "@/lib/store";

export function useI18n() {
  const storeLocale = useUiStore((state) => state.locale);
  const setStoreLocale = useUiStore((state) => state.setLocale);
  const [locale, setLocalLocale] = useState<Locale>(storeLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const next = isLocale(stored) ? stored : getBrowserDefaultLocale(window.navigator.language);
    setLocalLocale(next);
    setStoreLocale(next);
  }, [setStoreLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && isLocale(event.newValue)) {
        setLocalLocale(event.newValue);
        setStoreLocale(event.newValue);
      }
    };
    const handleLocaleChange = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if (isLocale(next)) {
        setLocalLocale(next);
        setStoreLocale(next);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("adflow-locale-change", handleLocaleChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("adflow-locale-change", handleLocaleChange);
    };
  }, [setStoreLocale]);

  const setLocale = (next: Locale) => {
    setLocalLocale(next);
    setStoreLocale(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent<Locale>("adflow-locale-change", { detail: next }));
  };

  return {
    locale,
    setLocale,
    t: (key: string) => translate(locale, key),
  };
}
