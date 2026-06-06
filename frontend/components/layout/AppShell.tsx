"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AuthGate } from "@/components/auth/AuthGate";
import { Header } from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserPreferencesSync } from "@/components/settings/UserPreferencesSync";
import { LegacyUiTranslationBridge } from "@/components/i18n/LegacyUiTranslationBridge";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/how-it-works") ||
    pathname.startsWith("/compare") ||
    pathname.startsWith("/why-adflow") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/changelog") ||
    pathname.startsWith("/use-cases") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/billing");

  const bridge = <LegacyUiTranslationBridge />;

  if (isLogin) {
    return (
      <div className="min-h-screen bg-background">
        {bridge}
        <AuthGate>{children}</AuthGate>
      </div>
    );
  }

  if (isPublic) {
    return (
      <div className="min-h-screen bg-background">
        {bridge}
        <PublicHeader />
        <main>{children}</main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {bridge}
      <UserPreferencesSync />
      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </div>
  );
}
