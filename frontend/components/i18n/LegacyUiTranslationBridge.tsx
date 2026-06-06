"use client";

import { useEffect } from "react";

import legacyJa from "@/locales/legacy-ui.ja.json";
import { useUiStore } from "@/lib/store";

const originals = new WeakMap<Node, string>();
const attributeOriginals = new WeakMap<Element, Map<string, string>>();
const attributes = ["placeholder", "title", "aria-label", "alt"] as const;

export function LegacyUiTranslationBridge() {
  const locale = useUiStore((state) => state.locale);

  useEffect(() => {
    let applying = false;
    const apply = () => {
      if (applying) return;
      applying = true;
      translateTree(document.body, locale);
      applying = false;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...attributes] });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}

function translateTree(root: Node, locale: "en" | "ja") {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) translateTextNode(node, locale);
  const elements = root instanceof Element ? root.querySelectorAll("*") : document.querySelectorAll("*");
  elements.forEach((element) => translateAttributes(element, locale));
}

function translateTextNode(node: Node, locale: "en" | "ja") {
  const current = node.textContent ?? "";
  if (!current.trim()) return;
  if (!originals.has(node)) originals.set(node, current);
  const original = originals.get(node) ?? current;
  const key = original.trim();
  const translated = locale === "ja" ? legacyJa[key as keyof typeof legacyJa] : undefined;
  const next = translated ? original.replace(key, translated) : original;
  if (current !== next) node.textContent = next;
}

function translateAttributes(element: Element, locale: "en" | "ja") {
  let saved = attributeOriginals.get(element);
  if (!saved) {
    saved = new Map();
    attributeOriginals.set(element, saved);
  }
  attributes.forEach((attribute) => {
    const current = element.getAttribute(attribute);
    if (!current) return;
    if (!saved.has(attribute)) saved.set(attribute, current);
    const original = saved.get(attribute) ?? current;
    const next = locale === "ja" ? legacyJa[original as keyof typeof legacyJa] ?? original : original;
    if (current !== next) element.setAttribute(attribute, next);
  });
}
