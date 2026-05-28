"use client";

import { Bell, CheckCircle2, ChevronDown, Menu, RefreshCw, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/lib/store";

const labels: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/campaigns": "Campaigns",
  "/lp": "LP Analysis",
  "/improvements": "Improvements",
  "/prs": "PR Reviews",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const project = useUiStore((state) => state.selectedProject);
  const root = `/${pathname.split("/")[1]}`;
  const current = labels[pathname] ?? labels[root] ?? "Workspace";

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <Button
          aria-label="Open navigation"
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
          size="icon"
          variant="outline"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            Workspace / <span className="text-foreground">{current}</span>
          </div>
          <button className="mt-1 inline-flex max-w-full items-center gap-2 rounded-md text-left text-base font-semibold md:text-lg">
            <span className="truncate">{project}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="hidden w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
          placeholder="Search campaigns, PRs, improvements"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <Badge variant="secondary" className="hidden gap-1.5 md:inline-flex">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Synced 12 min ago
        </Badge>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
