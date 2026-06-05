"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", labelKey: "nav.home" },
  { href: "/features", labelKey: "nav.features" },
  { href: "/how-it-works", labelKey: "nav.howItWorks" },
  { href: "/compare", labelKey: "nav.compare" },
  { href: "/use-cases", labelKey: "nav.useCases" },
  { href: "/pricing", labelKey: "nav.pricing" },
  { href: "/faq", labelKey: "nav.faq" },
] as const;

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  const languageSwitcher = (
    <div className="inline-flex items-center gap-1 text-sm font-medium" aria-label={t("common.language")}>
      <button
        className={cn("rounded px-2 py-1 text-muted-foreground", locale === "en" && "bg-accent text-accent-foreground")}
        onClick={() => setLocale("en")}
        type="button"
      >
        {t("common.english")}
      </button>
      <span className="text-muted-foreground">|</span>
      <button
        className={cn("rounded px-2 py-1 text-muted-foreground", locale === "ja" && "bg-accent text-accent-foreground")}
        onClick={() => setLocale("ja")}
        type="button"
      >
        {t("common.japanese")}
      </button>
    </div>
  );

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link className="flex items-center gap-3" href="/">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <span className="font-semibold">{t("common.brand")}</span>
        </Link>
        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <Button asChild key={item.href} variant="ghost">
              <Link href={item.href}>{t(item.labelKey)}</Link>
            </Button>
          ))}
          {languageSwitcher}
          <Button asChild>
            <Link href="/login">{t("nav.login")}</Link>
          </Button>
        </nav>
        <Button aria-label={t("common.openNavigation")} className="lg:hidden" onClick={() => setOpen(true)} size="icon" variant="outline">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <span className="font-semibold">{t("common.brand")}</span>
            <Button aria-label={t("common.closeNavigation")} onClick={() => setOpen(false)} size="icon" variant="ghost">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="grid gap-2 px-4 py-5">
            {navItems.map((item) => (
              <Link
                className="rounded-md px-3 py-3 text-base font-medium hover:bg-accent"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {t(item.labelKey)}
              </Link>
            ))}
            <div className="px-3 py-3">{languageSwitcher}</div>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
