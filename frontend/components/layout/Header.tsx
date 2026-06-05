"use client";

import { Bell, CheckCircle2, ChevronDown, Menu, RefreshCw, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth";
import { useI18n } from "@/hooks/use-i18n";
import { useUiStore } from "@/lib/store";

const labels: Record<string, string> = {
  "/": "nav.dashboard",
  "/dashboard": "nav.dashboard",
  "/projects": "nav.projects",
  "/ads": "nav.ads",
  "/lps": "nav.lps",
  "/pairs": "nav.pairs",
  "/orchestration": "nav.orchestration",
  "/history": "nav.history",
  "/campaigns": "nav.campaigns",
  "/lp": "nav.lpAnalysis",
  "/improvements": "nav.improvements",
  "/prs": "nav.prs",
  "/settings": "nav.settings",
};

export function Header() {
  const pathname = usePathname();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const project = useUiStore((state) => state.selectedProject);
  const { locale, setLocale, t } = useI18n();
  const root = `/${pathname.split("/")[1]}`;
  const current = t(labels[pathname] ?? labels[root] ?? "common.workspace");
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t("common.logoutSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.logoutFailed"));
    }
  };

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
            {t("common.workspace")} / <span className="text-foreground">{current}</span>
          </div>
          <button className="mt-1 inline-flex max-w-full items-center gap-2 rounded-md text-left text-base font-semibold md:text-lg">
            <span className="truncate">{project || t("common.noProject")}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="hidden w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
          placeholder={t("common.searchPlaceholder")}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <Badge variant="secondary" className="hidden gap-1.5 md:inline-flex">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          {t("common.synced")}
        </Badge>
        <Button
          aria-label={t("common.language")}
          onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
          size="sm"
          variant="outline"
        >
          {locale === "ja" ? t("common.english") : t("common.japanese")}
        </Button>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("common.sync")}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          {t("common.logout")}
        </Button>
      </div>
    </header>
  );
}
