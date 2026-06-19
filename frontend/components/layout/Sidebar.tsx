"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LogOut,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  ListChecks,
  Settings,
  TerminalSquare,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { signOut } from "@/lib/auth";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/ad-optimization", labelKey: "nav.adOptimization", icon: Target },
  { href: "/demand-discovery", labelKey: "nav.demandDiscovery", icon: Lightbulb },
  { href: "/results", labelKey: "nav.results", icon: LineChart },
  { href: "/outcomes", labelKey: "nav.outcomes", icon: LineChart },
  { href: "/experiments", labelKey: "nav.experiments", icon: LineChart },
  { href: "/codex-tasks", labelKey: "nav.codexTasks", icon: TerminalSquare },
  { href: "/operations", labelKey: "nav.operations", icon: ListChecks },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const { user } = useAuth();
  const { t } = useI18n();
  const metadata = user?.user_metadata ?? {};
  const name = String(metadata.full_name || metadata.name || user?.email || t("common.account"));
  const avatarUrl = String(metadata.avatar_url || metadata.picture || "");
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t("common.logoutSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.logoutFailed"));
    }
  };

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card">
      <Link
        className="flex h-20 items-center gap-3 border-b border-border px-6 transition-colors hover:bg-accent"
        href="/"
        onClick={() => setSidebarOpen(false)}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-normal">AdFlow AI</div>
          <div className="text-xs text-muted-foreground">{t("sidebar.backToSite")}</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/" || pathname.startsWith("/dashboard")
              : pathname.startsWith(item.href);
          return (
            <Link
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground",
              )}
              href={item.href}
              key={item.href}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
          {avatarUrl ? (
            <img alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" src={avatarUrl} />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild aria-label={t("nav.settings")} size="icon" variant="ghost">
              <Link href="/settings" onClick={() => setSidebarOpen(false)}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button aria-label={t("common.logout")} onClick={handleSignOut} size="icon" variant="ghost">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label={t("sidebar.closeNavigation")}
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
          <div className="relative h-full">
            {sidebar}
            <Button
              aria-label={t("sidebar.closeNavigation")}
              className="absolute right-3 top-3"
              onClick={() => setSidebarOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
