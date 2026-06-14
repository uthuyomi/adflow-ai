"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { useAuth } from "@/hooks/use-auth";

const protectedRoots = [
  "/dashboard",
  "/ad-optimization",
  "/demand-discovery",
  "/results",
  "/projects",
  "/ads",
  "/lps",
  "/pairs",
  "/orchestration",
  "/history",
  "/campaigns",
  "/lp",
  "/improvements",
  "/prs",
  "/codex-tasks",
  "/outcomes",
  "/settings",
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const isLogin = pathname.startsWith("/login");
  const isProtected = protectedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));

  useEffect(() => {
    if (auth.isLoading) return;
    if (isProtected && !auth.user) {
      router.replace("/login");
    }
    if (isLogin && auth.user) {
      router.replace("/dashboard");
    }
  }, [auth.isLoading, auth.user, isLogin, isProtected, router]);

  if ((isProtected || isLogin) && auth.isLoading) {
    return <PageSkeleton />;
  }

  if (isProtected && !auth.user) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
