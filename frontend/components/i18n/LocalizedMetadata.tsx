"use client";

import { useEffect } from "react";

import { translate, type TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/hooks/use-i18n";

export function LocalizedMetadata({
  titleKey,
  descriptionKey,
}: {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}) {
  const { locale } = useI18n();

  useEffect(() => {
    const title = translate(locale, titleKey);
    const descriptionText = translate(locale, descriptionKey);
    document.documentElement.lang = locale;
    document.title = title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = descriptionText;
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", descriptionText);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", descriptionText);
  }, [descriptionKey, locale, titleKey]);

  return null;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
}
