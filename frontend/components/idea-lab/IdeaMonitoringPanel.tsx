"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IdeaMonitoringRun } from "@/lib/types/adflow";

export function IdeaMonitoringPanel({
  runs,
  isRunning,
  onRun,
}: {
  runs: IdeaMonitoringRun[];
  isRunning: boolean;
  onRun: (payload: { query?: string; monitoring_type?: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("pain_trend");
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Idea Monitoring</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Monitoring query" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
            {["pain_trend", "competitor_trend", "search_trend", "pricing_trend"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button disabled={isRunning} onClick={() => onRun({ query, monitoring_type: type })}>
            <Bell className="mr-2 h-4 w-4" />
            Run
          </Button>
        </div>
        {runs.length ? runs.slice(0, 4).map((run) => (
          <div className="rounded-md border border-border p-3 text-sm" key={run.id}>
            <div className="font-medium">{run.monitoring_type}</div>
            <div className="mt-1 text-xs text-muted-foreground">Evidence {run.evidence_count} / Alerts {run.alerts.length}</div>
          </div>
        )) : <div className="text-sm text-muted-foreground">No monitoring runs yet.</div>}
      </CardContent>
    </Card>
  );
}
