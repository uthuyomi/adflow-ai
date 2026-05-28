"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileDiff,
  Gauge,
  LayoutDashboard,
  Megaphone,
  Settings,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/lp", label: "LP Analysis", icon: Gauge },
  { href: "/improvements", label: "Improvements", icon: Sparkles, pending: 6 },
  { href: "/prs", label: "PR Reviews", icon: FileDiff, pending: 3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card">
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-normal">AdFlow AI</div>
          <div className="text-xs text-muted-foreground">Review-first ad ops</div>
        </div>
      </div>

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
              <span className="flex-1">{item.label}</span>
              {item.pending ? <Badge variant="warning">{item.pending}</Badge> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-md border border-border bg-background p-4">
          <div className="text-sm font-semibold">Approval gate</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            PR creation stays manual. No merge or push controls are exposed.
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
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
          <div className="relative h-full">
            {sidebar}
            <Button
              className="absolute right-3 top-3"
              onClick={() => setSidebarOpen(false)}
              size="icon"
              variant="ghost"
            >
              ×
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
