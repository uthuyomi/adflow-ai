"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AuthGate } from "@/components/auth/AuthGate";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");

  if (isLogin) {
    return (
      <div className="min-h-screen bg-background">
        <AuthGate>{children}</AuthGate>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
