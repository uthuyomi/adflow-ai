"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CheckCircle2, ChevronDown, Menu, RefreshCw, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/use-i18n";
import { useGlobalSearch, useNotifications, useOperationsMutations, useOperationsRealtime } from "@/hooks/use-operations";
import { useProjects } from "@/hooks/use-projects";
import { useUiStore } from "@/lib/store";

const labels: Record<string, string> = {
  "/": "nav.dashboard", "/dashboard": "nav.dashboard", "/projects": "nav.projects", "/ads": "nav.ads",
  "/lps": "nav.lps", "/pairs": "nav.pairs", "/orchestration": "nav.orchestration", "/history": "nav.history",
  "/campaigns": "nav.campaigns", "/lp": "nav.lpAnalysis", "/improvements": "nav.improvements", "/prs": "nav.prs",
  "/codex-tasks": "nav.codexTasks", "/settings": "nav.settings",
};

export function Header() {
  const pathname = usePathname();
  const { t } = useI18n();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const project = useUiStore((state) => state.selectedProject);
  const setSelectedProject = useUiStore((state) => state.setSelectedProject);
  const [query, setQuery] = useState("");
  const [showProjects, setShowProjects] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const projects = useProjects();
  const search = useGlobalSearch(query);
  const notifications = useNotifications();
  const mutations = useOperationsMutations();
  useOperationsRealtime();
  const root = `/${pathname.split("/")[1]}`;
  const current = t(labels[pathname] ?? labels[root] ?? "common.workspace");

  return (
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <Button aria-label="Open navigation" className="lg:hidden" onClick={() => setSidebarOpen(true)} size="icon" variant="outline"><Menu className="h-5 w-5" /></Button>
        <div className="relative min-w-0">
          <div className="text-xs text-muted-foreground">{t("common.workspace")} / <span className="text-foreground">{current}</span></div>
          <button className="mt-1 inline-flex max-w-full items-center gap-2 rounded-md text-left text-base font-semibold md:text-lg" onClick={() => setShowProjects((value) => !value)} type="button">
            <span className="truncate">{project || t("common.noProject")}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          {showProjects ? <div className="absolute mt-2 w-64 rounded-md border bg-card p-2 shadow-lg">
            {(projects.data ?? []).filter((item) => item.status !== "DELETED").map((item) => <button className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" key={item.id} onClick={() => { setSelectedProject(item.name); setShowProjects(false); }} type="button">{item.name}</button>)}
            <Link className="block rounded px-3 py-2 text-sm text-primary hover:bg-accent" href="/projects">Manage projects</Link>
          </div> : null}
        </div>
      </div>

      <div className="relative hidden w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0" placeholder={t("common.searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} />
        {query.trim().length >= 2 ? <div className="absolute left-0 right-0 top-12 max-h-80 overflow-auto rounded-md border bg-card p-2 shadow-xl">
          {search.isLoading ? <p className="p-2 text-sm text-muted-foreground">Searching...</p> : search.data?.length ? search.data.map((item) => <Link className="block rounded px-3 py-2 hover:bg-accent" href={item.target_url} key={`${item.result_type}-${item.result_id}`} onClick={() => setQuery("")}><div className="text-sm font-medium">{item.title}</div><div className="truncate text-xs text-muted-foreground">{item.result_type} · {item.subtitle}</div></Link>) : <p className="p-2 text-sm text-muted-foreground">No results</p>}
        </div> : null}
      </div>

      <div className="relative flex shrink-0 items-center gap-2 md:gap-3">
        <Badge variant="secondary" className="hidden gap-1.5 md:inline-flex"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Realtime</Badge>
        <Button variant="outline" size="sm" onClick={() => { void Promise.all([projects.refetch(), notifications.refetch()]); }}><RefreshCw className="mr-2 h-4 w-4" />{t("common.sync")}</Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative" onClick={() => setShowNotifications((value) => !value)}>
          <Bell className="h-5 w-5" />{(notifications.data ?? []).some((item) => !item.read_at) ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" /> : null}
        </Button>
        {showNotifications ? <div className="absolute right-0 top-12 max-h-96 w-80 overflow-auto rounded-md border bg-card p-2 shadow-xl">
          {(notifications.data ?? []).length ? notifications.data?.map((item) => <div className="flex items-start gap-1 rounded hover:bg-accent" key={item.id}><button className="min-w-0 flex-1 px-3 py-2 text-left" onClick={() => { void mutations.markNotification.mutateAsync({ id: item.id }); if (item.target_url) window.location.href = item.target_url; }} type="button"><div className="flex justify-between gap-2 text-sm font-medium"><span>{item.title}</span>{!item.read_at ? <span className="text-primary">New</span> : null}</div><div className="text-xs text-muted-foreground">{item.body}</div></button><button className="px-2 py-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => void mutations.deleteNotification.mutateAsync(item.id)} type="button">×</button></div>) : <p className="p-3 text-sm text-muted-foreground">No notifications</p>}
        </div> : null}
      </div>
    </header>
  );
}
