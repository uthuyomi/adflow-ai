import { en } from "@/locales/en";
import { ja } from "@/locales/ja";

export type Locale = "en" | "ja";
export type TranslationKey = keyof typeof en;

export const LOCALE_STORAGE_KEY = "adflow-locale";
export const DEFAULT_LOCALE: Locale = "en";

export const dictionaries = {
  en,
  ja,
} as const;

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ja";
}

export function getBrowserDefaultLocale(language?: string): Locale {
  return language?.toLowerCase().startsWith("ja") ? "ja" : DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: string) {
  return dictionaries[locale][key as TranslationKey] ?? dictionaries.en[key as TranslationKey] ?? key;
}

export function getStaticMetadata(locale: Locale, namespace: string) {
  return {
    title: translate(locale, `meta.${namespace}.title` as TranslationKey),
    description: translate(locale, `meta.${namespace}.description` as TranslationKey),
  };
}
